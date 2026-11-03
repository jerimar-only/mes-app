// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { getOfficeScope, forcedOfficeId } from "@/lib/officeScope";

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

  const scope = await getOfficeScope();
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const year = sp.get("year") ? parseInt(sp.get("year")!, 10) || undefined : undefined;
  const office = forcedOfficeId(scope, sp.get("office"));
  const status = sp.get("status")?.trim() || undefined;
  const q = sp.get("q")?.trim() || undefined;

  const searchOr: Prisma.ApprehensionRecordWhereInput[] | undefined = q
    ? [
        { placeOfApprehension: { contains: q, mode: "insensitive" } },
        { sourcePlace: { contains: q, mode: "insensitive" } },
        { claimantRespondent: { contains: q, mode: "insensitive" } },
        { apprehendingAgency: { contains: q, mode: "insensitive" } },
        { circumstances: { contains: q, mode: "insensitive" } },
        { docketNumber: { contains: q, mode: "insensitive" } },
        { remarks: { contains: q, mode: "insensitive" } },
        { otherRemarks: { contains: q, mode: "insensitive" } },
        { caseStatus: { contains: q, mode: "insensitive" } },
      ]
    : undefined;

  const where: Prisma.ApprehensionRecordWhereInput = {
    isDeleted: false,
    ...(year ? { year } : {}),
    ...(office ? { cenroOfficeId: office } : {}),
    ...(status
      ? { status: status as import("@prisma/client").ApprehensionStatus }
      : {}),
    ...(searchOr ? { OR: searchOr } : {}),
  };

  const yearFilter = year ?? null;
  const officeFilter = office ?? null;

  const [
    offices,
    byYear,
    byOffice,
    byStatus,
    total,
    itemTotals,
    provincialCounts,
    volumeRows,
    convRows,
    chainsawRows,
    allYears,
  ] = await Promise.all([
    prisma.cenroOffice.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    // Same filters as the rest of the dashboard (including year) so the chart
    // matches Total records — e.g. year=2025 shows only 2025.
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
      _sum: { volumeCuM: true, volumeBdFt: true, estimatedValue: true },
    }),

    // All 5 provincial count metrics in one scan.
    // Statuses hardcoded (same as RESOLVED_STATUSES) to avoid Prisma array-binding issues.
    prisma.$queryRaw<
      {
        cenroOfficeId: number;
        incidents: number;
        resolved: number;
        acpPenro: number;
        acpRo: number;
        acpToDo: number;
      }[]
    >`
      SELECT
        ar."cenroOfficeId",
        COUNT(*)::int AS incidents,
        COUNT(*) FILTER (
          WHERE ar.status IN ('CONFISCATED', 'DONATED', 'RELEASED')
        )::int AS resolved,
        COUNT(*) FILTER (
          WHERE ar."acpEndorsedToPenro" IS NOT NULL
        )::int AS "acpPenro",
        COUNT(*) FILTER (
          WHERE ar."acpEndorsedToRo" IS NOT NULL
        )::int AS "acpRo",
        COUNT(*) FILTER (
          WHERE ar."acpEndorsedToPenro" IS NULL
            AND ar.status NOT IN ('CONFISCATED', 'DONATED', 'RELEASED')
        )::int AS "acpToDo"
      FROM "ApprehensionRecord" ar
      WHERE ar."isDeleted" = false
        AND (${yearFilter}::int IS NULL OR ar.year = ${yearFilter})
        AND (${officeFilter}::int IS NULL OR ar."cenroOfficeId" = ${officeFilter})
      GROUP BY ar."cenroOfficeId"
    `,

    prisma.$queryRaw<{ cenroOfficeId: number; volume: number }[]>`
      SELECT ar."cenroOfficeId",
             COALESCE(SUM(f."volumeBdFt"), 0)::float AS volume
      FROM "ApprehensionRecord" ar
      LEFT JOIN "ForestProductItem" f ON f."apprehensionRecordId" = ar.id
      WHERE ar."isDeleted" = false
        AND (${yearFilter}::int IS NULL OR ar.year = ${yearFilter})
        AND (${officeFilter}::int IS NULL OR ar."cenroOfficeId" = ${officeFilter})
      GROUP BY ar."cenroOfficeId"
    `,
    prisma.$queryRaw<{ cenroOfficeId: number; qty: number }[]>`
      SELECT ar."cenroOfficeId",
             COALESCE(SUM(c.quantity), 0)::int AS qty
      FROM "ApprehensionRecord" ar
      LEFT JOIN "Conveyance" c ON c."apprehensionRecordId" = ar.id
      WHERE ar."isDeleted" = false
        AND (${yearFilter}::int IS NULL OR ar.year = ${yearFilter})
        AND (${officeFilter}::int IS NULL OR ar."cenroOfficeId" = ${officeFilter})
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
        AND (${officeFilter}::int IS NULL OR ar."cenroOfficeId" = ${officeFilter})
      GROUP BY ar."cenroOfficeId"
    `,
    prisma.apprehensionRecord.findMany({
      where: { isDeleted: false },
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
    }),
  ]);

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
    ids,
    label,
    incidents: 0,
    conveyance: 0,
    volume: 0,
    acpPenro: 0,
    acpRo: 0,
    acpToDo: 0,
    resolved: 0,
  });

  const incidentsMap = new Map(provincialCounts.map((r) => [r.cenroOfficeId, r.incidents]));
  const resolvedMap = new Map(provincialCounts.map((r) => [r.cenroOfficeId, r.resolved]));
  const acpPenroMap = new Map(provincialCounts.map((r) => [r.cenroOfficeId, r.acpPenro]));
  const acpRoMap = new Map(provincialCounts.map((r) => [r.cenroOfficeId, r.acpRo]));
  const acpToDoMap = new Map(provincialCounts.map((r) => [r.cenroOfficeId, r.acpToDo]));
  const volumeMap = new Map(volumeRows.map((r) => [r.cenroOfficeId, Number(r.volume)]));
  const convMap = new Map(convRows.map((r) => [r.cenroOfficeId, Number(r.qty)]));
  const chainsawMap = new Map(chainsawRows.map((r) => [r.cenroOfficeId, Number(r.qty)]));

  const provincialRows: Row[] = OFFICE_ROWS.map((o) => {
    const matched = offices.filter((x) => o.match.includes(officeKey(x.name)));
    const row = blank(
      matched.map((m) => m.id),
      o.label
    );
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

  // CENRO: only expose their office in the filter list
  const officesOut =
    scope.isCenro && scope.officeId
      ? offices.filter((o) => o.id === scope.officeId)
      : offices;

  return NextResponse.json({
    offices: officesOut,
    years: allYears.map((r) => r.year),
    scope: {
      isCenro: scope.isCenro,
      officeId: scope.officeId,
      officeName: scope.officeName,
    },

    total,
    itemTotals: {
      volumeCuM: itemTotals._sum.volumeCuM ?? 0,
      volumeBdFt: itemTotals._sum.volumeBdFt ?? 0,
      estimatedValue: itemTotals._sum.estimatedValue ?? 0,
    },
    byYear,
    byOffice,
    byStatus,
    needsReview: byStatus.find((s) => s.status === "UNKNOWN")?._count._all ?? 0,

    provincial: {
      rows: provincialRows,
      total: provincialTotal,
      notShown,
    },
  });
}
