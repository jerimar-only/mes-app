"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { permissions, narrowOfficeIds, type Role } from "@/lib/permissions";
import { getOfficeScope } from "@/lib/officeScope";
import type { Prisma } from "@prisma/client";
import { statusesForFilter } from "@/lib/recordFilters";


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
  if (!session || !permissions.softDeleteRecord(session.role as Role)) {
    return { rows: [], error: "You don't have permission to delete records." };
  }

  const scope = await getOfficeScope();
  if (!scope) return { rows: [], error: "Unauthorized" };

  const year = params.year ? parseInt(params.year, 10) : undefined;
  const office = params.office ? parseInt(params.office, 10) : undefined;
  const q = params.q?.trim() || undefined;
  const statusList = statusesForFilter(params.status);

  // Requested office can only narrow the user's own area
  const officeIds = narrowOfficeIds(
    scope.allowedOfficeIds,
    office && !Number.isNaN(office) ? [office] : null,
  );

  const where: Prisma.ApprehensionRecordWhereInput = {
    isDeleted: false,
    ...(year && !Number.isNaN(year) ? { year } : {}),
    ...(officeIds ? { cenroOfficeId: { in: officeIds } } : {}),
    ...(statusList
      ? statusList.length === 1
        ? { status: statusList[0] as any }
        : { status: { in: statusList as any } }
      : {}),
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
  if (!session) {
    return { deleted: 0, failed: [{ id: 0, message: "You don't have permission to delete records." }] };
  }
  // Prefer DB role so JWT alone cannot escalate
  const userId = Number(session.userId);
  const user =
    Number.isFinite(userId) && userId > 0
      ? await prisma.user.findUnique({ where: { id: userId } })
      : null;
  const role = (user?.role ?? session.role) as Role;
  if (!user?.isActive || !permissions.softDeleteRecord(role)) {
    return { deleted: 0, failed: [{ id: 0, message: "You don't have permission to delete records." }] };
  }

  const uniqueIds = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
  if (!uniqueIds.length) {
    return { deleted: 0, failed: [{ id: 0, message: "No records selected." }] };
  }

  const scope = await getOfficeScope();
  if (!scope) {
    return { deleted: 0, failed: [{ id: 0, message: "Unauthorized" }] };
  }
  const areaWhere = scope.allowedOfficeIds
    ? { cenroOfficeId: { in: scope.allowedOfficeIds } }
    : {};

  const failed: { id: number; message: string }[] = [];
  let deleted = 0;

  // Same behavior as deleteRecord: soft-delete (isDeleted = true)
  for (const id of uniqueIds) {
    try {
      const result = await prisma.apprehensionRecord.updateMany({
        where: { id, isDeleted: false, ...areaWhere },
        data: { isDeleted: true },
      });
      if (result.count === 0) {
        failed.push({ id, message: "Not found, already deleted, or outside your area." });
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
  if (!session || !permissions.softDeleteRecord(session.role as Role)) {
    return { offices: [] as { id: number; name: string }[], years: [] as number[] };
  }

  const scope = await getOfficeScope();
  const allowed = scope?.allowedOfficeIds ?? null;

  const [offices, yearRows] = await Promise.all([
    prisma.cenroOffice.findMany({
      where: allowed ? { id: { in: allowed } } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.apprehensionRecord.findMany({
      where: {
        isDeleted: false,
        ...(allowed ? { cenroOfficeId: { in: allowed } } : {}),
      },
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
