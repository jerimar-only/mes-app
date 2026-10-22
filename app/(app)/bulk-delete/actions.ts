"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export type BulkDeleteRow = {
  id: number;
  year: number;
  placeOfApprehension: string | null;
  dateOfApprehension: string | null;
  docketNumber: string | null;
  status: string;
  cenroOffice: string;
};

export async function searchRecordsForDelete(params: {
  year?: string;
  office?: string;
  q?: string;
  status?: string;
}): Promise<{ rows: BulkDeleteRow[]; error?: string }> {
  const session = await getSession();
  if (!session || !permissions.editSavedRecord(session.role as Role)) {
    return { rows: [], error: "You don't have permission to delete records." };
  }

  const year = params.year ? parseInt(params.year, 10) : undefined;
  const office = params.office ? parseInt(params.office, 10) : undefined;
  const q = params.q?.trim() || undefined;
  const status = params.status || undefined;

  const where: Prisma.ApprehensionRecordWhereInput = {
    isDeleted: false,
    ...(year && !Number.isNaN(year) ? { year } : {}),
    ...(office && !Number.isNaN(office) ? { cenroOfficeId: office } : {}),
    ...(status ? { status: status as any } : {}),
    ...(q
      ? {
          OR: [
            { placeOfApprehension: { contains: q, mode: "insensitive" } },
            { docketNumber: { contains: q, mode: "insensitive" } },
            { remarks: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const rows = await prisma.apprehensionRecord.findMany({
    where,
    select: {
      id: true,
      year: true,
      placeOfApprehension: true,
      dateOfApprehension: true,
      docketNumber: true,
      status: true,
      cenroOffice: { select: { name: true } },
    },
    orderBy: [{ year: "desc" }, { id: "desc" }],
    take: 500,
  });

  return {
    rows: rows.map((r) => ({
      id: r.id,
      year: r.year,
      placeOfApprehension: r.placeOfApprehension,
      dateOfApprehension: r.dateOfApprehension,
      docketNumber: r.docketNumber,
      status: r.status,
      cenroOffice: r.cenroOffice.name,
    })),
  };
}

export async function bulkDeleteRecords(
  ids: number[],
): Promise<{ deleted: number; failed: { id: number; message: string }[] }> {
  const session = await getSession();
  if (!session || !permissions.editSavedRecord(session.role as Role)) {
    return { deleted: 0, failed: [{ id: 0, message: "You don't have permission to delete records." }] };
  }

  const uniqueIds = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
  if (!uniqueIds.length) {
    return { deleted: 0, failed: [{ id: 0, message: "No records selected." }] };
  }

  const failed: { id: number; message: string }[] = [];
  let deleted = 0;

  // Same behavior as deleteRecord: soft-delete (isDeleted = true)
  for (const id of uniqueIds) {
    try {
      const result = await prisma.apprehensionRecord.updateMany({
        where: { id, isDeleted: false },
        data: { isDeleted: true },
      });
      if (result.count === 0) {
        failed.push({ id, message: "Not found or already deleted." });
      } else {
        deleted += 1;
      }
    } catch (err) {
      failed.push({
        id,
        message: err instanceof Error ? err.message : "Delete failed.",
      });
    }
  }

  revalidatePath("/records");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/bulk-delete");

  return { deleted, failed };
}

export async function getBulkDeleteFilters() {
  const session = await getSession();
  if (!session || !permissions.editSavedRecord(session.role as Role)) {
    return { offices: [] as { id: number; name: string }[], years: [] as number[] };
  }

  const [offices, yearRows] = await Promise.all([
    prisma.cenroOffice.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.apprehensionRecord.findMany({
      where: { isDeleted: false },
      distinct: ["year"],
      select: { year: true },
      orderBy: { year: "desc" },
    }),
  ]);

  return {
    offices,
    years: yearRows.map((r) => r.year),
  };
}
