// FILE: app/records/page.tsx  (replace the whole file)

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";
import { EditModal } from "./EditModal";

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
  searchParams: Promise<{
    q?: string;
    year?: string;
    office?: string;
    status?: string;
    deleted?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 25;

  const session = await getSession();
  const canEdit = session ? permissions.editSavedRecord(session.role as Role) : false;

  const offices = await prisma.cenroOffice.findMany({ orderBy: { name: "asc" } });

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
      include: { cenroOffice: true, items: true },
      orderBy: [{ year: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.apprehensionRecord.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
            <Link
              href="/records/full"
              className="rounded-md border border-[#D8D3C4] bg-white px-4 py-2 text-[14px] hover:bg-[#F0EDE3]"
            >
              Full view
            </Link>          
          <p className="mt-1 text-[15px] text-[#5B6156]">{total.toLocaleString()} apprehension records</p>
        </div>
      </div>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={params.q}
          placeholder="Search place, docket no., remarks..."
          className="w-64 rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[14px]"
        />
        <select
          name="year"
          defaultValue={params.year ?? ""}
          className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[14px]"
        >
          <option value="">All years</option>
          {Array.from({ length: 13 }, (_, i) => 2014 + i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          name="office"
          defaultValue={params.office ?? ""}
          className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[14px]"
        >
          <option value="">All offices</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[14px]"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          name="deleted"
          defaultValue={params.deleted ?? ""}
          className="rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[14px]"
        >
          <option value="">Active records</option>
          <option value="only">Deleted records</option>
          <option value="all">Active + deleted</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-[#4A6741] px-4 py-2 text-[14px] text-white hover:bg-[#3D5636]"
        >
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-[#E9E5D8] bg-white">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-[#E9E5D8] text-[13px] text-[#5B6156]">
            <tr>
              <th className="px-4 py-3 font-medium">Year</th>
              <th className="px-4 py-3 font-medium">Office</th>
              <th className="px-4 py-3 font-medium">Date / Place</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Docket No.</th>
              {canEdit && <th className="px-4 py-3 text-right font-medium">Action</th>}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-[#F0EDE3] last:border-0 hover:bg-[#FAFAF6]">
                <td className="px-4 py-3">{r.year}</td>
                <td className="px-4 py-3">{r.cenroOffice.name}</td>
                <td className="px-4 py-3">
                  <Link href={`/records/${r.id}`} className="text-[#4A6741] hover:underline">
                    {r.placeOfApprehension || r.dateOfApprehension || "—"}
                  </Link>
                  {r.isDeleted && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">
                      Deleted
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[#5B6156]">{r.items.length}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-[#5B6156]">{r.docketNumber || "—"}</td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    {r.isDeleted ? (
                      <span className="text-[13px] text-[#5B6156]">—</span>
                    ) : (
                      <EditModal recordId={r.id} />
                    )}
                  </td>
                )}
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-4 py-8 text-center text-[#5B6156]">
                  No records match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[14px] text-[#5B6156]">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && <PageLink params={params} page={page - 1} label="Previous" />}
            {page < totalPages && <PageLink params={params} page={page + 1} label="Next" />}
          </div>
        </div>
      )}
    </div>
  );
}

function PageLink({
  params,
  page,
  label,
}: {
  params: Record<string, string | undefined>;
  page: number;
  label: string;
}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && k !== "page") qs.set(k, v);
  });
  qs.set("page", String(page));
  return (
    <Link
      href={`/records?${qs.toString()}`}
      className="rounded-md border border-[#D8D3C4] bg-white px-3 py-1.5 hover:bg-[#F0EDE3]"
    >
      {label}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    FOR_RESOLUTION: "bg-amber-100 text-amber-800",
    UNDER_ADJUDICATION: "bg-blue-100 text-blue-800",
    CONFISCATED: "bg-[#E4EBE0] text-[#3D5636]",
    DONATED: "bg-purple-100 text-purple-800",
    RELEASED: "bg-gray-100 text-gray-800",
    UNKNOWN: "bg-red-100 text-red-800",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${colors[status] ?? "bg-gray-100"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
