// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { getOfficeScope, forcedOfficeId } from "@/lib/officeScope";
import { narrowOfficeIds } from "@/lib/permissions";
import { statusesForFilter, mergeStatusCounts } from "@/lib/recordFilters";

const OFFICE_ROWS = [
  { label: "Aparri", match: ["APARRI"] },
  { label: "Alcala", match: ["ALCALA"] },
  { label: "Sanchez Mira", match: ["SANCHEZ MIRA"] },
  { label: "Solana", match: ["SOLANA"] },
  { label: "Sub Office", match: ["SUB OFFICE", "TUGUEGARAO"] },
];

const officeKey = (n: string) => n.replace(/^CENRO\s+/i, "").trim().toUpperCase();

/** Escape % and _ for use in ILIKE patterns */
function likePattern(q: string): string {
  return `%${q.replace(/([\\%_])/g, "\\$1")}%`;
}

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

  const officeIds = narrowOfficeIds(
    scope.allowedOfficeIds,
    office ? [office] : null
  );

  // Narrow search to high-value fields (avoids scanning long text columns)
  const searchOr: Prisma.ApprehensionRecordWhereInput[] | undefined = q
    ? [
        { placeOfApprehension: { contains: q, mode: "insensitive" } },
        { sourcePlace: { contains: q, mode: "insensitive" } },
        { claimantRespondent: { contains: q, mode: "insensitive" } },
        { docketNumber: { contains: q, mode: "insensitive" } },
        { caseStatus: { contains: q, mode: "insensitive" } },
        { apprehendingAgency: { contains: q, mode: "insensitive" } },
      ]
    : undefined;

  const statusList = statusesForFilter(status);

  const where: Prisma.ApprehensionRecordWhereInput = {
    isDeleted: false,
    ...(year ? { year } : {}),
    ...(officeIds ? { cenroOfficeId: { in: officeIds } } : {}),
    ...(statusList
      ? statusList.length === 1
        ? { status: statusList[0] as import("@prisma/client").ApprehensionStatus }
        : { status: { in: statusList as import("@prisma/client").ApprehensionStatus[] } }
      : {}),
    ...(searchOr ? { OR: searchOr } : {}),
  };

  // Provincial: one CTE query (was 4 separate scans). Same filters as main cards.
  const provWhere: Prisma.Sql[] = [Prisma.sql`ar."isDeleted" = false`];

  if (year != null) {
    provWhere.push(Prisma.sql`ar.year = ${year}`);
  }
  if (officeIds && officeIds.length > 0) {
    provWhere.push(
      Prisma.sql`ar."cenroOfficeId" IN (${Prisma.join(officeIds)})`
    );
  } else if (officeIds && officeIds.length === 0) {
    provWhere.push(Prisma.sql`FALSE`);
  }
  if (statusList && statusList.length > 0) {
    provWhere.push(
      Prisma.sql`ar.status::text IN (${Prisma.join(statusList)})`
    );
  }
  if (q) {
    const pat = likePattern(q);
    provWhere.push(Prisma.sql`(
      ar."placeOfApprehension" ILIKE ${pat} ESCAPE '\\'
      OR ar."sourcePlace" ILIKE ${pat} ESCAPE '\\'
      OR ar."claimantRespondent" ILIKE ${pat} ESCAPE '\\'
      OR ar."docketNumber" ILIKE ${pat} ESCAPE '\\'
      OR ar."caseStatus" ILIKE ${pat} ESCAPE '\\'
      OR ar."apprehendingAgency" ILIKE ${pat} ESCAPE '\\'
    )`);
  }

  const provWhereSql = Prisma.join(provWhere, " AND ");

  type ProvincialRow = {
    cenroOfficeId: number;
    incidents: number;
    resolved: number;
    acpPenro: number;
    acpRo: number;
    acpToDo: number;
    volume: number;
    conveyanceQty: number;
    chainsawQty: number;
  };

  const [
    offices,
    byYear,
    byOffice,
    byStatus,
    itemTotals,
    provincialRaw,
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
    prisma.forestProductItem.aggregate({
      where: { apprehensionRecord: where },
      _sum: { volumeCuM: true, volumeBdFt: true, estimatedValue: true },
    }),
    prisma.$queryRaw<ProvincialRow[]>`
      WITH base AS (
        SELECT
          ar.id,
          ar."cenroOfficeId",
          ar.status,
          ar."acpEndorsedToPenro",
          ar."acpEndorsedToRo"
        FROM "ApprehensionRecord" ar
        WHERE ${provWhereSql}
      ),
      metrics AS (
        SELECT
          "cenroOfficeId",
          COUNT(*)::int AS incidents,
          COUNT(*) FILTER (
            WHERE status IN ('CONFISCATED', 'DONATED', 'RELEASED')
          )::int AS resolved,
          COUNT(*) FILTER (
            WHERE "acpEndorsedToPenro" IS NOT NULL
          )::int AS "acpPenro",
          COUNT(*) FILTER (
            WHERE "acpEndorsedToRo" IS NOT NULL
          )::int AS "acpRo",
          COUNT(*) FILTER (
            WHERE "acpEndorsedToPenro" IS NULL
              AND status NOT IN ('CONFISCATED', 'DONATED', 'RELEASED')
          )::int AS "acpToDo"
        FROM base
        GROUP BY "cenroOfficeId"
      ),
      volumes AS (
        SELECT
          b."cenroOfficeId",
          COALESCE(SUM(f."volumeBdFt"), 0)::float AS volume
        FROM base b
        LEFT JOIN "ForestProductItem" f ON f."apprehensionRecordId" = b.id
        GROUP BY b."cenroOfficeId"
      ),
      convs AS (
        SELECT
          b."cenroOfficeId",
          COALESCE(SUM(c.quantity), 0)::int AS qty
        FROM base b
        LEFT JOIN "Conveyance" c ON c."apprehensionRecordId" = b.id
        GROUP BY b."cenroOfficeId"
      ),
      saws AS (
        SELECT
          b."cenroOfficeId",
          COALESCE(SUM(e.quantity), 0)::int AS qty
        FROM base b
        LEFT JOIN "Equipment" e
          ON e."apprehensionRecordId" = b.id
          AND (
            e.type ILIKE '%chainsaw%'
            OR e.type ILIKE '%chain saw%'
          )
        GROUP BY b."cenroOfficeId"
      )
      SELECT
        m."cenroOfficeId",
        m.incidents,
        m.resolved,
        m."acpPenro",
        m."acpRo",
        m."acpToDo",
        COALESCE(v.volume, 0)::float AS volume,
        COALESCE(c.qty, 0)::int AS "conveyanceQty",
        COALESCE(s.qty, 0)::int AS "chainsawQty"
      FROM metrics m
      LEFT JOIN volumes v ON v."cenroOfficeId" = m."cenroOfficeId"
      LEFT JOIN convs c ON c."cenroOfficeId" = m."cenroOfficeId"
      LEFT JOIN saws s ON s."cenroOfficeId" = m."cenroOfficeId"
    `,
    prisma.apprehensionRecord.findMany({
      where: {
        isDeleted: false,
        ...(scope.allowedOfficeIds
          ? { cenroOfficeId: { in: scope.allowedOfficeIds } }
          : {}),
      },
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
    }),
  ]);

  const byStatusMerged = mergeStatusCounts(byStatus);
  // Derive total from status groups (drops a separate COUNT query)
  const total = byStatusMerged.reduce((sum, s) => sum + s._count._all, 0);
  const needsReview =
    byStatusMerged.find((s) => s.status === "UNDER_ADJUDICATION")?._count._all ?? 0;

  const officesInArea = scope.allowedOfficeIds
    ? offices.filter((o) => scope.allowedOfficeIds!.includes(o.id))
    : offices;

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

  const byOfficeId = new Map(
    provincialRaw.map((r) => [
      r.cenroOfficeId,
      {
        incidents: r.incidents,
        resolved: r.resolved,
        acpPenro: r.acpPenro,
        acpRo: r.acpRo,
        acpToDo: r.acpToDo,
        volume: Number(r.volume),
        conveyance: Number(r.conveyanceQty) + Number(r.chainsawQty),
      },
    ])
  );

  const provincialRows: Row[] = OFFICE_ROWS.map((o) => {
    const matched = officesInArea.filter((x) => o.match.includes(officeKey(x.name)));
    const row = blank(
      matched.map((m) => m.id),
      o.label
    );
    for (const m of matched) {
      const d = byOfficeId.get(m.id);
      if (!d) continue;
      row.incidents += d.incidents;
      row.resolved += d.resolved;
      row.acpPenro += d.acpPenro;
      row.acpRo += d.acpRo;
      row.acpToDo += d.acpToDo;
      row.volume += d.volume;
      row.conveyance += d.conveyance;
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
  for (const [id, d] of byOfficeId) {
    if (!listedIds.has(id)) notShown += d.incidents;
  }

  const res = NextResponse.json({
    offices: officesInArea,
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
    byStatus: byStatusMerged,
    needsReview,
    provincial: {
      rows: provincialRows,
      total: provincialTotal,
      notShown,
    },
  });

  res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
  return res;
}
