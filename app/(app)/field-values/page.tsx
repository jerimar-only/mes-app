import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FieldValuesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; office?: string }>;
}) {
  const params = await searchParams;
  const yearFilter = params.year ? parseInt(params.year, 10) : undefined;

  // 1. All field definitions (the "column headers") ordered by index
  const definitions = await prisma.fieldDefinition.findMany({
    orderBy: { order: "asc" },
  });

  // 2. Field values with their parent record + definition
  const fieldValues = await prisma.fieldValue.findMany({
    where: yearFilter
      ? { apprehensionRecord: { year: yearFilter, isDeleted: false } }
      : { apprehensionRecord: { isDeleted: false } },
    include: {
      fieldDefinition: true,
      apprehensionRecord: {
        include: { cenroOffice: true },
      },
    },
    orderBy: [
      { apprehensionRecord: { year: "desc" } },
      { apprehensionRecord: { id: "asc" } },
      { fieldDefinition: { order: "asc" } },
    ],
  });

  // Group values by record for nicer display
  const byRecord = new Map<
    number,
    {
      record: (typeof fieldValues)[0]["apprehensionRecord"];
      values: typeof fieldValues;
    }
  >();

  for (const fv of fieldValues) {
    const existing = byRecord.get(fv.apprehensionRecordId);
    if (existing) {
      existing.values.push(fv);
    } else {
      byRecord.set(fv.apprehensionRecordId, {
        record: fv.apprehensionRecord,
        values: [fv],
      });
    }
  }

  const years = await prisma.apprehensionRecord.findMany({
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "desc" },
  });

  return (
    <div className="space-y-10 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Custom Field Values
          </h1>
          <p className="mt-1 text-[15px] text-[#5B6156]">
            View dynamic fields and their order/index in the column layout
          </p>
        </div>
        <Link
          href="/reports"
          className="text-sm text-[#4A6741] hover:underline"
        >
          ← Back to Reports
        </Link>
      </div>

      {/* ── Field Definitions (the column headers + their index) ── */}
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold">
          Field Definitions (Column Index)
        </h2>
        <div className="overflow-hidden rounded-lg border border-[#E9E5D8] bg-white">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-[#E9E5D8] bg-[#FAFAF6] text-[13px] text-[#5B6156]">
              <tr>
                <th className="px-4 py-2 font-medium w-20">Index (order)</th>
                <th className="px-4 py-2 font-medium">Field Name</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {definitions.map((d) => (
                <tr key={d.id} className="border-b border-[#F0EDE3] last:border-0">
                  <td className="px-4 py-2 font-mono font-medium text-[#4A6741]">
                    {d.order}
                  </td>
                  <td className="px-4 py-2">{d.name}</td>
                  <td className="px-4 py-2">{d.type}</td>
                  <td className="px-4 py-2">
                    {d.disabled ? (
                      <span className="text-amber-700">Disabled</span>
                    ) : (
                      <span className="text-green-700">Active</span>
                    )}
                  </td>
                </tr>
              ))}
              {definitions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-[#5B6156]">
                    No field definitions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Filter ── */}
      <form method="get" className="flex items-center gap-3">
        <label className="text-[13px] text-[#5B6156]">Filter by year:</label>
        <select
          name="year"
          defaultValue={yearFilter ?? ""}
          className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[14px]"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y.year} value={y.year}>
              {y.year}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-[#4A6741] px-4 py-2 text-[14px] text-white hover:bg-[#3D5636]"
        >
          Apply
        </button>
      </form>

      {/* ── Field Values per Record ── */}
      <section className="space-y-6">
        <h2 className="text-[15px] font-semibold">
          Field Values by Record ({byRecord.size} records)
        </h2>

        {Array.from(byRecord.entries()).map(([recordId, { record, values }]) => (
          <div
            key={recordId}
            className="rounded-lg border border-[#E9E5D8] bg-white overflow-hidden"
          >
            <div className="bg-[#FAFAF6] px-4 py-3 border-b border-[#E9E5D8] flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
              <span>
                <strong>ID:</strong> {record.id}
              </span>
              <span>
                <strong>Docket:</strong> {record.docketNumber ?? "—"}
              </span>
              <span>
                <strong>Date:</strong> {record.dateOfApprehension ?? "—"}
              </span>
              <span>
                <strong>Year/Month:</strong> {record.year}
                {record.month ? ` / ${record.month}` : ""}
              </span>
              <span>
                <strong>Office:</strong> {record.cenroOffice?.name ?? "—"}
              </span>
            </div>

            <table className="w-full text-left text-[14px]">
              <thead className="border-b border-[#E9E5D8] text-[13px] text-[#5B6156]">
                <tr>
                  <th className="px-4 py-2 font-medium w-20">Index</th>
                  <th className="px-4 py-2 font-medium">Field Name</th>
                  <th className="px-4 py-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {values.map((fv) => (
                  <tr key={fv.id} className="border-b border-[#F0EDE3] last:border-0">
                    <td className="px-4 py-2 font-mono text-[#4A6741]">
                      {fv.fieldDefinition.order}
                    </td>
                    <td className="px-4 py-2">{fv.fieldDefinition.name}</td>
                    <td className="px-4 py-2">
                      {fv.textValue ?? fv.numberValue ?? (
                        <span className="text-[#9CA3AF]">(empty)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {byRecord.size === 0 && (
          <p className="text-[#5B6156] text-center py-10">
            No field values found{yearFilter ? ` for ${yearFilter}` : ""}.
          </p>
        )}
      </section>
    </div>
  );
}