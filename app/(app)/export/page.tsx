import { prisma } from "@/lib/prisma";

export default async function ExportPage() {
  const offices = await prisma.cenroOffice.findMany({ orderBy: { name: "asc" } });
  const yearsResult = await prisma.apprehensionRecord.findMany({
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "desc" },
  });
  const years = yearsResult.map((r) => r.year);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Export to Excel</h1>
        <p className="mt-1 text-[15px] text-[#5B6156]">
          Download the apprehension records for a specific year and CENRO office.
        </p>
      </div>

      <form action="/api/export" method="get" className="flex max-w-md flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Year</label>
          <select
            name="year"
            required
            className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[14px]"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">CENRO office</label>
          <select
            name="office"
            required
            className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[14px]"
          >
            {offices.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-[#4A6741] px-5 py-2.5 text-[14px] text-white hover:bg-[#3D5636]"
        >
          Download
        </button>
      </form>
    </div>
  );
}
