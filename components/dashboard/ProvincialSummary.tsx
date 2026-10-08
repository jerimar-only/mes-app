import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RESOLVED_STATUSES } from "@/lib/recordFilters";

// Rows shown in each card, in the same order as the Excel sheet.
// "match" lists the offices counted in that row (compared after removing "CENRO ").
const OFFICE_ROWS = [
  { label: "Aparri", match: ["APARRI"] },
  { label: "Alcala", match: ["ALCALA"] },
  { label: "Sanchez Mira", match: ["SANCHEZ MIRA"] },
  { label: "Solana", match: ["SOLANA"] },
  { label: "Sub Office", match: ["SUB OFFICE", "TUGUEGARAO"] }, // Tuguegarao is merged here
];

type Row = {
  ids: number[]; // office ids behind this row (empty = Cagayan total)
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
  v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: decimals });

// Link to the full records view with the matching filters
function recordsHref(filter: Record<string, string>, year?: number, officeIds: number[] = []) {
  const qs = new URLSearchParams({ ...filter, pageSize: "100" });
  if (year) qs.set("year", String(year));
  if (officeIds.length) qs.set("office", officeIds.join(","));
  return `/records/full?${qs.toString()}`;
}

export async function ProvincialSummary({ year }: { year?: number }) {
  const [offices, records] = await Promise.all([
    prisma.cenroOffice.findMany(),
    prisma.apprehensionRecord.findMany({
      where: { isDeleted: false, ...(year ? { year } : {}) },
      select: {
        cenroOfficeId: true,
        status: true,
        acpEndorsedToPenro: true,
        acpEndorsedToRo: true,
        items: { select: { volumeBdFt: true } },
        conveyances: { select: { quantity: true } },
        equipment: { select: { type: true, quantity: true } },
      },
    }),
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

  // One row per entry in OFFICE_ROWS (an entry can combine several offices)
  const rowByOfficeId = new Map<number, Row>();
  const rows: Row[] = OFFICE_ROWS.map((o) => {
    const matched = offices.filter((x) => o.match.includes(officeKey(x.name)));
    const row = blank(matched.map((m) => m.id), o.label);
    matched.forEach((m) => rowByOfficeId.set(m.id, row));
    return row;
  });

  const total = blank([], "Cagayan");
  let notShown = 0; // records of offices that are not in the cards at all

  for (const r of records) {
    const row = rowByOfficeId.get(r.cenroOfficeId);
    if (!row) {
      notShown += 1;
      continue;
    }

    const conveyance =
      r.conveyances.reduce((s, c) => s + (c.quantity ?? 0), 0) +
      r.equipment
        .filter((e) => /chain\s*saw/i.test(e.type ?? ""))
        .reduce((s, e) => s + (e.quantity ?? 0), 0);
    const volume = r.items.reduce((s, i) => s + (i.volumeBdFt ?? 0), 0);
    const isResolved = (RESOLVED_STATUSES as readonly string[]).includes(r.status);

    for (const t of [row, total]) {
      t.incidents += 1;
      t.conveyance += conveyance;
      t.volume += volume;
      if (r.acpEndorsedToPenro) t.acpPenro += 1;
      if (r.acpEndorsedToRo) t.acpRo += 1;
      if (!r.acpEndorsedToPenro && !isResolved) t.acpToDo += 1;
      if (isResolved) t.resolved += 1;
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
          Provincial summary — {year ? `CY ${year}` : "All years"}
        </h2>
        <p className="text-[12px] text-[var(--muted)]">Click a number to see the records.</p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-[minmax(200px,1fr)] lg:grid-cols-none">
        {METRICS.map((m) => {
          const max = Math.max(...rows.map((r) => r[m.key]), 0);
          return (
            <div
              key={m.key}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl"
            >
              <div className="flex min-h-[64px] items-center bg-[var(--accent)] px-4 py-3 text-[12px] font-semibold uppercase leading-snug tracking-wide text-white">
                {m.title}
              </div>

              <Link
                href={recordsHref(m.filter, year)}
                title={`Cagayan — ${m.title}: ${fmt(total[m.key], m.decimals)}. Click to view the records.`}
                className="group flex items-baseline justify-between border-b border-white/10 bg-white/10 px-4 py-3 transition hover:bg-black/10 hover:shadow-[inset_4px_0_0_var(--accent)] dark:hover:bg-white/20"
              >
                <span className="text-[14px] font-semibold text-[var(--foreground)]">Cagayan</span>
                <span className="flex items-baseline gap-1.5 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                  <span className="text-[14px] opacity-0 transition group-hover:opacity-100">→</span>
                  {fmt(total[m.key], m.decimals)}
                </span>
              </Link>

              <ul className="divide-y divide-white/10">
                {rows.map((r) => {
                  const pct = max > 0 ? (r[m.key] / max) * 100 : 0;
                  return (
                    <li key={r.label}>
                      <Link
                        href={recordsHref(m.filter, year, r.ids)}
                        title={`${r.label} — ${m.title}: ${fmt(r[m.key], m.decimals)}. Click to view the records.`}
                        className="group block px-4 py-2 text-[14px] transition hover:bg-black/10 hover:shadow-[inset_4px_0_0_var(--accent)] dark:hover:bg-white/15"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[var(--foreground)] group-hover:font-semibold">
                            {r.label}
                          </span>
                          <span className="flex items-center gap-1.5 tabular-nums text-[var(--muted)] group-hover:font-semibold group-hover:text-[var(--foreground)]">
                            <span className="text-[13px] opacity-0 transition group-hover:opacity-100">
                              →
                            </span>
                            {fmt(r[m.key], m.decimals)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-white/10">
                          <div
                            className="h-1.5 rounded-full bg-[var(--accent)] opacity-70 transition group-hover:opacity-100"
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
          Not included: {notShown.toLocaleString()} record{notShown === 1 ? "" : "s"} from offices
          that are not listed above.
        </p>
      )}
    </section>
  );
}