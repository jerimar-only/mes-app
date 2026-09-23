import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { updateRecordStatus } from "../actions";

const STATUS_OPTIONS = [
  ["FOR_RESOLUTION", "For resolution"],
  ["UNDER_ADJUDICATION", "Under adjudication"],
  ["CONFISCATED", "Confiscated"],
  ["DONATED", "Donated"],
  ["RELEASED", "Released"],
  ["UNKNOWN", "Needs review"],
] as const;

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await prisma.apprehensionRecord.findUnique({
    where: { id: parseInt(id, 10) },
    include: { cenroOffice: true, items: true },
  });

  if (!record) notFound();

  const session = await getSession();
  const canEdit = session ? permissions.editSavedRecord(session.role as Role) : false;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[13px] text-[#5B6156]">
          {record.cenroOffice.name} &middot; {record.year}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {record.placeOfApprehension || record.dateOfApprehension || `Record #${record.id}`}
        </h1>
      </div>

      <div className="grid gap-8 sm:grid-cols-3">
        <div className="space-y-6 sm:col-span-2">
          <Field label="Date of apprehension" value={record.dateOfApprehension} />
          <Field label="Place of apprehension" value={record.placeOfApprehension} />
          <Field label="Circumstances" value={record.circumstances} />
          <Field label="Custodian / stockpile location" value={record.custodianLocation} />
          <Field label="Other agencies involved" value={record.otherAgencies} />
          <Field label="Conveyance / equipment" value={record.conveyanceEquipment} />
          <Field label="Remarks (original)" value={record.remarks} multiline />

          <div>
            <h2 className="mb-2 text-[13px] font-medium text-[#5B6156]">Forest product items</h2>
            <div className="overflow-hidden rounded-lg border border-[#E9E5D8]">
              <table className="w-full text-left text-[14px]">
                <thead className="border-b border-[#E9E5D8] bg-[#FAFAF6] text-[13px] text-[#5B6156]">
                  <tr>
                    <th className="px-4 py-2 font-medium">Description</th>
                    <th className="px-4 py-2 font-medium">Volume (cu.m.)</th>
                    <th className="px-4 py-2 font-medium">Est. value (₱)</th>
                  </tr>
                </thead>
                <tbody>
                  {record.items.map((item) => (
                    <tr key={item.id} className="border-b border-[#F0EDE3] last:border-0">
                      <td className="px-4 py-2">{item.description || "—"}</td>
                      <td className="px-4 py-2">{item.volumeCuM ?? "—"}</td>
                      <td className="px-4 py-2">{item.estimatedValue?.toLocaleString() ?? "—"}</td>
                    </tr>
                  ))}
                  {record.items.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-[#5B6156]">
                        No line items recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside>
          {canEdit ? (
            <form action={updateRecordStatus} className="space-y-4 rounded-lg border border-[#E9E5D8] bg-white p-4">
              <input type="hidden" name="id" value={record.id} />
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Status</label>
                <select
                  name="status"
                  defaultValue={record.status}
                  className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
                >
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Docket number</label>
                <input
                  type="text"
                  name="docketNumber"
                  defaultValue={record.docketNumber ?? ""}
                  placeholder="e.g. R2-F-1105"
                  className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Order of finality date</label>
                <input
                  type="text"
                  name="orderOfFinalityDate"
                  defaultValue={record.orderOfFinalityDate ?? ""}
                  placeholder="e.g. Sept. 04, 2024"
                  className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-[#4A6741] px-4 py-2 text-[14px] text-white hover:bg-[#3D5636]"
              >
                Save changes
              </button>
            </form>
          ) : (
            <div className="rounded-lg border border-[#E9E5D8] bg-white p-4 text-[14px] text-[#5B6156]">
              Only administrators can edit saved records.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-[13px] font-medium text-[#5B6156]">{label}</p>
      <p className={`mt-0.5 text-[14px] ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}
