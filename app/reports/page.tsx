import { prisma } from "@/lib/prisma";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const yearsResult = await prisma.apprehensionRecord.findMany({
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "desc" },
  });
  const years = yearsResult.map((r) => r.year);
  const selectedYear = params.year ? parseInt(params.year, 10) : years[0] ?? new Date().getFullYear();

  // Fetch ALL records for the year (no month filter)
  const allRecords = await prisma.apprehensionRecord.findMany({
    where: { year: selectedYear, isDeleted: false },
    include: { items: true, conveyances: true, equipment: true },
  });

  // Group by month
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    incidents: 0,
    volumeBdFt: 0,
    conveyances: 0,
    equipment: 0,
  }));

  let unparsedCount = 0;

  for (const r of allRecords) {
    let m = r.month;

    // Fallback: try to extract month from dateOfApprehension string
    if (m == null && r.dateOfApprehension) {
      const d = r.dateOfApprehension.toLowerCase();
      const monthNames = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december",
      ];
      for (let i = 0; i < 12; i++) {
        if (d.includes(monthNames[i])) {
          m = i + 1;
          break;
        }
      }
      // Try numeric formats
      if (m == null) {
        const match = d.match(/(\d{1,2})[\/\-](\d{1,2})/) || d.match(/(\d{4})[\/\-](\d{1,2})/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= 1 && num <= 12) m = num;
          else if (match[2]) {
            const num2 = parseInt(match[2], 10);
            if (num2 >= 1 && num2 <= 12) m = num2;
          }
        }
      }
    }

    if (m != null && m >= 1 && m <= 12) {
      const idx = m - 1;
      monthlyData[idx].incidents += 1;
      monthlyData[idx].volumeBdFt += r.items.reduce((s, i) => s + (i.volumeBdFt ?? 0), 0);
      monthlyData[idx].conveyances += r.conveyances.reduce((s, c) => s + c.quantity, 0);
      monthlyData[idx].equipment += r.equipment.reduce((s, e) => s + e.quantity, 0);
    } else {
      unparsedCount += 1;
    }
  }

  const maxIncidents = Math.max(...monthlyData.map((d) => d.incidents), 1);
  const totalIncidents = allRecords.length; // real total
  const totalVolume = monthlyData.reduce((s, d) => s + d.volumeBdFt, 0);
  const totalConv = monthlyData.reduce((s, d) => s + d.conveyances, 0);
  const totalEquip = monthlyData.reduce((s, d) => s + d.equipment, 0);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-[15px] text-[#5B6156]">
            Summary of apprehensions from January to present — {selectedYear}
            {unparsedCount > 0 && (
              <span className="ml-2 text-amber-700">
                ({unparsedCount} record{unparsedCount > 1 ? "s" : ""} could not be assigned to a month)
              </span>
            )}
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <select
            name="year"
            defaultValue={selectedYear}
            className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[14px]"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button type="submit" className="rounded-md bg-[#4A6741] px-4 py-2 text-[14px] text-white hover:bg-[#3D5636]">
            View
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total incidents" value={totalIncidents.toLocaleString()} />
        <StatCard label="Volume (bd. ft.)" value={totalVolume.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
        <StatCard label="Conveyances" value={totalConv.toLocaleString()} />
        <StatCard label="Tools/equipment" value={totalEquip.toLocaleString()} />
      </div>

      <section>
        <h2 className="mb-4 text-[15px] font-semibold">Incidents by month</h2>
        <div className="space-y-2">
          {monthlyData.map((d) => (
            <div key={d.month} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-[13px] text-[#5B6156]">{MONTH_NAMES[d.month]}</span>
              <div className="h-6 flex-1 rounded bg-[#E9E5D8]">
                <div
                  className="h-6 rounded bg-[#4A6741]"
                  style={{ width: `${(d.incidents / maxIncidents) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-[13px] text-[#5B6156]">{d.incidents}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[15px] font-semibold">Monthly breakdown</h2>
        <div className="overflow-hidden rounded-lg border border-[#E9E5D8] bg-white">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-[#E9E5D8] bg-[#FAFAF6] text-[13px] text-[#5B6156]">
              <tr>
                <th className="px-4 py-2 font-medium">Month</th>
                <th className="px-4 py-2 font-medium">No. Incidents</th>
                <th className="px-4 py-2 font-medium">Volume (bd. ft.)</th>
                <th className="px-4 py-2 font-medium">No. of Conveyances</th>
                <th className="px-4 py-2 font-medium">No. of Tool/Implements</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((d) => (
                <tr key={d.month} className="border-b border-[#F0EDE3] last:border-0">
                  <td className="px-4 py-2">{MONTH_NAMES[d.month]}</td>
                  <td className="px-4 py-2">{d.incidents}</td>
                  <td className="px-4 py-2">{d.volumeBdFt.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2">{d.conveyances}</td>
                  <td className="px-4 py-2">{d.equipment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-[15px] font-semibold">Download reports</h2>

        <form action="/api/export/detailed" method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-[#E9E5D8] bg-white p-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Detailed monthly report</label>
            <div className="flex gap-2">
              <input type="number" name="year" defaultValue={selectedYear} className="w-24 rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
              <select name="month" className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]">
                {MONTH_NAMES.slice(1).map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="rounded-md bg-[#4A6741] px-4 py-2 text-[14px] text-white hover:bg-[#3D5636]">
            Download
          </button>
        </form>

        <form action="/api/export/quarterly" method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-[#E9E5D8] bg-white p-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Quarterly / date-range summary</label>
            <div className="flex gap-2">
              <input type="number" name="year" defaultValue={selectedYear} className="w-24 rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
              <select name="startMonth" defaultValue={4} className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]">
                {MONTH_NAMES.slice(1).map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
              <span className="self-center text-[13px] text-[#5B6156]">to</span>
              <select name="endMonth" defaultValue={6} className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]">
                {MONTH_NAMES.slice(1).map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="rounded-md bg-[#4A6741] px-4 py-2 text-[14px] text-white hover:bg-[#3D5636]">
            Download
          </button>
        </form>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#E9E5D8] bg-white p-4">
      <p className="text-[13px] text-[#5B6156]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#1F2A1E]">{value}</p>
    </div>
  );
}