import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { restoreRecord } from "../actions";
import { DeleteButton } from "./DeleteButton";
import { PermanentDeleteButton } from "./PermanentDeleteButton";
import { EditModal } from "../EditModal";
import { StatusForm } from "./StatusForm";

// Date column → "March 11, 2026" (UTC so the day never shifts)
const fmtDate = (d: Date | null) =>
  d
    ? d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
    : null;

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await prisma.apprehensionRecord.findUnique({
    where: { id: parseInt(id, 10) },
    include: { cenroOffice: true, items: true, conveyances: true, equipment: true },
  });

  if (!record) notFound();

  const session = await getSession();
  const canEdit = session ? permissions.editSavedRecord(session.role as Role) : false;
  const isAdmin = session?.role === "ADMINISTRATOR";

  return (
    <div className="space-y-8">
      {record.isDeleted && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          This record was deleted. It is not counted in the dashboard or reports.
        </div>
      )}

      <div>
        <p className="text-[13px] text-[#5B6156]">
          {record.cenroOffice.name} &middot; {record.year}{record.month ? `-${String(record.month).padStart(2, "0")}` : ""}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {record.placeOfApprehension || record.dateOfApprehension || `Record #${record.id}`}
        </h1>
      </div>

      <div className="grid gap-8 sm:grid-cols-3">
        <div className="space-y-6 sm:col-span-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Date of apprehension" value={record.dateOfApprehension} />
            <Field label="Place of apprehension" value={record.placeOfApprehension} />
            <Field label="Place of the source of forest products" value={record.sourcePlace} />
            <Field label="GPS coordinates" value={record.gpsCoordinates} />
            <Field label="Land classification" value={record.landClassification} />
            <Field label="Apprehending officers" value={record.apprehendingAgency} />
            <Field label="Name of claimant/owner" value={record.claimantRespondent} />
            <Field label="Place impounded / custodian" value={record.custodianLocation} />
            <Field label="Other agencies involved" value={record.otherAgencies} />
          </div>

          <Field label="Circumstances" value={record.circumstances} multiline />

          <div>
            <h2 className="mb-2 text-[13px] font-medium text-[#5B6156]">Forest products</h2>
            <div className="overflow-x-auto rounded-lg border border-[#E9E5D8]">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <thead className="border-b border-[#E9E5D8] bg-[#FAFAF6] text-[13px] text-[#5B6156]">
                  <tr>
                    <th className="px-4 py-2 font-medium">Qty</th>
                    <th className="px-4 py-2 font-medium">Species</th>
                    <th className="px-4 py-2 font-medium">Forms</th>
                    <th className="px-4 py-2 font-medium">Volume (bd.ft.)</th>
                    <th className="px-4 py-2 font-medium">Volume (cu.m.)</th>
                    <th className="px-4 py-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {record.items.map((item) => (
                    <tr key={item.id} className="border-b border-[#F0EDE3] last:border-0">
                      <td className="px-4 py-2">{item.quantity || "—"}</td>
                      <td className="px-4 py-2">{item.species || "—"}</td>
                      <td className="px-4 py-2">{item.forms || item.description || "—"}</td>
                      <td className="px-4 py-2">{item.volumeBdFt ?? "—"}</td>
                      <td className="px-4 py-2">{item.volumeCuM ?? "—"}</td>
                      <td className="px-4 py-2">
                        {item.estimatedValue != null ? `₱${item.estimatedValue.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  ))}
                  {record.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-[#5B6156]">
                        No product items recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 text-[13px] font-medium text-[#5B6156]">Conveyances</h2>
              <ul className="rounded-lg border border-[#E9E5D8] divide-y divide-[#F0EDE3]">
                {record.conveyances.map((c) => (
                  <li key={c.id} className="px-4 py-2 text-[14px] flex justify-between gap-4">
                    <span>{c.type}</span>
                    <span className="text-[#5B6156] whitespace-nowrap">
                      x{c.quantity} · {c.estimatedValue != null ? `₱${c.estimatedValue.toLocaleString()}` : "—"}
                    </span>
                  </li>
                ))}
                {record.conveyances.length === 0 && (
                  <li className="px-4 py-3 text-[13px] text-[#5B6156]">None</li>
                )}
              </ul>
            </div>
            <div>
              <h2 className="mb-2 text-[13px] font-medium text-[#5B6156]">Equipment / tools</h2>
              <ul className="rounded-lg border border-[#E9E5D8] divide-y divide-[#F0EDE3]">
                {record.equipment.map((e) => (
                  <li key={e.id} className="px-4 py-2 text-[14px] flex justify-between gap-4">
                    <span>{e.type}</span>
                    <span className="text-[#5B6156] whitespace-nowrap">
                      x{e.quantity} · {e.estimatedValue != null ? `₱${e.estimatedValue.toLocaleString()}` : "—"}
                    </span>
                  </li>
                ))}
                {record.equipment.length === 0 && (
                  <li className="px-4 py-3 text-[13px] text-[#5B6156]">None</li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="ACP endorsed to PENRO" value={fmtDate(record.acpEndorsedToPenro)} />
            <Field label="ACP endorsed to RO" value={fmtDate(record.acpEndorsedToRo)} />
          </div>

          <Field label="Other remarks (condition, status of criminal complaint)" value={record.otherRemarks} multiline />
          <Field label="Remarks" value={record.remarks} multiline />
          <Field label="Case status (filed in court or prosecutor's office)" value={record.caseStatus} multiline />
        </div>

        <aside>
          {canEdit && record.isDeleted ? (
            <div className="space-y-4">
              <form action={restoreRecord}>
                <input type="hidden" name="id" value={record.id} />
                <button
                  type="submit"
                  className="w-full rounded-md bg-[#4A6741] px-4 py-2 text-[14px] text-white hover:bg-[#3D5636]"
                >
                  Restore record
                </button>
              </form>
              {isAdmin && <PermanentDeleteButton recordId={record.id} />}
            </div>
          ) : canEdit ? (
            <div className="space-y-4">
              <StatusForm
                recordId={record.id}
                status={record.status}
                docketNumber={record.docketNumber}
                orderOfFinalityDate={record.orderOfFinalityDate}
              />

              <EditModal
                recordId={record.id}
                label="Edit record details"
                className="block w-full rounded-md border border-[#D8D3C4] bg-white px-4 py-2 text-center text-[14px] hover:bg-[#F0EDE3]"
              />

              <DeleteButton recordId={record.id} />
            </div>
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

function Field({ label, value, multiline }: { label: string; value: string | null; multiline?: boolean }) {
  return (
    <div>
      <p className="text-[13px] font-medium text-[#5B6156]">{label}</p>
      <p className={`mt-0.5 text-[14px] ${multiline ? "whitespace-pre-wrap" : ""}`}>{value || "—"}</p>
    </div>
  );
}