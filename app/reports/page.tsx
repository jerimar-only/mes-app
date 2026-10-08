import { prisma } from "@/lib/prisma";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_LABEL: Record<string, string> = {
  FOR_RESOLUTION: "For resolution",
  UNDER_ADJUDICATION: "Under adjudication",
  CONFISCATED: "Confiscated",
  DONATED: "Donated",
  RELEASED: "Released",
  UNKNOWN: "Needs review",
};

const n = (v: number | null | undefined, decimals = 0) =>
  (v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: decimals });

const peso = (v: number | null | undefined) =>
  `₱${(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  const recordWhere = { year: selectedYear, isDeleted: false };
  const childWhere = { apprehensionRecord: recordWhere };

  const [allRecords, offices, byOffice, byStatus, byProduct, byConveyance, byEquipment] =
    await Promise.all([
      prisma.apprehensionRecord.findMany({
        where: recordWhere,
        include: { items: true, conveyances: true, equipment: true },
      }),
      prisma.cenroOffice.findMany({ orderBy: { name: "asc" } }),
      // ApprehensionRecord, grouped by CENRO office
      prisma.apprehensionRecord.groupBy({
        by: ["cenroOfficeId"],
        where: recordWhere,
        _count: { _all: true },
      }),
      // ApprehensionRecord, grouped by status
      prisma.apprehensionRecord.groupBy({
        by: ["status"],
        where: recordWhere,
        _count: { _all: true },
      }),
      // ForestProductItem, grouped by species
      prisma.forestProductItem.groupBy({
        by: ["species"],
        where: childWhere,
        _count: { _all: true },
        _sum: { volumeCuM: true, volumeBdFt: true, estimatedValue: true },
        orderBy: { _sum: { volumeBdFt: "desc" } },
      }),
      // Conveyance, grouped by type
      prisma.conveyance.groupBy({
        by: ["type"],
        where: childWhere,
        _count: { _all: true },
        _sum: { quantity: true, estimatedValue: true },
        orderBy: { _sum: { quantity: "desc" } },
      }),
      // Equipment, grouped by type
      prisma.equipment.groupBy({
        by: ["type"],
        where: childWhere,
        _count: { _all: true },
        _sum: { quantity: true, estimatedValue: true },
        orderBy: { _sum: { quantity: "desc" } },
      }),
    ]);

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
  const totalIncidents = allRecords.length;
  const totalVolume = monthlyData.reduce((s, d) => s + d.volumeBdFt, 0);
  const totalConv = monthlyData.reduce((s, d) => s + d.conveyances, 0);
  const totalEquip = monthlyData.reduce((s, d) => s + d.equipment, 0);

  // ---- Rows for the per-table sections ----
  const officeName = (id: number) => offices.find((o) => o.id === id)?.name ?? "Unknown";

  const officeRows = [...byOffice]
    .sort((a, b) => b._count._all - a._count._all)
    .map((o) => [officeName(o.cenroOfficeId), n(o._count._all)]);

  const statusRows = [...byStatus]
    .sort((a, b) => b._count._all - a._count._all)
    .map((s) => [STATUS_LABEL[s.status] ?? s.status, n(s._count._all)]);

  const productRows = byProduct.map((p) => [
    p.species || "Unspecified",
    n(p._count._all),
    n(p._sum.volumeCuM, 2),
    n(p._sum.volumeBdFt, 2),
    peso(p._sum.estimatedValue),
  ]);
  const productFooter = [
    "Total",
    n(byProduct.reduce((s, p) => s + p._count._all, 0)),
    n(byProduct.reduce((s, p) => s + (p._sum.volumeCuM ?? 0), 0), 2),
    n(byProduct.reduce((s, p) => s + (p._sum.volumeBdFt ?? 0), 0), 2),
    peso(byProduct.reduce((s, p) => s + (p._sum.estimatedValue ?? 0), 0)),
  ];

  const pairRows = (rows: typeof byConveyance) =>
    rows.map((c) => [
      c.type || "Unspecified",
      n(c._count._all),
      n(c._sum.quantity),
      peso(c._sum.estimatedValue),
    ]);
  const pairFooter = (rows: typeof byConveyance) => [
    "Total",
    n(rows.reduce((s, c) => s + c._count._all, 0)),
    n(rows.reduce((s, c) => s + (c._sum.quantity ?? 0), 0)),
    peso(rows.reduce((s, c) => s + (c._sum.estimatedValue ?? 0), 0)),
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Reports</h1>
          <p className="mt-1 text-[15px] text-[var(--muted)]">
            Summary of apprehensions from January to present — {selectedYear}
            {unparsedCount > 0 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                ({unparsedCount} record{unparsedCount > 1 ? "s" : ""} could not be assigned to a month)
              </span>
            )}
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <select
            name="year"
            defaultValue={selectedYear}
            className="rounded-md border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-[14px] text-[var(--foreground)]"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-[14px] text-white hover:bg-[var(--accent-hover)]"
          >
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

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="mb-5 text-[15px] font-semibold text-[var(--foreground)]">Incidents by month</h2>
        <div className="space-y-3">
          {monthlyData.map((d) => (
            <div key={d.month} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-[13px] text-[var(--muted)]">{MONTH_NAMES[d.month]}</span>
              <div className="h-7 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-7 rounded-full bg-[var(--accent)]"
                  style={{ width: `${(d.incidents / maxIncidents) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-[13px] text-[var(--muted)]">{d.incidents}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[15px] font-semibold text-[var(--foreground)]">Monthly breakdown</h2>
        {/* overflow-x-auto lets the table scroll sideways on phones instead of clipping */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <thead className="border-b border-[var(--border)] bg-[var(--background)] text-[13px] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium">No. Incidents</th>
                <th className="px-4 py-3 font-medium">Volume (bd. ft.)</th>
                <th className="px-4 py-3 font-medium">No. of Conveyances</th>
                <th className="px-4 py-3 font-medium">No. of Tool/Implements</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((d) => (
                <tr key={d.month} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-2.5 text-[var(--foreground)]">{MONTH_NAMES[d.month]}</td>
                  <td className="px-4 py-2.5 text-[var(--foreground)]">{d.incidents}</td>
                  <td className="px-4 py-2.5 text-[var(--foreground)]">
                    {d.volumeBdFt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--foreground)]">{d.conveyances}</td>
                  <td className="px-4 py-2.5 text-[var(--foreground)]">{d.equipment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- One section per database table ---- */}
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            Report by database table — {selectedYear}
          </h2>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Each section follows a table in the database. Deleted records are not counted.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TableSection
            title="Records by CENRO office"
            table="ApprehensionRecord"
            headers={["CENRO office", "Records"]}
            rows={officeRows}
            footer={["Total", n(totalIncidents)]}
          />
          <TableSection
            title="Records by status"
            table="ApprehensionRecord"
            headers={["Status", "Records"]}
            rows={statusRows}
            footer={["Total", n(totalIncidents)]}
          />
        </div>

        <TableSection
          title="Forest products by species"
          table="ForestProductItem"
          headers={["Species", "Items", "Volume (cu.m.)", "Volume (bd.ft.)", "Estimated value"]}
          rows={productRows}
          footer={productFooter}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <TableSection
            title="Conveyances by type"
            table="Conveyance"
            headers={["Type", "Records", "Quantity", "Estimated value"]}
            rows={pairRows(byConveyance)}
            footer={pairFooter(byConveyance)}
          />
          <TableSection
            title="Equipment / tools by type"
            table="Equipment"
            headers={["Type", "Records", "Quantity", "Estimated value"]}
            rows={pairRows(byEquipment)}
            footer={pairFooter(byEquipment)}
          />
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Download reports</h2>

        <form
          action="/api/export/detailed"
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <div>
            <label className="mb-1 block text-[13px] font-medium text-[var(--muted)]">
              Detailed monthly report
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                name="year"
                defaultValue={selectedYear}
                className="w-24 rounded-md border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-[14px] text-[var(--foreground)]"
              />
              <select
                name="month"
                className="rounded-md border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-[14px] text-[var(--foreground)]"
              >
                {MONTH_NAMES.slice(1).map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-[14px] text-white hover:bg-[var(--accent-hover)] sm:w-auto"
          >
            Download
          </button>
        </form>

        <form
          action="/api/export/quarterly"
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <div>
            <label className="mb-1 block text-[13px] font-medium text-[var(--muted)]">
              Quarterly / date-range summary
            </label>
            {/* flex-wrap keeps the selects inside the card on narrow screens */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                name="year"
                defaultValue={selectedYear}
                className="w-24 rounded-md border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-[14px] text-[var(--foreground)]"
              />
              <select
                name="startMonth"
                defaultValue={4}
                className="rounded-md border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-[14px] text-[var(--foreground)]"
              >
                {MONTH_NAMES.slice(1).map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
              <span className="text-[13px] text-[var(--muted)]">to</span>
              <select
                name="endMonth"
                defaultValue={6}
                className="rounded-md border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-[14px] text-[var(--foreground)]"
              >
                {MONTH_NAMES.slice(1).map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-[14px] text-white hover:bg-[var(--accent-hover)] sm:w-auto"
          >
            Download
          </button>
        </form>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <p className="text-[13px] font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

// A report section that mirrors one database table
function TableSection({
  title,
  table,
  headers,
  rows,
  footer,
}: {
  title: string;
  table: string;
  headers: string[];
  rows: (string | number)[][];
  footer?: (string | number)[];
}) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
        <h3 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h3>
        <span className="text-[12px] text-[var(--muted)]">Table: {table}</span>
      </div>
      <div className="max-h-[420px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full min-w-[320px] text-left text-[14px]">
          <thead className="sticky top-0 border-b border-[var(--border)] bg-[var(--background)] text-[13px] text-[var(--muted)]">
            <tr>
              {headers.map((h, i) => (
                <th key={h} className={`whitespace-nowrap px-4 py-3 font-medium ${i > 0 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="px-4 py-6 text-center text-[var(--muted)]">
                  No data for this year.
                </td>
              </tr>
            )}
            {rows.map((r, ri) => (
              <tr key={ri} className="border-b border-[var(--border)] last:border-0">
                {r.map((c, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-2.5 text-[var(--foreground)] ${ci > 0 ? "text-right tabular-nums" : ""}`}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && rows.length > 0 && (
            <tfoot className="border-t border-[var(--border)] bg-[var(--background)] font-semibold">
              <tr>
                {footer.map((c, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-2.5 text-[var(--foreground)] ${ci > 0 ? "text-right tabular-nums" : ""}`}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}