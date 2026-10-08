// app/dashboard/page.tsx  (or DashboardClient.tsx if you prefer a thin server wrapper)
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardFilters from "./DashboardFilters";

const STATUS_LABEL: Record<string, string> = {
  FOR_RESOLUTION: "For resolution",
  UNDER_ADJUDICATION: "Under adjudication",
  CONFISCATED: "Confiscated",
  DONATED: "Donated",
  RELEASED: "Released",
  UNKNOWN: "Needs review",
};

type DashboardData = {
  offices: { id: number; name: string }[];
  years: number[];
  total: number;
  itemTotals: { volumeCuM: number; estimatedValue: number };
  byYear: { year: number; _count: { _all: number } }[];
  byOffice: { cenroOfficeId: number; _count: { _all: number } }[];
  byStatus: { status: string; _count: { _all: number } }[];
  needsReview: number;
  provincial: {
    rows: {
      ids: number[];
      label: string;
      incidents: number;
      conveyance: number;
      volume: number;
      acpPenro: number;
      acpRo: number;
      acpToDo: number;
      resolved: number;
    }[];
    total: {
      incidents: number;
      conveyance: number;
      volume: number;
      acpPenro: number;
      acpRo: number;
      acpToDo: number;
      resolved: number;
    };
    notShown: number;
  };
};

const METRICS = [
  { key: "incidents" as const, title: "Total no. of incidents", filter: {}, decimals: 0 },
  { key: "conveyance" as const, title: "Total apprehended conveyance / chainsaw", filter: { conv: "1" }, decimals: 0 },
  { key: "volume" as const, title: "Total volume of apprehended forest products (bd.ft.)", filter: {}, decimals: 2 },
  { key: "acpPenro" as const, title: "Total ACP conducted and endorsed to PENRO", filter: { acp: "penro" }, decimals: 0 },
  { key: "acpRo" as const, title: "Total ACP endorsed to Region", filter: { acp: "ro" }, decimals: 0 },
  { key: "acpToDo" as const, title: "Total ACP to be conducted", filter: { acp: "todo" }, decimals: 0 },
  { key: "resolved" as const, title: "Total resolved cases", filter: { resolved: "1" }, decimals: 0 },
];

const fmt = (v: number, decimals = 0) =>
  v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

function recordsHref(
  filter: Record<string, string | undefined>,
  year?: number,
  officeIds: number[] = []
) {
  const qs = new URLSearchParams();
  // only set keys that actually have a value
  Object.entries(filter).forEach(([k, v]) => {
    if (v != null && v !== "") qs.set(k, v);
  });
  qs.set("pageSize", "100");
  if (year) qs.set("year", String(year));
  if (officeIds.length) qs.set("office", officeIds.join(","));
  return `/records/full?${qs.toString()}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedYear = searchParams.get("year")
    ? parseInt(searchParams.get("year")!, 10) || undefined
    : undefined;
  const selectedOffice = searchParams.get("office")
    ? parseInt(searchParams.get("office")!, 10) || undefined
    : undefined;

  const [showProvincial, setShowProvincial] = useState(true);    
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (selectedYear) qs.set("year", String(selectedYear));
    if (selectedOffice) qs.set("office", String(selectedOffice));

    try {
      const res = await fetch(`/api/dashboard?${qs}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      setError(e.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedOffice]);

  useEffect(() => {
    load();
  }, [load]);

  const officeName = (id: number) =>
    data?.offices.find((o) => o.id === id)?.name ?? "Unknown";

  const maxYearCount = data
    ? Math.max(...data.byYear.map((y) => y._count._all), 1)
    : 1;

  const scopeLabel = [
    selectedYear ? String(selectedYear) : "All years",
    selectedOffice ? officeName(selectedOffice) : "All CENRO",
  ].join(" · ");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Dashboard
        </h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          Live totals from recorded apprehensions — {scopeLabel}
        </p>
      </div>

      {/* Filters stay the same */}
      <DashboardFilters
        years={data?.years ?? []}
        offices={data?.offices ?? []}
        selectedYear={selectedYear}
        selectedOffice={selectedOffice}
        showProvincial={showProvincial}
        onToggleProvincial={() => setShowProvincial((v) => !v)}
      />

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </p>
      )}

      {loading && !data ? (
        <div className="space-y-6">
          <div className="h-48 animate-pulse rounded-2xl bg-[var(--border)]" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-[var(--border)]" />
            ))}
          </div>
        </div>
      ) : data ? (
        <>
        {showProvincial && (
         
          <section className="space-y-4">
             {/* ── Provincial Summary ── */}
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                Provincial summary — {selectedYear ? `CY ${selectedYear}` : "All years"}
              </h2>
              <p className="text-[12px] text-[var(--muted)]">
                Click a number to see the records.
              </p>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-[minmax(200px,1fr)] lg:grid-cols-none">
                {METRICS.map((m) => {
                  const max = Math.max(
                    ...data.provincial.rows.map((r) => r[m.key]),
                    0
                  );
                  return (
                    <div
                      key={m.key}
                      className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
                    >
                      <div className="flex min-h-[64px] items-center bg-[var(--accent)] px-4 py-3 text-[12px] font-semibold uppercase leading-snug tracking-wide text-white">
                        {m.title}
                      </div>

                      <Link
                        href={recordsHref(m.filter, selectedYear)}
                        className="group flex items-baseline justify-between border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 transition hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <span className="text-[14px] font-semibold text-[var(--foreground)]">
                          Cagayan
                        </span>
                        <span className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                          {fmt(data.provincial.total[m.key], m.decimals)}
                        </span>
                      </Link>

                      <ul className="divide-y divide-[var(--border)]">
                        {data.provincial.rows.map((r) => {
                          const pct = max > 0 ? (r[m.key] / max) * 100 : 0;
                          return (
                            <li key={r.label}>
                              <Link
                                href={recordsHref(m.filter, selectedYear, r.ids)}
                                className="group block px-4 py-2 text-[14px] transition hover:bg-black/5 dark:hover:bg-white/10"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[var(--foreground)]">
                                    {r.label}
                                  </span>
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

            {data.provincial.notShown > 0 && (
              <p className="text-[12px] text-[var(--muted)]">
                Not included: {data.provincial.notShown.toLocaleString()} record
                {data.provincial.notShown === 1 ? "" : "s"} from offices that are
                not listed above.
              </p>
            )}
          </section>
          )}
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total records" value={data.total.toLocaleString()} />
            <StatCard
              label="Total volume"
              value={`${data.itemTotals.volumeCuM.toLocaleString(undefined, {
                maximumFractionDigits: 1,
              })} cu.m.`}
            />
            <StatCard
              label="Estimated value"
              value={`₱${data.itemTotals.estimatedValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            />
            <StatCard
              label="Needs review"
              value={data.needsReview.toLocaleString()}
              accent
            />
          </div>

          {/* ── By year ── */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <h2 className="mb-5 text-[15px] font-semibold text-[var(--foreground)]">
              Apprehensions by year
            </h2>
            {data.byYear.length === 0 ? (
              <p className="text-[14px] text-[var(--muted)]">
                No records match these filters.
              </p>
            ) : (
              <div className="space-y-3">
                {data.byYear.map((y) => (
                  <div key={y.year} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 text-[13px] font-medium text-[var(--muted)]">
                      {y.year}
                    </span>
                    <div className="h-7 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className="h-7 rounded-full bg-[var(--accent)] transition-all"
                        style={{
                          width: `${(y._count._all / maxYearCount) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-[13px] font-medium text-[var(--foreground)]">
                      {y._count._all}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── By office + By status ── */}
          <div className="grid gap-6 sm:grid-cols-2">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                  By CENRO office
                </h2>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {data.byOffice.length === 0 && (
                  <li className="px-5 py-4 text-[14px] text-[var(--muted)]">
                    No records match these filters.
                  </li>
                )}
                {[...data.byOffice]
                  .sort((a, b) => b._count._all - a._count._all)
                  .map((o) => (
                    <li
                      key={o.cenroOfficeId}
                      className="flex items-center justify-between px-5 py-3 text-[14px]"
                    >
                      <span className="text-[var(--foreground)]">
                        {officeName(o.cenroOfficeId)}
                      </span>
                      <span className="rounded-full bg-[var(--background)] px-2.5 py-0.5 text-[13px] font-medium text-[var(--muted)]">
                        {o._count._all}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                  By status
                </h2>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {data.byStatus.length === 0 && (
                  <li className="px-5 py-4 text-[14px] text-[var(--muted)]">
                    No records match these filters.
                  </li>
                )}
                {[...data.byStatus]
                  .sort((a, b) => b._count._all - a._count._all)
                  .map((s) => (
                    <li
                      key={s.status}
                      className="flex items-center justify-between px-5 py-3 text-[14px]"
                    >
                      <span className="text-[var(--foreground)]">
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                      <span className="rounded-full bg-[var(--background)] px-2.5 py-0.5 text-[13px] font-medium text-[var(--muted)]">
                        {s._count._all}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <p className="text-[13px] font-medium text-[var(--muted)]">{label}</p>
      <p
        className={`mt-1.5 text-xl font-semibold tracking-tight ${
          accent ? "text-amber-500 dark:text-amber-400" : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}