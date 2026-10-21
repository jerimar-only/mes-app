// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { RESOLVED_STATUSES } from "@/lib/recordFilters";
import { getSession } from "@/lib/auth"; // keep auth if you need it

const OFFICE_ROWS = [
  { label: "Aparri", match: ["APARRI"] },
  { label: "Alcala", match: ["ALCALA"] },
  { label: "Sanchez Mira", match: ["SANCHEZ MIRA"] },
  { label: "Solana", match: ["SOLANA"] },
  { label: "Sub Office", match: ["SUB OFFICE", "TUGUEGARAO"] },
];

const officeKey = (n: string) => n.replace(/^CENRO\s+/i, "").trim().toUpperCase();

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const year = sp.get("year") ? parseInt(sp.get("year")!, 10) || undefined : undefined;
  const office = sp.get("office") ? parseInt(sp.get("office")!, 10) || undefined : undefined;

  const where: Prisma.ApprehensionRecordWhereInput = {
    isDeleted: false,
    ...(year ? { year } : {}),
    ...(office ? { cenroOfficeId: office } : {}),
  };

  const yearFilter = year ?? null;

  const [
    offices,
    byYear,
    byOffice,
    byStatus,
    total,
    itemTotals,
    // ProvincialSummary queries
    byOfficeIncidents,
    byOfficeResolved,
    byOfficeAcpPenro,
    byOfficeAcpRo,
    byOfficeAcpToDo,
    volumeRows,
    convRows,
    chainsawRows,
    // Years list (unfiltered)
    allYears,
  ] = await Promise.all([
    prisma.cenroOffice.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.apprehensionRecord.groupBy({
      by: ["year"],
      where,
      _count: { _all: true },
      orderBy: { year: "asc" },
    }),
    prisma.apprehensionRecord.groupBy({
      by: ["cenroOfficeId"],
      where,
      _count: { _all: true },
    }),
    prisma.apprehensionRecord.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.apprehensionRecord.count({ where }),
    prisma.forestProductItem.aggregate({
      where: { apprehensionRecord: where },
      _sum: { volumeCuM: true, estimatedValue: true },
    }),

    // --- ProvincialSummary ---
    prisma.apprehensionRecord.groupBy({
      by: ["cenroOfficeId"],
      where: { isDeleted: false, ...(year ? { year } : {}) },
      _count: { _all: true },
    }),
    prisma.apprehensionRecord.groupBy({
      by: ["cenroOfficeId"],
      where: {
        isDeleted: false,
        ...(year ? { year } : {}),
        status: { in: [...RESOLVED_STATUSES] as any },
      },
      _count: { _all: true },
    }),
    prisma.apprehensionRecord.groupBy({
      by: ["cenroOfficeId"],
      where: {
        isDeleted: false,
        ...(year ? { year } : {}),
        acpEndorsedToPenro: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.apprehensionRecord.groupBy({
      by: ["cenroOfficeId"],
      where: {
        isDeleted: false,
        ...(year ? { year } : {}),
        acpEndorsedToRo: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.apprehensionRecord.groupBy({
      by: ["cenroOfficeId"],
      where: {
        isDeleted: false,
        ...(year ? { year } : {}),
        acpEndorsedToPenro: null,
        status: { notIn: [...RESOLVED_STATUSES] as any },
      },
      _count: { _all: true },
    }),
    prisma.$queryRaw<{ cenroOfficeId: number; volume: number }[]>`
      SELECT ar."cenroOfficeId",
             COALESCE(SUM(f."volumeBdFt"), 0)::float AS volume
      FROM "ApprehensionRecord" ar
      LEFT JOIN "ForestProductItem" f ON f."apprehensionRecordId" = ar.id
      WHERE ar."isDeleted" = false
        AND (${yearFilter}::int IS NULL OR ar.year = ${yearFilter})
      GROUP BY ar."cenroOfficeId"
    `,
    prisma.$queryRaw<{ cenroOfficeId: number; qty: number }[]>`
      SELECT ar."cenroOfficeId",
             COALESCE(SUM(c.quantity), 0)::int AS qty
      FROM "ApprehensionRecord" ar
      LEFT JOIN "Conveyance" c ON c."apprehensionRecordId" = ar.id
      WHERE ar."isDeleted" = false
        AND (${yearFilter}::int IS NULL OR ar.year = ${yearFilter})
      GROUP BY ar."cenroOfficeId"
    `,
    prisma.$queryRaw<{ cenroOfficeId: number; qty: number }[]>`
      SELECT ar."cenroOfficeId",
             COALESCE(SUM(e.quantity), 0)::int AS qty
      FROM "ApprehensionRecord" ar
      LEFT JOIN "Equipment" e
        ON e."apprehensionRecordId" = ar.id AND e.type ~* 'chain\\s*saw'
      WHERE ar."isDeleted" = false
        AND (${yearFilter}::int IS NULL OR ar.year = ${yearFilter})
      GROUP BY ar."cenroOfficeId"
    `,
    prisma.apprehensionRecord.findMany({
      where: { isDeleted: false },
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
    }),
  ]);

  // --- Build ProvincialSummary rows (same logic as before) ---
  type Row = {
    ids: number[];
    label: string;
    incidents: number;
    conveyance: number;
    volume: number;
    acpPenro: number;
    acpRo: number;
    acpToDo: number;
    resolved: number;
  };

  const blank = (ids: number[], label: string): Row => ({
    ids, label, incidents: 0, conveyance: 0, volume: 0,
    acpPenro: 0, acpRo: 0, acpToDo: 0, resolved: 0,
  });

  const countMap = (rows: { cenroOfficeId: number; _count: { _all: number } }[]) =>
    new Map(rows.map((r) => [r.cenroOfficeId, r._count._all]));

  const incidentsMap = countMap(byOfficeIncidents);
  const resolvedMap = countMap(byOfficeResolved);
  const acpPenroMap = countMap(byOfficeAcpPenro);
  const acpRoMap = countMap(byOfficeAcpRo);
  const acpToDoMap = countMap(byOfficeAcpToDo);
  const volumeMap = new Map(volumeRows.map((r) => [r.cenroOfficeId, Number(r.volume)]));
  const convMap = new Map(convRows.map((r) => [r.cenroOfficeId, Number(r.qty)]));
  const chainsawMap = new Map(chainsawRows.map((r) => [r.cenroOfficeId, Number(r.qty)]));

  const provincialRows: Row[] = OFFICE_ROWS.map((o) => {
    const matched = offices.filter((x) => o.match.includes(officeKey(x.name)));
    const row = blank(matched.map((m) => m.id), o.label);
    for (const m of matched) {
      row.incidents += incidentsMap.get(m.id) ?? 0;
      row.resolved += resolvedMap.get(m.id) ?? 0;
      row.acpPenro += acpPenroMap.get(m.id) ?? 0;
      row.acpRo += acpRoMap.get(m.id) ?? 0;
      row.acpToDo += acpToDoMap.get(m.id) ?? 0;
      row.volume += volumeMap.get(m.id) ?? 0;
      row.conveyance += (convMap.get(m.id) ?? 0) + (chainsawMap.get(m.id) ?? 0);
    }
    return row;
  });

  const provincialTotal = blank([], "Cagayan");
  for (const r of provincialRows) {
    provincialTotal.incidents += r.incidents;
    provincialTotal.conveyance += r.conveyance;
    provincialTotal.volume += r.volume;
    provincialTotal.acpPenro += r.acpPenro;
    provincialTotal.acpRo += r.acpRo;
    provincialTotal.acpToDo += r.acpToDo;
    provincialTotal.resolved += r.resolved;
  }

  const listedIds = new Set(provincialRows.flatMap((r) => r.ids));
  let notShown = 0;
  for (const [id, count] of incidentsMap) {
    if (!listedIds.has(id)) notShown += count;
  }

  return NextResponse.json({
    // filter options
    offices,
    years: allYears.map((r) => r.year),

    // main stats
    total,
    itemTotals: {
      volumeCuM: itemTotals._sum.volumeCuM ?? 0,
      estimatedValue: itemTotals._sum.estimatedValue ?? 0,
    },
    byYear,
    byOffice,
    byStatus,
    needsReview: byStatus.find((s) => s.status === "UNKNOWN")?._count._all ?? 0,

    // provincial summary
    provincial: {
      rows: provincialRows,
      total: provincialTotal,
      notShown,
    },
  });
}