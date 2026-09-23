import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<string, string> = {
  FOR_RESOLUTION: "For resolution",
  UNDER_ADJUDICATION: "Under adjudication",
  CONFISCATED: "Confiscated",
  DONATED: "Donated",
  RELEASED: "Released",
  UNKNOWN: "Needs review",
};

export default async function DashboardPage() {
  const [byYear, byOffice, byStatus, totals] = await Promise.all([
    prisma.apprehensionRecord.groupBy({
      by: ["year"],
      _count: { _all: true },
      orderBy: { year: "asc" },
    }),
    prisma.apprehensionRecord.groupBy({
      by: ["cenroOfficeId"],
      _count: { _all: true },
    }),
    prisma.apprehensionRecord.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.apprehensionRecord.aggregate({
      _count: { _all: true },
    }),
  ]);

  const offices = await prisma.cenroOffice.findMany();
  const officeName = (id: number) =>
    offices.find((o) => o.id === id)?.name ?? "Unknown";

  const items = await prisma.forestProductItem.aggregate({
    _sum: { volumeCuM: true, estimatedValue: true },
  });

  const maxYearCount = Math.max(...byYear.map((y) => y._count._all), 1);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-[15px] text-[#5B6156]">
          Live totals across all recorded apprehensions — Province of Cagayan.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total records" value={totals._count._all.toLocaleString()} />
        <StatCard
          label="Total volume"
          value={`${(items._sum.volumeCuM ?? 0).toLocaleString(undefined, {
            maximumFractionDigits: 1,
          })} cu.m.`}
        />
        <StatCard
          label="Estimated value"
          value={`₱${(items._sum.estimatedValue ?? 0).toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}`}
        />
        <StatCard
          label="Needs review"
          value={(
            byStatus.find((s) => s.status === "UNKNOWN")?._count._all ?? 0
          ).toLocaleString()}
          accent
        />
      </div>

      <section>
        <h2 className="mb-4 text-[15px] font-semibold">Apprehensions by year</h2>
        <div className="space-y-2">
          {byYear.map((y) => (
            <div key={y.year} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-[13px] text-[#5B6156]">{y.year}</span>
              <div className="h-6 flex-1 rounded bg-[#E9E5D8]">
                <div
                  className="h-6 rounded bg-[#4A6741]"
                  style={{ width: `${(y._count._all / maxYearCount) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-[13px] text-[#5B6156]">
                {y._count._all}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-4 text-[15px] font-semibold">By CENRO office</h2>
          <ul className="divide-y divide-[#E9E5D8] rounded-lg border border-[#E9E5D8]">
            {byOffice
              .sort((a, b) => b._count._all - a._count._all)
              .map((o) => (
                <li
                  key={o.cenroOfficeId}
                  className="flex items-center justify-between px-4 py-2.5 text-[14px]"
                >
                  <span>{officeName(o.cenroOfficeId)}</span>
                  <span className="text-[#5B6156]">{o._count._all}</span>
                </li>
              ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-[15px] font-semibold">By status</h2>
          <ul className="divide-y divide-[#E9E5D8] rounded-lg border border-[#E9E5D8]">
            {byStatus
              .sort((a, b) => b._count._all - a._count._all)
              .map((s) => (
                <li
                  key={s.status}
                  className="flex items-center justify-between px-4 py-2.5 text-[14px]"
                >
                  <span>{STATUS_LABEL[s.status] ?? s.status}</span>
                  <span className="text-[#5B6156]">{s._count._all}</span>
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
    <div className="rounded-lg border border-[#E9E5D8] bg-white p-4">
      <p className="text-[13px] text-[#5B6156]">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          accent ? "text-[#B45309]" : "text-[#1F2A1E]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
