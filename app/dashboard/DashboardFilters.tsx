"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Office = { id: number; name: string };

export default function DashboardFilters({
  years,
  offices,
  selectedYear,
  selectedOffice,
}: {
  years: number[];
  offices: Office[];
  selectedYear?: number;
  selectedOffice?: number;
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
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">1. Select year</label>
        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            go(e.target.value, office);
          }}
          className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[14px]"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">2. Select CENRO</label>
        <select
          value={office}
          onChange={(e) => {
            setOffice(e.target.value);
            go(year, e.target.value);
          }}
          className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[14px]"
        >
          <option value="">All CENRO</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
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
          className="pb-2 text-[13px] text-[#4A6741] hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
