// app/dashboard/DashboardFilters.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Office = { id: number; name: string };

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "UNKNOWN", label: "Needs review" },
  { value: "FOR_RESOLUTION", label: "For resolution" },
  { value: "UNDER_ADJUDICATION", label: "Under adjudication" },
  { value: "CONFISCATED", label: "Confiscated" },
  { value: "DONATED", label: "Donated" },
  { value: "RELEASED", label: "Released" },
];

const selectClass =
  "w-full min-w-0 rounded-lg border border-[var(--border-strong)] bg-[var(--card)]/80 px-3 py-2 text-[14px] text-[var(--foreground)] shadow-sm backdrop-blur-sm focus:border-[var(--accent)] focus:outline-none";

export default function DashboardFilters({
  years,
  offices,
  selectedYear,
  selectedOffice,
  selectedStatus,
  selectedQ,
  showProvincial,
  onToggleProvincial,
  isCenro = false,
  lockedOfficeId,
}: {
  years: number[];
  offices: Office[];
  selectedYear?: number;
  selectedOffice?: number;
  selectedStatus?: string;
  selectedQ?: string;
  showProvincial: boolean;
  onToggleProvincial: () => void;
  isCenro?: boolean;
  lockedOfficeId?: number | null;
}) {
  const router = useRouter();
  const [year, setYear] = useState(selectedYear ? String(selectedYear) : "");
  const [office, setOffice] = useState(selectedOffice ? String(selectedOffice) : "");
  const [status, setStatus] = useState(selectedStatus ?? "");
  const [q, setQ] = useState(selectedQ ?? "");

  // Keep local state in sync when URL changes (back/forward)
  useEffect(() => {
    setYear(selectedYear ? String(selectedYear) : "");
    setOffice(selectedOffice ? String(selectedOffice) : "");
    setStatus(selectedStatus ?? "");
    setQ(selectedQ ?? "");
  }, [selectedYear, selectedOffice, selectedStatus, selectedQ]);

  function go(next: {
    year?: string;
    office?: string;
    status?: string;
    q?: string;
  }) {
    const qs = new URLSearchParams();
    const y = next.year ?? year;
    const o = next.office ?? office;
    const s = next.status ?? status;
    const query = next.q ?? q;
    if (y) qs.set("year", y);
    if (o) qs.set("office", o);
    if (s) qs.set("status", s);
    if (query.trim()) qs.set("q", query.trim());
    const str = qs.toString();
    router.push(str ? `/dashboard?${str}` : "/dashboard");
  }

  const hasFilters = Boolean(year || office || status || q.trim());

  return (
    <div className="dash-panel px-3.5 py-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold tracking-wide text-[var(--muted)]">
          Filters
        </p>
        <span className="dash-panel-icon bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 12h12M10 20h4" />
          </svg>
        </span>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        {/* 2-col grid on mobile; wrap row on larger screens */}
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-2.5 gap-y-2.5 sm:flex sm:flex-wrap sm:items-end">
          <div className="min-w-0">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Year
            </label>
            <select
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                go({ year: e.target.value });
              }}
              className={selectClass}
            >
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              CENRO Office
            </label>
            <select
              value={isCenro && lockedOfficeId ? String(lockedOfficeId) : office}
              onChange={(e) => {
                if (isCenro) return;
                setOffice(e.target.value);
                go({ office: e.target.value });
              }}
              disabled={isCenro}
              className={`${selectClass} disabled:opacity-70`}
            >
              {!isCenro && <option value="">All CENROs</option>}
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                go({ status: e.target.value });
              }}
              className={selectClass}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 sm:min-w-[220px] sm:flex-1">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Search
            </label>
            <div className="relative">
              <input
                type="search"
                value={q}
                placeholder="Place, claimant, docket…"
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    go({ q });
                  }
                }}
                onBlur={() => {
                  if ((selectedQ ?? "") !== q.trim()) go({ q });
                }}
                className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)]/80 py-2 pl-3 pr-9 text-[14px] text-[var(--foreground)] shadow-sm backdrop-blur-sm placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="button"
                aria-label="Apply search"
                onClick={() => go({ q })}
                className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                </svg>
              </button>
            </div>
          </div>

          {hasFilters && (
            <div className="col-span-2 sm:col-span-1">
              <button
                type="button"
                onClick={() => {
                  setYear("");
                  setOffice("");
                  setStatus("");
                  setQ("");
                  router.push("/dashboard");
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)] sm:mb-0.5 sm:w-auto"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Provincial toggle — full width under grid on mobile */}
        <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
          <label className="flex cursor-pointer items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={showProvincial}
              onClick={onToggleProvincial}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                showProvincial ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                  showProvincial ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-[13px] font-medium text-[var(--muted)]">
              Provincial summary
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
