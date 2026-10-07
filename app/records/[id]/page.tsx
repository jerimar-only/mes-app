import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { restoreRecord } from "../actions";
import { DeleteButton } from "./DeleteButton";
import { PermanentDeleteButton } from "./PermanentDeleteButton";
import { EditModal } from "../EditModal";
import { StatusForm } from "./StatusForm";

// Date → "March 11, 2026" (UTC so the day never shifts)
const fmtDate = (d: Date | null) =>
  d
    ? d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await prisma.apprehensionRecord.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      cenroOffice: true,
      items: true,
      conveyances: true,
      equipment: true,
    },
  });

  if (!record) notFound();

  const session = await getSession();
  const canEdit = session
    ? permissions.editSavedRecord(session.role as Role)
    : false;
  const isAdmin = session?.role === "ADMINISTRATOR";

  const Actions = (
    <>
      {canEdit && record.isDeleted ? (
        <div className="space-y-3">
          <form action={restoreRecord}>
            <input type="hidden" name="id" value={record.id} />
            <button
              type="submit"
              className="w-full rounded-md bg-[#4A6741] px-4 py-2.5 text-[14px] font-medium text-white hover:bg-[#3D5636]"
            >
              Restore record
            </button>
          </form>
          {isAdmin && <PermanentDeleteButton recordId={record.id} />}
        </div>
      ) : canEdit ? (
        <div className="space-y-3">
          <StatusForm
            recordId={record.id}
            status={record.status}
            docketNumber={record.docketNumber}
            orderOfFinalityDate={record.orderOfFinalityDate}
          />

          <EditModal
            recordId={record.id}
            label="Edit record details"
            className="block w-full rounded-md border border-[#D8D3C4] bg-white px-4 py-2.5 text-center text-[14px] hover:bg-[#F0EDE3]"
          />

          <DeleteButton recordId={record.id} />
        </div>
      ) : (
        <div className="rounded-lg border border-[#E9E5D8] bg-white p-4 text-[14px] text-[#5B6156]">
          Only administrators can edit saved records.
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6 pb-10">
      {record.isDeleted && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          This record was deleted. It is not counted in the dashboard or
          reports.
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-[13px] text-[#5B6156]">
          {record.cenroOffice.name} &middot; {record.year}
          {record.month ? `-${String(record.month).padStart(2, "0")}` : ""}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
          {record.placeOfApprehension ||
            fmtDate(record.dateOfApprehension) ||
            `Record #${record.id}`}
        </h1>
      </div>

      {/* Mobile actions (shown only on small screens) */}
      <div className="sm:hidden">{Actions}</div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Key fields – 1 col mobile, 2 col tablet+ */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Date of apprehension"
              value={fmtDate(record.dateOfApprehension)}
            />
            <Field
              label="Place of apprehension"
              value={record.placeOfApprehension}
            />
            <Field
              label="Place of the source of forest products"
              value={record.sourcePlace}
            />
            <Field label="GPS coordinates" value={record.gpsCoordinates} />
            <Field
              label="Land classification"
              value={record.landClassification}
            />
            <Field
              label="Apprehending officers"
              value={record.apprehendingAgency}
            />
            <Field
              label="Name of claimant/owner"
              value={record.claimantRespondent}
            />
            <Field
              label="Place impounded / custodian"
              value={record.custodianLocation}
            />
            <Field
              label="Other agencies involved"
              value={record.otherAgencies}
            />
          </div>

          <Field
            label="Circumstances"
            value={record.circumstances}
            multiline
          />

          {/* Forest products – cards on mobile, table on sm+ */}
          <div>
            <h2 className="mb-2 text-[13px] font-medium text-[#5B6156]">
              Forest products
            </h2>

            {/* Mobile cards */}
            <div className="space-y-3 sm:hidden">
              {record.items.length === 0 ? (
                <p className="rounded-lg border border-[#E9E5D8] px-4 py-3 text-[13px] text-[#5B6156]">
                  No product items recorded.
                </p>
              ) : (
                record.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[#E9E5D8] bg-white p-4 text-[14px]"
                  >
                    <div className="font-medium">
                      {item.forms || item.description || "—"}
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-[#5B6156]">
                      <span>Qty: {item.quantity || "—"}</span>
                      <span>Species: {item.species || "—"}</span>
                      <span>Vol (bd.ft.): {item.volumeBdFt ?? "—"}</span>
                      <span>Vol (cu.m.): {item.volumeCuM ?? "—"}</span>
                      <span className="col-span-2">
                        Value:{" "}
                        {item.estimatedValue != null
                          ? `₱${item.estimatedValue.toLocaleString()}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-lg border border-[#E9E5D8] sm:block">
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
                    <tr
                      key={item.id}
                      className="border-b border-[#F0EDE3] last:border-0"
                    >
                      <td className="px-4 py-2">{item.quantity || "—"}</td>
                      <td className="px-4 py-2">{item.species || "—"}</td>
                      <td className="px-4 py-2">
                        {item.forms || item.description || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {item.volumeBdFt ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        {item.volumeCuM ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        {item.estimatedValue != null
                          ? `₱${item.estimatedValue.toLocaleString()}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {record.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-4 text-center text-[#5B6156]"
                      >
                        No product items recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conveyances + Equipment */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 text-[13px] font-medium text-[#5B6156]">
                Conveyances
              </h2>
              <ul className="rounded-lg border border-[#E9E5D8] divide-y divide-[#F0EDE3]">
                {record.conveyances.map((c) => (
                  <li
                    key={c.id}
                    className="flex justify-between gap-4 px-4 py-2.5 text-[14px]"
                  >
                    <span>{c.type}</span>
                    <span className="whitespace-nowrap text-[#5B6156]">
                      x{c.quantity} ·{" "}
                      {c.estimatedValue != null
                        ? `₱${c.estimatedValue.toLocaleString()}`
                        : "—"}
                    </span>
                  </li>
                ))}
                {record.conveyances.length === 0 && (
                  <li className="px-4 py-3 text-[13px] text-[#5B6156]">
                    None
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-[13px] font-medium text-[#5B6156]">
                Equipment / tools
              </h2>
              <ul className="rounded-lg border border-[#E9E5D8] divide-y divide-[#F0EDE3]">
                {record.equipment.map((e) => (
                  <li
                    key={e.id}
                    className="flex justify-between gap-4 px-4 py-2.5 text-[14px]"
                  >
                    <span>{e.type}</span>
                    <span className="whitespace-nowrap text-[#5B6156]">
                      x{e.quantity} ·{" "}
                      {e.estimatedValue != null
                        ? `₱${e.estimatedValue.toLocaleString()}`
                        : "—"}
                    </span>
                  </li>
                ))}
                {record.equipment.length === 0 && (
                  <li className="px-4 py-3 text-[13px] text-[#5B6156]">
                    None
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="ACP endorsed to PENRO"
              value={fmtDate(record.acpEndorsedToPenro)}
            />
            <Field
              label="ACP endorsed to RO"
              value={fmtDate(record.acpEndorsedToRo)}
            />
          </div>

          <Field
            label="Other remarks (condition, status of criminal complaint)"
            value={record.otherRemarks}
            multiline
          />
          <Field label="Remarks" value={record.remarks} multiline />
          <Field
            label="Case status (filed in court or prosecutor's office)"
            value={record.caseStatus}
            multiline
          />
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden sm:block">
          <div className="sticky top-6 space-y-4">{Actions}</div>
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
      <p
        className={`mt-0.5 text-[14px] ${
          multiline ? "whitespace-pre-wrap" : ""
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}
