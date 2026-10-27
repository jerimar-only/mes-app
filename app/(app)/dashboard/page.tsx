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
              <p className="text-[13px] text-[var(--muted)]">{scopeLabel}</p>
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
            <p className="text-[13px] text-[var(--muted)]">{scopeLabel}</p>

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
              <StatCard label="Total records" value={data.total.toLocaleString()} />
              <StatCard
                label="Total volume"
                value={`${data.itemTotals.volumeCuM.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })} cu.m. · ${data.itemTotals.volumeBdFt.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })} bd.ft.`}
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
            <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
                Apprehensions by year
              </h2>
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
                      <div className="h-6 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="h-6 rounded-full bg-[var(--accent)] transition-all"
                          style={{
                            width: `${(y._count._all / maxYearCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-right text-[12px] font-medium text-[var(--foreground)]">
                        {y._count._all}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── By office + By status ── */}
            <div className="grid gap-3 sm:grid-cols-2">
              <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
                    By CENRO office
                  </h2>
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
                        className="flex items-center justify-between px-4 py-2.5 text-[13px]"
                      >
                        <span className="text-[var(--foreground)]">
                          {officeName(o.cenroOfficeId)}
                        </span>
                        <span className="rounded-full bg-[var(--background)] px-2 py-0.5 text-[12px] font-medium text-[var(--muted)]">
                          {o._count._all}
                        </span>
                      </li>
                    ))}
                </ul>
              </section>

              <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
                    By status
                  </h2>
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
                        className="flex items-center justify-between px-4 py-2.5 text-[13px]"
                      >
                        <span className="text-[var(--foreground)]">
                          {STATUS_LABEL[s.status] ?? s.status}
                        </span>
                        <span className="rounded-full bg-[var(--background)] px-2 py-0.5 text-[12px] font-medium text-[var(--muted)]">
                          {s._count._all}
                        </span>
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
                    <div
                      key={m.key}
                      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
                    >
                      <div className="flex min-h-[40px] items-center bg-[var(--accent)] px-3 py-2 text-[10px] font-semibold uppercase leading-snug tracking-wide text-white">
                        {m.title}
                      </div>
                      <Link
                        href={recordsHref(m.filter, selectedYear)}
                        className="group flex flex-col gap-0.5 border-b border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 transition hover:bg-[var(--accent)]/15 dark:hover:bg-[var(--accent)]/25"
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
                                className="group block px-3 py-1.5 text-[12px] transition hover:bg-black/5 dark:hover:bg-white/10"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[var(--foreground)]">{r.label}</span>
                                  <span className="tabular-nums text-[var(--muted)] group-hover:text-[var(--foreground)]">
                                    {fmt(r[m.key], m.decimals)}
                                  </span>
                                </div>
                                <div className="mt-1 h-1 rounded-full bg-[var(--border)]">
                                  <div
                                    className="h-1 rounded-full bg-[var(--accent)] opacity-80"
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
              className="provincial-rail fixed right-0 z-20 hidden w-[280px] flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-sm lg:flex"
              aria-label="Provincial summary"
            >
              <div className="shrink-0 border-b border-[var(--border)] px-3.5 py-3">
                <h2 className="text-[13px] font-semibold leading-snug text-[var(--foreground)]">
                  Provincial summary — {selectedYear ? `CY ${selectedYear}` : "All years"}
                </h2>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  Click a number to see the records.
                </p>
              </div>

              <div className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-2.5">
                {METRICS.map((m) => {
                  const max = Math.max(
                    ...data.provincial.rows.map((r) => r[m.key]),
                    0
                  );
                  return (
                    <div
                      key={m.key}
                      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]"
                    >
                      <div className="flex min-h-[40px] items-center bg-[var(--accent)] px-3 py-2 text-[10px] font-semibold uppercase leading-snug tracking-wide text-white">
                        {m.title}
                      </div>

                      <Link
                        href={recordsHref(m.filter, selectedYear)}
                        className="group flex flex-col gap-0.5 border-b border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 transition hover:bg-[var(--accent)]/15 dark:hover:bg-[var(--accent)]/25"
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
                                className="group block px-3 py-1.5 text-[12px] transition hover:bg-black/5 dark:hover:bg-white/10"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[var(--foreground)]">
                                    {r.label}
                                  </span>
                                  <span className="tabular-nums text-[var(--muted)] group-hover:text-[var(--foreground)]">
                                    {fmt(r[m.key], m.decimals)}
                                  </span>
                                </div>
                                <div className="mt-1 h-1 rounded-full bg-[var(--border)]">
                                  <div
                                    className="h-1 rounded-full bg-[var(--accent)] opacity-80"
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
    <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 shadow-sm">
      <p className="text-[12px] font-medium text-[var(--muted)]">{label}</p>
      <p
        className={`mt-1 break-words font-semibold leading-snug tracking-tight tabular-nums [overflow-wrap:anywhere] text-[clamp(14px,2.4vw,18px)] ${
          accent ? "text-amber-500 dark:text-amber-400" : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}