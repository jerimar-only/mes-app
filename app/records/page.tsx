import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RecordsClient from "./RecordsClient";

const STATUS_LABEL: Record<string, string> = {
  FOR_RESOLUTION: "For resolution",
  UNDER_ADJUDICATION: "Under adjudication",
  CONFISCATED: "Confiscated",
  DONATED: "Donated",
  RELEASED: "Released",
  UNKNOWN: "Needs review",
};

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const offices = await prisma.cenroOffice.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Loading with live progress
          </p>
        </div>
        <Link
          href="/records/full"
          className="inline-flex shrink-0 items-center rounded-md border border-gray-200 bg-white px-4 py-2 text-[14px] font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          Full view →
        </Link>
      </div>

        {/* Filters */}
        <form
          method="get"
          className="grid grid-cols-2 gap-2.5 rounded-lg border border-[#E9E5D8] bg-[#FAFAF6] p-3 sm:flex sm:flex-wrap sm:items-end"
        >
          <div className="col-span-2 min-w-0 sm:min-w-[200px] sm:flex-1">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#5B6156]">
              Search
            </label>
            <input
              type="text"
              name="q"
              defaultValue={params.q}
              placeholder="Place, claimant, docket, remarks…"
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
              className="w-full rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[13px]"
            >
              <option value="">All</option>
              {Array.from({ length: 13 }, (_, i) => 2014 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
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
              className="w-full rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[13px]"
            >
              <option value="">All</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
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
              className="w-full rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[13px]"
            >
              <option value="">All</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
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
              className="w-full rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[13px]"
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
              className="w-full rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[13px]"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">All (max 500)</option>
            </select>
          </div>

          <div className="col-span-2 sm:col-span-1 sm:self-end">
            <button
              type="submit"
              className="w-full rounded-md bg-[#4A6741] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3D5636] sm:w-auto"
            >
              Apply
            </button>
          </div>
        </form>

      {/* Progressive loading table */}
      <RecordsClient initialQuery={params} />
    </div>
  );
}