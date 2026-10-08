import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import DashboardFilters from "./DashboardFilters";
import { ProvincialSummary } from "@/components/dashboard/ProvincialSummary";

const STATUS_LABEL: Record<string, string> = {
  FOR_RESOLUTION: "For resolution",
  UNDER_ADJUDICATION: "Under adjudication",
  CONFISCATED: "Confiscated",
  DONATED: "Donated",
  RELEASED: "Released",
  UNKNOWN: "Needs review",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; office?: string }>;
}) {
  const params = await searchParams;
  const selectedYear = params.year ? parseInt(params.year, 10) || undefined : undefined;
  const selectedOffice = params.office ? parseInt(params.office, 10) || undefined : undefined;

  const where: Prisma.ApprehensionRecordWhereInput = {
    isDeleted: false,
    ...(selectedYear ? { year: selectedYear } : {}),
    ...(selectedOffice ? { cenroOfficeId: selectedOffice } : {}),
  };

  const [offices, yearRows, byYear, byOffice, byStatus, total, itemTotals] = await Promise.all([
    prisma.cenroOffice.findMany({ orderBy: { name: "asc" } }),
    prisma.apprehensionRecord.findMany({
      where: { isDeleted: false },
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
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
    prisma.apprehensionRecord.count({ where }),
    prisma.forestProductItem.aggregate({
      where: { apprehensionRecord: where },
      _sum: { volumeCuM: true, estimatedValue: true },
    }),
  ]);

  const years = yearRows.map((r) => r.year);
  const officeName = (id: number) => offices.find((o) => o.id === id)?.name ?? "Unknown";
  const maxYearCount = Math.max(...byYear.map((y) => y._count._all), 1);
  const needsReview = byStatus.find((s) => s.status === "UNKNOWN")?._count._all ?? 0;

  const scopeLabel = [
    selectedYear ? String(selectedYear) : "All years",
    selectedOffice ? officeName(selectedOffice) : "All CENRO",
  ].join(" · ");

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Dashboard
        </h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          Live totals from recorded apprehensions — {scopeLabel}
        </p>
      </div>

      {/* Provincial summary (matches the PENRO Excel summary) */}
      <ProvincialSummary year={selectedYear} />
      
      <DashboardFilters
        years={years}
        offices={offices}
        selectedYear={selectedYear}
        selectedOffice={selectedOffice}
      />



      {/* Stat cards - glass style */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total records" value={total.toLocaleString()} />
        <StatCard
          label="Total volume"
          value={`${(itemTotals._sum.volumeCuM ?? 0).toLocaleString(undefined, {
            maximumFractionDigits: 1,
          })} cu.m.`}
        />
        <StatCard
          label="Estimated value"
          value={`₱${(itemTotals._sum.estimatedValue ?? 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
        />
        <StatCard label="Needs review" value={needsReview.toLocaleString()} accent />
      </div>

      {/* Apprehensions by year */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl">
        <h2 className="mb-5 text-[15px] font-semibold text-[var(--foreground)]">
          Apprehensions by year
        </h2>
        {byYear.length === 0 ? (
          <p className="text-[14px] text-[var(--muted)]">No records match these filters.</p>
        ) : (
          <div className="space-y-3">
            {byYear.map((y) => (
              <div key={y.year} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-[13px] font-medium text-[var(--muted)]">
                  {y.year}
                </span>
                <div className="h-7 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-7 rounded-full bg-[var(--accent)] transition-all"
                    style={{ width: `${(y._count._all / maxYearCount) * 100}%` }}
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

      {/* Two columns */}
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">By CENRO office</h2>
          </div>
          <ul className="divide-y divide-white/10">
            {byOffice.length === 0 && (
              <li className="px-5 py-4 text-[14px] text-[var(--muted)]">
                No records match these filters.
              </li>
            )}
            {[...byOffice]
              .sort((a, b) => b._count._all - a._count._all)
              .map((o) => (
                <li
                  key={o.cenroOfficeId}
                  className="flex items-center justify-between px-5 py-3 text-[14px]"
                >
                  <span className="text-[var(--foreground)]">{officeName(o.cenroOfficeId)}</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[13px] font-medium text-[var(--muted)]">
                    {o._count._all}
                  </span>
                </li>
              ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">By status</h2>
          </div>
          <ul className="divide-y divide-white/10">
            {byStatus.length === 0 && (
              <li className="px-5 py-4 text-[14px] text-[var(--muted)]">
                No records match these filters.
              </li>
            )}
            {[...byStatus]
              .sort((a, b) => b._count._all - a._count._all)
              .map((s) => (
                <li
                  key={s.status}
                  className="flex items-center justify-between px-5 py-3 text-[14px]"
                >
                  <span className="text-[var(--foreground)]">
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[13px] font-medium text-[var(--muted)]">
                    {s._count._all}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      </div>
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur-xl">
      <p className="text-[13px] font-medium text-[var(--muted)]">{label}</p>
      <p
        className={`mt-1.5 text-xl font-semibold tracking-tight ${
          accent ? "text-amber-400" : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}