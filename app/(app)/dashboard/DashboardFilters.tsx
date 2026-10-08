// app/dashboard/DashboardFilters.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Office = { id: number; name: string };

export default function DashboardFilters({
  years,
  offices,
  selectedYear,
  selectedOffice,
  showProvincial,
  onToggleProvincial,
}: {
  years: number[];
  offices: Office[];
  selectedYear?: number;
  selectedOffice?: number;
  showProvincial: boolean;
  onToggleProvincial: () => void;
}) {
  const router = useRouter();
  const [year, setYear] = useState(selectedYear ? String(selectedYear) : "");
  const [office, setOffice] = useState(selectedOffice ? String(selectedOffice) : "");

  function go(nextYear: string, nextOffice: string) {
    const qs = new URLSearchParams();
    if (nextYear) qs.set("year", nextYear);
    if (nextOffice) qs.set("office", nextOffice);
    const s = qs.toString();
    router.push(s ? `/dashboard?${s}` : "/dashboard");
  }

  const hasFilters = Boolean(year || office);

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      {/* Left side: Year + Office + Clear */}
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]">
          Year
        </label>
        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            go(e.target.value, office);
          }}
          className="min-w-[120px] rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]">
          CENRO Office
        </label>
        <select
          value={office}
          onChange={(e) => {
            setOffice(e.target.value);
            go(year, e.target.value);
          }}
          className="min-w-[160px] rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
        >
          <option value="">All CENRO</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setYear("");
            setOffice("");
            go("", "");
          }}
          className="mb-0.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
        >
          Clear filters
        </button>
      )}

      {/* Right side: Provincial summary toggle */}
      <div className="ml-auto flex items-center gap-2 self-end pb-0.5">
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
      </div>
    </div>
  );
}