// app/api/records/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);

  // Accept 25 / 50 / 100 / "all" (capped at 500)
  const rawSize = sp.get("pageSize") ?? "25";
  const pageSize =
    rawSize === "all"
      ? 500
      : Math.min(500, Math.max(10, parseInt(rawSize, 10) || 25));

  const year = sp.get("year") ? parseInt(sp.get("year")!, 10) : undefined;
  const office = sp.get("office") ? parseInt(sp.get("office")!, 10) : undefined;
  const status = sp.get("status") || undefined;
  const q = sp.get("q") || undefined;
  const deleted = sp.get("deleted") || ""; // "only" | "all" | ""

  const where: Prisma.ApprehensionRecordWhereInput = {
    ...(deleted === "only"
      ? { isDeleted: true }
      : deleted === "all"
        ? {}
        : { isDeleted: false }),
    ...(year ? { year } : {}),
    ...(office ? { cenroOfficeId: office } : {}),
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

  // Only the columns the table UI needs — avoid shipping long text fields
  const [rows, total] = await Promise.all([
    prisma.apprehensionRecord.findMany({
      where,
      select: {
        id: true,
        year: true,
        placeOfApprehension: true,
        dateOfApprehension: true,
        docketNumber: true,
        status: true,
        createdAt: true,
        cenroOffice: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ createdAt: "desc" }, { year: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.apprehensionRecord.count({ where }),
  ]);

  type ValueRow = {
    id: number;
    productsValue: number;
    conveyancesValue: number;
    equipmentValue: number;
  };

  let valueMap = new Map<number, ValueRow>();

  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);

    const valueRows = await prisma.$queryRaw<ValueRow[]>`
      SELECT
        ar.id,
        COALESCE(
          (SELECT SUM(f."estimatedValue")
           FROM "ForestProductItem" f
           WHERE f."apprehensionRecordId" = ar.id),
          0
        )::float AS "productsValue",
        COALESCE(
          (SELECT SUM(c."estimatedValue")
           FROM "Conveyance" c
           WHERE c."apprehensionRecordId" = ar.id),
          0
        )::float AS "conveyancesValue",
        COALESCE(
          (SELECT SUM(e."estimatedValue")
           FROM "Equipment" e
           WHERE e."apprehensionRecordId" = ar.id),
          0
        )::float AS "equipmentValue"
      FROM "ApprehensionRecord" ar
      WHERE ar.id = ANY(${ids})
    `;

    valueMap = new Map(valueRows.map((v) => [v.id, v]));
  }

  const records = rows.map((r) => {
    const v = valueMap.get(r.id);
    const productsValue = v?.productsValue ?? 0;
    const conveyancesValue = v?.conveyancesValue ?? 0;
    const equipmentValue = v?.equipmentValue ?? 0;
    return {
      ...r,
      productsValue,
      conveyancesValue,
      equipmentValue,
      estimatedValue: productsValue + conveyancesValue + equipmentValue,
    };
  });

  return NextResponse.json({
    records,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
