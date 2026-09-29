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
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 25;

  const offices = await prisma.cenroOffice.findMany({ orderBy: { name: "asc" } });

  // The custom-field columns, in their saved order. Disabled fields are left out.
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All records — full view</h1>
          <p className="mt-1 text-[15px] text-[#5B6156]">
            Every field for {total.toLocaleString()} records, including empty ones.
          </p>
        </div>
        <Link
          href="/records"
          className="rounded-md border border-[#D8D3C4] bg-white px-4 py-2 text-[14px] hover:bg-[#F0EDE3]"
        >
          Back to summary view
        </Link>
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
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-[#E9E5D8] bg-[#FAFAF6] text-[12px] text-[#5B6156]">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 font-medium">ID</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">CENRO office</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Year</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Month</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Date of apprehension</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Place of apprehension</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Apprehending agency/s</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Claimant / respondent</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Circumstances</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Custodian / stockpile</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Other agencies</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Remarks</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Status</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Docket number</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Order of finality date</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Forest products</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Conveyances</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Equipment / tools</th>
              {fieldDefs.map((fd) => (
                <th key={fd.id} className="whitespace-nowrap px-3 py-2 font-medium">{fd.name}</th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 font-medium">Deleted</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const fvById = new Map(r.fieldValues.map((fv) => [fv.fieldDefinitionId, fv]));

              const productsText = r.items
                .map((it) => it.species || it.forms || it.description || "item")
                .join(", ");
              const conveyancesText = r.conveyances.map((c) => `${c.type} x${c.quantity}`).join(", ");
              const equipmentText = r.equipment.map((e) => `${e.type} x${e.quantity}`).join(", ");

              return (
                <tr key={r.id} className="border-b border-[#F0EDE3] last:border-0 hover:bg-[#FAFAF6]">
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link href={`/records/${r.id}`} className="text-[#4A6741] hover:underline">
                      {r.id}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.cenroOffice.name)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.year)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.month)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.dateOfApprehension)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.placeOfApprehension)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.apprehendingAgency)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.claimantRespondent)}</td>
                  <td className="max-w-[220px] px-3 py-2">{dash(r.circumstances)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.custodianLocation)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.otherAgencies)}</td>
                  <td className="max-w-[220px] px-3 py-2">{dash(r.remarks)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{STATUS_LABEL[r.status] ?? r.status}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.docketNumber)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{dash(r.orderOfFinalityDate)}</td>
                  <td className="max-w-[200px] px-3 py-2">{dash(productsText)}</td>
                  <td className="max-w-[200px] px-3 py-2">{dash(conveyancesText)}</td>
                  <td className="max-w-[200px] px-3 py-2">{dash(equipmentText)}</td>
                  {fieldDefs.map((fd) => {
                    const fv = fvById.get(fd.id);
                    const value = !fv ? null : fd.type === "NUMBER" ? fv.numberValue : fv.textValue;
                    return (
                      <td key={fd.id} className="whitespace-nowrap px-3 py-2">
                        {dash(value)}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-3 py-2">{r.isDeleted ? "Yes" : "No"}</td>
                </tr>
              );
            })}
            {records.length === 0 && (
              <tr>
                <td colSpan={18 + fieldDefs.length} className="px-4 py-8 text-center text-[#5B6156]">
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
      href={`/records/full?${qs.toString()}`}
      className="rounded-md border border-[#D8D3C4] bg-white px-3 py-1.5 hover:bg-[#F0EDE3]"
    >
      {label}
    </Link>
  );
}
