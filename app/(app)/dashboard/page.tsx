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
  itemTotals: { volumeCuM: number; volumeBdFt: number; estimatedValue: number };
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
    <div
      className={`dashboard-page flex flex-col lg:min-h-0 lg:flex-1 ${showProvincial ? "lg:pr-[280px]" : ""}`}
    >
      {error && (
        <p className="mb-4 shrink-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </p>
      )}

      {loading && !data ? (
        <>
          {/* Mobile: normal document scroll. Desktop (lg+): nested panel scroll. */}
          <div className="main-scroll lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
            {/* Mobile: app-main padding. Desktop: horizontal pad (app-main is 0 on lg dashboard). */}
            <div className="space-y-4 pb-6 lg:px-4 lg:pb-5">
              <div className="dash-scope">
                <span className="dash-scope-dot" aria-hidden />
                <p className="text-[13px] font-medium text-[var(--muted)]">{scopeLabel}</p>
              </div>
              <DashboardFilters
                years={[]}
                offices={[]}
                selectedYear={selectedYear}
                selectedOffice={selectedOffice}
                showProvincial={showProvincial}
                onToggleProvincial={() => setShowProvincial((v) => !v)}
              />
              <div className="h-36 animate-pulse rounded-xl bg-[var(--border)]" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--border)]" />
                ))}
              </div>

              {/* Mobile provincial skeleton */}
              {showProvincial && (
                <div className="mt-2 space-y-3 lg:hidden">
                  <div className="space-y-1.5">
                    <div className="h-4 w-48 animate-pulse rounded bg-[var(--border)]" />
                    <div className="h-3 w-36 animate-pulse rounded bg-[var(--border)]" />
                  </div>
                  <ProvincialSummarySkeleton count={4} />
                </div>
              )}
            </div>
          </div>

          {/* Desktop provincial skeleton */}
          {showProvincial && (
            <aside
              className="provincial-rail fixed right-0 z-20 hidden w-[280px] flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-sm lg:flex"
              aria-label="Provincial summary loading"
              aria-busy="true"
            >
              <div className="shrink-0 space-y-1.5 border-b border-[var(--border)] px-3.5 py-3">
                <div className="h-3.5 w-40 animate-pulse rounded bg-[var(--border)]" />
                <div className="h-3 w-32 animate-pulse rounded bg-[var(--border)]" />
              </div>
              <div className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-2.5">
                <ProvincialSummarySkeleton count={5} />
              </div>
            </aside>
          )}
        </>
      ) : data ? (
        <>
          {/* ── Center: main dashboard content ──
              Mobile: document scroll (no overflow lock).
              Desktop lg+: nested panel scroll beside provincial rail. */}
          <div className="main-scroll lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
            {/* Mobile: rely on app-main padding. Desktop: restore horizontal pad (app-main is 0 on lg dashboard). */}
            <div className="space-y-4 pb-6 lg:px-4 lg:pb-5">
            <div className="dash-scope">
              <span className="dash-scope-dot" aria-hidden />
              <p className="text-[13px] font-medium text-[var(--muted)]">{scopeLabel}</p>
            </div>

            <DashboardFilters
              years={data.years}
              offices={data.offices}
              selectedYear={selectedYear}
              selectedOffice={selectedOffice}
              showProvincial={showProvincial}
              onToggleProvincial={() => setShowProvincial((v) => !v)}
            />

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Total records"
                value={data.total.toLocaleString()}
                variant="records"
              />
              <StatCard
                label="Total volume"
                value={`${data.itemTotals.volumeCuM.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })} cu.m. · ${data.itemTotals.volumeBdFt.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })} bd.ft.`}
                variant="volume"
              />
              <StatCard
                label="Estimated value"
                value={`₱${data.itemTotals.estimatedValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
                variant="value"
              />
              <StatCard
                label="Needs review"
                value={data.needsReview.toLocaleString()}
                variant="review"
              />
            </div>

            {/* ── By year ── */}
            <section className="dash-panel p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="dash-panel-title">Apprehensions by year</h2>
                <span className="dash-panel-icon bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
              </div>
              {data.byYear.length === 0 ? (
                <p className="text-[14px] text-[var(--muted)]">
                  No records match these filters.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.byYear.map((y) => (
                    <div key={y.year} className="flex items-center gap-2.5">
                      <span className="w-11 shrink-0 text-[12px] font-medium text-[var(--muted)]">
                        {y.year}
                      </span>
                      <div className="h-6 flex-1 overflow-hidden rounded-full bg-[var(--border)]/80">
                        <div
                          className="h-6 rounded-full bg-gradient-to-r from-[var(--accent)] to-emerald-400/90 transition-all"
                          style={{
                            width: `${(y._count._all / maxYearCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-right text-[12px] font-semibold tabular-nums text-[var(--foreground)]">
                        {y._count._all}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── By office + By status ── */}
            <div className="grid gap-3 sm:grid-cols-2">
              <section className="dash-panel dash-panel-sky">
                <div className="dash-panel-header">
                  <h2 className="dash-panel-title">By CENRO office</h2>
                  <span className="dash-panel-icon bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {data.byOffice.length === 0 && (
                    <li className="px-4 py-3 text-[13px] text-[var(--muted)]">
                      No records match these filters.
                    </li>
                  )}
                  {[...data.byOffice]
                    .sort((a, b) => b._count._all - a._count._all)
                    .map((o) => (
                      <li
                        key={o.cenroOfficeId}
                        className="dash-row flex items-center justify-between px-4 py-2.5 text-[13px]"
                      >
                        <span className="text-[var(--foreground)]">
                          {officeName(o.cenroOfficeId)}
                        </span>
                        <span className="dash-pill">{o._count._all}</span>
                      </li>
                    ))}
                </ul>
              </section>

              <section className="dash-panel dash-panel-amber">
                <div className="dash-panel-header">
                  <h2 className="dash-panel-title">By status</h2>
                  <span className="dash-panel-icon bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </span>
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {data.byStatus.length === 0 && (
                    <li className="px-4 py-3 text-[13px] text-[var(--muted)]">
                      No records match these filters.
                    </li>
                  )}
                  {[...data.byStatus]
                    .sort((a, b) => b._count._all - a._count._all)
                    .map((s) => (
                      <li
                        key={s.status}
                        className="dash-row flex items-center justify-between px-4 py-2.5 text-[13px]"
                      >
                        <span className="text-[var(--foreground)]">
                          {STATUS_LABEL[s.status] ?? s.status}
                        </span>
                        <span className="dash-pill">{s._count._all}</span>
                      </li>
                    ))}
                </ul>
              </section>
            </div>

            {/* ── Mobile: provincial below main content ── */}
            {showProvincial && (
              <div className="mt-6 space-y-3 lg:hidden">
                <div>
                  <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
                    Provincial summary — {selectedYear ? `CY ${selectedYear}` : "All years"}
                  </h2>
                  <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                    Click a number to see the records.
                  </p>
                </div>
                {METRICS.map((m) => {
                  const max = Math.max(
                    ...data.provincial.rows.map((r) => r[m.key]),
                    0
                  );
                  return (
                    <div key={m.key} className="prov-block">
                      <div className="prov-block-head">{m.title}</div>
                      <Link
                        href={recordsHref(m.filter, selectedYear)}
                        className="prov-block-total"
                      >
                        <span className="text-[12px] font-semibold text-[var(--accent)]">
                          Cagayan
                        </span>
                        <span className="break-all text-[17px] font-semibold tabular-nums leading-tight text-[var(--accent)]">
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
                                className="dash-row group block px-3 py-1.5 text-[12px]"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[var(--foreground)]">{r.label}</span>
                                  <span className="tabular-nums text-[var(--muted)] group-hover:text-[var(--foreground)]">
                                    {fmt(r[m.key], m.decimals)}
                                  </span>
                                </div>
                                <div className="dash-bar-track mt-1">
                                  <div
                                    className="dash-bar-fill"
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
            )}
            </div>
          </div>

          {/* ── Fixed right sidebar (desktop) ── */}
          {showProvincial && (
            <aside
              className="provincial-rail fixed right-0 z-20 hidden w-[280px] flex-col border-l border-[var(--border)] shadow-sm lg:flex"
              aria-label="Provincial summary"
            >
              <div className="shrink-0 border-b border-[var(--border)] px-3.5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-[13px] font-semibold leading-snug text-[var(--foreground)]">
                      Provincial summary — {selectedYear ? `CY ${selectedYear}` : "All years"}
                    </h2>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      Click a number to see the records.
                    </p>
                  </div>
                  <span className="dash-panel-icon bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </span>
                </div>
              </div>

              <div className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-2.5">
                {METRICS.map((m) => {
                  const max = Math.max(
                    ...data.provincial.rows.map((r) => r[m.key]),
                    0
                  );
                  return (
                    <div key={m.key} className="prov-block">
                      <div className="prov-block-head">{m.title}</div>

                      <Link
                        href={recordsHref(m.filter, selectedYear)}
                        className="prov-block-total"
                      >
                        <span className="text-[12px] font-semibold text-[var(--accent)]">
                          Cagayan
                        </span>
                        <span className="break-all text-[17px] font-semibold tabular-nums leading-tight text-[var(--accent)]">
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
                                className="dash-row group block px-3 py-1.5 text-[12px]"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[var(--foreground)]">
                                    {r.label}
                                  </span>
                                  <span className="tabular-nums text-[var(--muted)] group-hover:text-[var(--foreground)]">
                                    {fmt(r[m.key], m.decimals)}
                                  </span>
                                </div>
                                <div className="dash-bar-track mt-1">
                                  <div
                                    className="dash-bar-fill"
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

                {data.provincial.notShown > 0 && (
                  <p className="px-1 pb-1 text-[11px] text-[var(--muted)]">
                    Not included: {data.provincial.notShown.toLocaleString()} record
                    {data.provincial.notShown === 1 ? "" : "s"} from offices that are
                    not listed above.
                  </p>
                )}
              </div>
            </aside>
          )}
        </>
      ) : null}
    </div>
  );
}

function ProvincialSummarySkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]"
        >
          <div className="h-9 animate-pulse bg-[var(--border)]" />
          <div className="space-y-1.5 border-b border-[var(--border)] bg-[var(--accent-soft)]/40 px-3 py-2.5">
            <div className="h-3 w-16 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-5 w-24 animate-pulse rounded bg-[var(--border)]" />
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {[1, 2, 3, 4, 5].map((row) => (
              <li key={row} className="space-y-1.5 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-3 w-20 animate-pulse rounded bg-[var(--border)]" />
                  <div className="h-3 w-8 animate-pulse rounded bg-[var(--border)]" />
                </div>
                <div className="h-1 w-full animate-pulse rounded-full bg-[var(--border)]" />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

const STAT_VARIANTS = {
  records: {
    card: "stat-card-records",
    iconWrap: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    value: "text-[var(--foreground)]",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  volume: {
    card: "stat-card-volume",
    iconWrap: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    value: "text-[var(--foreground)]",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  value: {
    card: "stat-card-value",
    iconWrap: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    value: "text-[var(--foreground)]",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  review: {
    card: "stat-card-review",
    iconWrap: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    value: "text-amber-600 dark:text-amber-400",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
} as const;

function StatCard({
  label,
  value,
  variant = "records",
}: {
  label: string;
  value: string;
  variant?: keyof typeof STAT_VARIANTS;
}) {
  const v = STAT_VARIANTS[variant];
  return (
    <div className={`stat-card group relative min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] px-3.5 py-3.5 shadow-sm ${v.card}`}>
      {/* Decorative glow orb */}
      <div className="stat-card-orb pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-90" />
      {/* Soft mesh / grid overlay */}
      <div className="stat-card-mesh pointer-events-none absolute inset-0 opacity-[0.35]" />

      <div className="relative z-[1] flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium tracking-wide text-[var(--muted)]">{label}</p>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${v.iconWrap}`}>
          {v.icon}
        </span>
      </div>
      <p
        className={`relative z-[1] mt-2 break-words font-semibold leading-snug tracking-tight tabular-nums [overflow-wrap:anywhere] text-[clamp(15px,2.5vw,19px)] ${v.value}`}
      >
        {value}
      </p>
    </div>
  );
}