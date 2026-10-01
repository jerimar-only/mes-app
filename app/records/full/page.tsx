// NEW FILE: app/records/full/page.tsx

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const STATUS_LABEL: Record<string, string> = {
  FOR_RESOLUTION: "For resolution",
  UNDER_ADJUDICATION: "Under adjudication",
  CONFISCATED: "Confiscated",
  DONATED: "Donated",
  RELEASED: "Released",
  UNKNOWN: "Needs review",
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 500] as const;

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

export default async function FullRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    year?: string;
    office?: string;
    status?: string;
    deleted?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  // Parse pageSize — support "all" (capped at 500)
  let pageSize = 25;
  if (params.pageSize === "all") {
    pageSize = 500;
  } else {
    const parsed = parseInt(params.pageSize ?? "25", 10);
    if (PAGE_SIZE_OPTIONS.includes(parsed as any)) {
      pageSize = parsed;
    }
  }

  const offices = await prisma.cenroOffice.findMany({ orderBy: { name: "asc" } });

  const fieldDefs = await prisma.fieldDefinition.findMany({
    where: { disabled: false },
    orderBy: { order: "asc" },
  });

  const where: Prisma.ApprehensionRecordWhereInput = {
    ...(params.deleted === "only"
      ? { isDeleted: true }
      : params.deleted === "all"
      ? {}
      : { isDeleted: false }),
    ...(params.year ? { year: parseInt(params.year, 10) } : {}),
    ...(params.office ? { cenroOfficeId: parseInt(params.office, 10) } : {}),
    ...(params.status ? { status: params.status as any } : {}),
    ...(params.q
      ? {
          OR: [
            { placeOfApprehension: { contains: params.q, mode: "insensitive" } },
            { circumstances: { contains: params.q, mode: "insensitive" } },
            { docketNumber: { contains: params.q, mode: "insensitive" } },
            { remarks: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [records, total] = await Promise.all([
    prisma.apprehensionRecord.findMany({
      where,
      include: {
        cenroOffice: true,
        items: true,
        conveyances: true,
        equipment: true,
        fieldValues: true,
      },
      orderBy: [{ year: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.apprehensionRecord.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, total);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All records — full view</h1>
          <p className="mt-1 text-[14px] text-[#5B6156]">
            Showing {showingFrom.toLocaleString()}–{showingTo.toLocaleString()} of{" "}
            {total.toLocaleString()} records
            {params.pageSize === "all" && total > 500 && (
              <span className="ml-1 text-[#8B7355]">(capped at 500)</span>
            )}
          </p>
        </div>
        <Link
          href="/records"
          className="inline-flex shrink-0 items-center rounded-md border border-[#D8D3C4] bg-white px-4 py-2 text-[14px] hover:bg-[#F0EDE3]"
        >
          ← Back to summary
        </Link>
      </div>

      {/* Filters */}
      <form
        method="get"
        className="flex flex-wrap items-end gap-2.5 rounded-lg border border-[#E9E5D8] bg-[#FAFAF6] p-3"
      >
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#5B6156]">
            Search
          </label>
          <input
            type="text"
            name="q"
            defaultValue={params.q}
            placeholder="Place, docket, remarks…"
            className="w-full rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[13px]"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#5B6156]">
            Year
          </label>
          <select
            name="year"
            defaultValue={params.year ?? ""}
            className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[13px]"
          >
            <option value="">All</option>
            {Array.from({ length: 13 }, (_, i) => 2014 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#5B6156]">
            Office
          </label>
          <select
            name="office"
            defaultValue={params.office ?? ""}
            className="max-w-[160px] rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[13px]"
          >
            <option value="">All</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#5B6156]">
            Status
          </label>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[13px]"
          >
            <option value="">All</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#5B6156]">
            Records
          </label>
          <select
            name="deleted"
            defaultValue={params.deleted ?? ""}
            className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[13px]"
          >
            <option value="">Active</option>
            <option value="only">Deleted</option>
            <option value="all">Active + deleted</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#5B6156]">
            Per page
          </label>
          <select
            name="pageSize"
            defaultValue={params.pageSize ?? "25"}
            className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[13px]"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="all">All (max 500)</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-md bg-[#4A6741] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3D5636]"
        >
          Apply
        </button>
      </form>

      {/* Table */}
      <div className="relative overflow-auto rounded-lg border border-[#E9E5D8] bg-white shadow-sm" style={{ maxHeight: "70vh" }}>
        <table className="w-full border-collapse text-left text-[12.5px]" style={{ minWidth: "1600px" }}>
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-[#E9E5D8] bg-[#F5F3EB] text-[11px] uppercase tracking-wide text-[#5B6156]">
              <th className="sticky left-0 z-30 whitespace-nowrap bg-[#F5F3EB] px-3 py-2.5 font-semibold shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                ID
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 font-semibold">CENRO office</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Year</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Month</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Date</th>
              <th className="min-w-[140px] px-3 py-2.5 font-semibold">Place</th>
              <th className="min-w-[120px] px-3 py-2.5 font-semibold">Agency/s</th>
              <th className="min-w-[120px] px-3 py-2.5 font-semibold">Claimant</th>
              <th className="min-w-[180px] px-3 py-2.5 font-semibold">Circumstances</th>
              <th className="min-w-[110px] px-3 py-2.5 font-semibold">Custodian</th>
              <th className="min-w-[110px] px-3 py-2.5 font-semibold">Other agencies</th>
              <th className="min-w-[160px] px-3 py-2.5 font-semibold">Remarks</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Status</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Docket #</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Finality date</th>
              <th className="min-w-[150px] px-3 py-2.5 font-semibold">Forest products</th>
              <th className="min-w-[130px] px-3 py-2.5 font-semibold">Conveyances</th>
              <th className="min-w-[130px] px-3 py-2.5 font-semibold">Equipment</th>
              {fieldDefs.map((fd) => (
                <th key={fd.id} className="min-w-[120px] whitespace-nowrap px-3 py-2.5 font-semibold">
                  {fd.name}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Deleted</th>
            </tr>
          </thead>

          <tbody>
            {records.map((r, idx) => {
              const fvById = new Map(r.fieldValues.map((fv) => [fv.fieldDefinitionId, fv]));

              const productsText = r.items
                .map((it) => it.species || it.forms || it.description || "item")
                .join(", ");
              const conveyancesText = r.conveyances
                .map((c) => `${c.type} ×${c.quantity}`)
                .join(", ");
              const equipmentText = r.equipment
                .map((e) => `${e.type} ×${e.quantity}`)
                .join(", ");

              const rowBg = idx % 2 === 0 ? "bg-white" : "bg-[#FAFAF6]";

              return (
                <tr
                  key={r.id}
                  className={`border-b border-[#F0EDE3] last:border-0 hover:bg-[#F0EDE3] ${rowBg}`}
                >
                  {/* Sticky ID column */}
                  <td className={`sticky left-0 z-10 whitespace-nowrap px-3 py-2 font-medium shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] ${rowBg}`}>
                    <Link href={`/records/${r.id}`} className="text-[#4A6741] hover:underline">
                      {r.id}
                    </Link>
                  </td>

                  <td className="whitespace-nowrap px-3 py-2">{dash(r.cenroOffice.name)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.year)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.month)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.dateOfApprehension)}</td>

                  {/* Wrapping cells */}
                  <td className="max-w-[180px] px-3 py-2 break-words leading-snug">{dash(r.placeOfApprehension)}</td>
                  <td className="max-w-[140px] px-3 py-2 break-words leading-snug">{dash(r.apprehendingAgency)}</td>
                  <td className="max-w-[140px] px-3 py-2 break-words leading-snug">{dash(r.claimantRespondent)}</td>
                  <td className="max-w-[220px] px-3 py-2 break-words leading-snug">{dash(r.circumstances)}</td>
                  <td className="max-w-[130px] px-3 py-2 break-words leading-snug">{dash(r.custodianLocation)}</td>
                  <td className="max-w-[130px] px-3 py-2 break-words leading-snug">{dash(r.otherAgencies)}</td>
                  <td className="max-w-[200px] px-3 py-2 break-words leading-snug">{dash(r.remarks)}</td>

                  <td className="whitespace-nowrap px-3 py-2">{STATUS_LABEL[r.status] ?? r.status}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.docketNumber)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.orderOfFinalityDate)}</td>

                  <td className="max-w-[180px] px-3 py-2 break-words leading-snug">{dash(productsText)}</td>
                  <td className="max-w-[150px] px-3 py-2 break-words leading-snug">{dash(conveyancesText)}</td>
                  <td className="max-w-[150px] px-3 py-2 break-words leading-snug">{dash(equipmentText)}</td>

                  {fieldDefs.map((fd) => {
                    const fv = fvById.get(fd.id);
                    const value = !fv ? null : fd.type === "NUMBER" ? fv.numberValue : fv.textValue;
                    return (
                      <td key={fd.id} className="max-w-[140px] px-3 py-2 break-words leading-snug">
                        {dash(value)}
                      </td>
                    );
                  })}

                  <td className="whitespace-nowrap px-3 py-2">
                    {r.isDeleted ? (
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
                        Yes
                      </span>
                    ) : (
                      "No"
                    )}
                  </td>
                </tr>
              );
            })}

            {records.length === 0 && (
              <tr>
                <td colSpan={19 + fieldDefs.length} className="px-4 py-12 text-center text-[14px] text-[#5B6156]">
                  No records match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 text-[13px] text-[#5B6156] sm:flex-row">
          <span>
            Page {page} of {totalPages}
            {totalPages > 1 && (
              <span className="ml-1 text-[#8B8B7A]">
                · {total.toLocaleString()} total
              </span>
            )}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              {page > 1 && (
                <PageLink params={params} page={1} label="First" />
              )}
              {page > 1 && (
                <PageLink params={params} page={page - 1} label="← Prev" />
              )}

              {/* Simple page numbers around current */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) {
                  p = i + 1;
                } else if (page <= 3) {
                  p = i + 1;
                } else if (page >= totalPages - 2) {
                  p = totalPages - 4 + i;
                } else {
                  p = page - 2 + i;
                }
                return (
                  <PageLink
                    key={p}
                    params={params}
                    page={p}
                    label={String(p)}
                    active={p === page}
                  />
                );
              })}

              {page < totalPages && (
                <PageLink params={params} page={page + 1} label="Next →" />
              )}
              {page < totalPages && (
                <PageLink params={params} page={totalPages} label="Last" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PageLink({
  params,
  page,
  label,
  active = false,
}: {
  params: Record<string, string | undefined>;
  page: number;
  label: string;
  active?: boolean;
}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && k !== "page") qs.set(k, v);
  });
  qs.set("page", String(page));

  return (
    <Link
      href={`/records/full?${qs.toString()}`}
      className={
        active
          ? "rounded-md bg-[#4A6741] px-3 py-1.5 text-[13px] font-medium text-white"
          : "rounded-md border border-[#D8D3C4] bg-white px-3 py-1.5 text-[13px] hover:bg-[#F0EDE3]"
      }
    >
      {label}
    </Link>
  );
}