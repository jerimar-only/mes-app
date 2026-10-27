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
      <form action="/api/export" method="get" className="flex max-w-md flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--muted)]">Year</label>
          <select
            name="year"
            required
            className="rounded-md border border-[var(--border-strong)] bg-white px-3 py-2 text-[14px]"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--muted)]">CENRO office</label>
          <select
            name="office"
            required
            className="rounded-md border border-[var(--border-strong)] bg-white px-3 py-2 text-[14px]"
          >
            {offices.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-[14px] text-white hover:bg-[var(--accent-hover)]"
        >
          Download
        </button>
      </form>
    </div>
  );
}
