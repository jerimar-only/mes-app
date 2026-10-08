import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RESOLVED_STATUSES } from "@/lib/recordFilters";
import { Prisma } from "@prisma/client";

const OFFICE_ROWS = [
  { label: "Aparri", match: ["APARRI"] },
  { label: "Alcala", match: ["ALCALA"] },
  { label: "Sanchez Mira", match: ["SANCHEZ MIRA"] },
  { label: "Solana", match: ["SOLANA"] },
  { label: "Sub Office", match: ["SUB OFFICE", "TUGUEGARAO"] },
];

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

type MetricKey = Exclude<keyof Row, "ids" | "label">;

const METRICS: {
  key: MetricKey;
  title: string;
  decimals?: number;
  filter: Record<string, string>;
}[] = [
  { key: "incidents", title: "Total no. of incidents", filter: {} },
  { key: "conveyance", title: "Total apprehended conveyance / chainsaw", filter: { conv: "1" } },
  {
    key: "volume",
    title: "Total volume of apprehended forest products (bd.ft.)",
    decimals: 2,
    filter: {},
  },
  { key: "acpPenro", title: "Total ACP conducted and endorsed to PENRO", filter: { acp: "penro" } },
  { key: "acpRo", title: "Total ACP endorsed to Region", filter: { acp: "ro" } },
  { key: "acpToDo", title: "Total ACP to be conducted", filter: { acp: "todo" } },
  { key: "resolved", title: "Total resolved cases", filter: { resolved: "1" } },
];

const officeKey = (n: string) => n.replace(/^CENRO\s+/i, "").trim().toUpperCase();

const fmt = (v: number, decimals = 0) =>
  v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

function recordsHref(
  filter: Record<string, string>,
  year?: number,
  officeIds: number[] = []
) {
  const qs = new URLSearchParams({ ...filter, pageSize: "100" });
  if (year) qs.set("year", String(year));
  if (officeIds.length) qs.set("office", officeIds.join(","));
  return `/records/full?${qs.toString()}`;
}

export async function ProvincialSummary({ year }: { year?: number }) {
  const yearFilter = year ?? null;

  const [
    offices,
    byOfficeIncidents,
    byOfficeResolved,
    byOfficeAcpPenro,
    byOfficeAcpRo,
    byOfficeAcpToDo,
    volumeRows,
    convRows,
    chainsawRows,
  ] = await Promise.all([
    prisma.cenroOffice.findMany({ select: { id: true, name: true } }),

    // Incidents per office
    prisma.apprehensionRecord.groupBy({
      by: ["cenroOfficeId"],
      where: { isDeleted: false, ...(year ? { year } : {}) },
      _count: { _all: true },
    }),

    // Resolved per office
    prisma.apprehensionRecord.groupBy({
      by: ["cenroOfficeId"],
      where: {
        isDeleted: false,
        ...(year ? { year } : {}),
        status: { in: [...RESOLVED_STATUSES] as any },
      },
      _count: { _all: true },
    }),

    // ACP → PENRO
    prisma.apprehensionRecord.groupBy({
      by: ["cenroOfficeId"],
      where: {
        isDeleted: false,
        ...(year ? { year } : {}),
        acpEndorsedToPenro: { not: null },
      },
      _count: { _all: true },
    }),

    // ACP → RO
    prisma.apprehensionRecord.groupBy({
      by: ["cenroOfficeId"],
      where: {
        isDeleted: false,
        ...(year ? { year } : {}),
        acpEndorsedToRo: { not: null },
      },
      _count: { _all: true },
    }),

    // ACP to-do: no PENRO endorsement yet, and not resolved
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

    // Volume (bd.ft.) per office — one SQL aggregate
    prisma.$queryRaw<{ cenroOfficeId: number; volume: number }[]>`
      SELECT ar."cenroOfficeId",
             COALESCE(SUM(f."volumeBdFt"), 0)::float AS volume
      FROM "ApprehensionRecord" ar
      LEFT JOIN "ForestProductItem" f
        ON f."apprehensionRecordId" = ar.id
      WHERE ar."isDeleted" = false
        AND (${yearFilter}::int IS NULL OR ar.year = ${yearFilter})
      GROUP BY ar."cenroOfficeId"
    `,

    // Conveyance qty per office
    prisma.$queryRaw<{ cenroOfficeId: number; qty: number }[]>`
      SELECT ar."cenroOfficeId",
             COALESCE(SUM(c.quantity), 0)::int AS qty
      FROM "ApprehensionRecord" ar
      LEFT JOIN "Conveyance" c
        ON c."apprehensionRecordId" = ar.id
      WHERE ar."isDeleted" = false
        AND (${yearFilter}::int IS NULL OR ar.year = ${yearFilter})
      GROUP BY ar."cenroOfficeId"
    `,

    // Chainsaw equipment qty per office
    prisma.$queryRaw<{ cenroOfficeId: number; qty: number }[]>`
      SELECT ar."cenroOfficeId",
             COALESCE(SUM(e.quantity), 0)::int AS qty
      FROM "ApprehensionRecord" ar
      LEFT JOIN "Equipment" e
        ON e."apprehensionRecordId" = ar.id
       AND e.type ~* 'chain\\s*saw'
      WHERE ar."isDeleted" = false
        AND (${yearFilter}::int IS NULL OR ar.year = ${yearFilter})
      GROUP BY ar."cenroOfficeId"
    `,
  ]);

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

  const rowByOfficeId = new Map<number, Row>();
  const rows: Row[] = OFFICE_ROWS.map((o) => {
    const matched = offices.filter((x) => o.match.includes(officeKey(x.name)));
    const row = blank(
      matched.map((m) => m.id),
      o.label
    );
    for (const m of matched) {
      rowByOfficeId.set(m.id, row);
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

  const total = blank([], "Cagayan");
  for (const r of rows) {
    total.incidents += r.incidents;
    total.conveyance += r.conveyance;
    total.volume += r.volume;
    total.acpPenro += r.acpPenro;
    total.acpRo += r.acpRo;
    total.acpToDo += r.acpToDo;
    total.resolved += r.resolved;
  }

  // Records from offices not in the cards
  const listedIds = new Set(rows.flatMap((r) => r.ids));
  let notShown = 0;
  for (const [id, count] of incidentsMap) {
    if (!listedIds.has(id)) notShown += count;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
          Provincial summary — {year ? `CY ${year}` : "All years"}
        </h2>
        <p className="text-[12px] text-[var(--muted)]">
          Click a number to see the records.
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-[minmax(200px,1fr)] lg:grid-cols-none">
          {METRICS.map((m) => {
            const max = Math.max(...rows.map((r) => r[m.key]), 0);
            return (
              <div
                key={m.key}
                className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
              >
                <div className="flex min-h-[64px] items-center bg-[var(--accent)] px-4 py-3 text-[12px] font-semibold uppercase leading-snug tracking-wide text-white">
                  {m.title}
                </div>

                <Link
                  href={recordsHref(m.filter, year)}
                  title={`Cagayan — ${m.title}: ${fmt(total[m.key], m.decimals)}`}
                  className="group flex items-baseline justify-between border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 transition hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span className="text-[14px] font-semibold text-[var(--foreground)]">
                    Cagayan
                  </span>
                  <span className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                    {fmt(total[m.key], m.decimals)}
                  </span>
                </Link>

                <ul className="divide-y divide-[var(--border)]">
                  {rows.map((r) => {
                    const pct = max > 0 ? (r[m.key] / max) * 100 : 0;
                    return (
                      <li key={r.label}>
                        <Link
                          href={recordsHref(m.filter, year, r.ids)}
                          title={`${r.label} — ${m.title}: ${fmt(r[m.key], m.decimals)}`}
                          className="group block px-4 py-2 text-[14px] transition hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[var(--foreground)]">{r.label}</span>
                            <span className="tabular-nums text-[var(--muted)] group-hover:text-[var(--foreground)]">
                              {fmt(r[m.key], m.decimals)}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-[var(--border)]">
                            <div
                              className="h-1.5 rounded-full bg-[var(--accent)] opacity-70"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {notShown > 0 && (
        <p className="text-[12px] text-[var(--muted)]">
          Not included: {notShown.toLocaleString()} record
          {notShown === 1 ? "" : "s"} from offices that are not listed above.
        </p>
      )}
    </section>
  );
}