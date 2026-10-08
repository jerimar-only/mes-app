import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { restoreRecord } from "../actions";
import { DeleteButton } from "./DeleteButton";
import { PermanentDeleteButton } from "./PermanentDeleteButton";
import { EditModal } from "../EditModal";
import { StatusForm } from "./StatusForm";
import { BackButton } from "@/components/ui/BackButton";

const STATUS_LABEL: Record<string, string> = {
  FOR_RESOLUTION: "For resolution",
  UNDER_ADJUDICATION: "Under adjudication",
  CONFISCATED: "Confiscated",
  DONATED: "Donated",
  RELEASED: "Released",
  UNKNOWN: "Needs review",
};

const STATUS_STYLE: Record<string, string> = {
  FOR_RESOLUTION: "border-amber-200 bg-amber-50 text-amber-800",
  UNDER_ADJUDICATION: "border-blue-200 bg-blue-50 text-blue-800",
  CONFISCATED: "border-green-200 bg-green-50 text-green-800",
  DONATED: "border-purple-200 bg-purple-50 text-purple-800",
  RELEASED: "border-slate-200 bg-slate-50 text-slate-700",
  UNKNOWN: "border-gray-300 bg-gray-100 text-gray-700",
};

// Date column → "March 11, 2026" (UTC so the day never shifts)
const fmtDate = (d: Date | string | null) => {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

const num = (v: number | null | undefined, decimals = 2) =>
  v == null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: decimals });

const peso = (v: number | null | undefined) =>
  v == null
    ? "—"
    : `₱${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  const totalBdFt = record.items.reduce((s, i) => s + (i.volumeBdFt ?? 0), 0);
  const totalCuM = record.items.reduce((s, i) => s + (i.volumeCuM ?? 0), 0);
  const totalValue = record.items.reduce((s, i) => s + (i.estimatedValue ?? 0), 0);

  return (
    <div className="space-y-6">
      <BackButton />

      {record.isDeleted && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          This record was deleted. It is not counted in the dashboard or reports.
        </div>
      )}

      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#5B6156]">
          <span className="rounded-full border border-[#E9E5D8] bg-white px-2.5 py-0.5 font-medium">
            {record.cenroOffice.name}
          </span>
          <span>
            {record.year}
            {record.month ? `-${String(record.month).padStart(2, "0")}` : ""}
          </span>
          <span className="text-[#C9C4B3]">•</span>
          <span>Record #{record.id}</span>
          <span
            className={`ml-auto rounded-full border px-3 py-0.5 text-[12px] font-semibold ${
              STATUS_STYLE[record.status] ?? STATUS_STYLE.UNKNOWN
            }`}
          >
            {STATUS_LABEL[record.status] ?? record.status}
          </span>
        </div>
        <h1 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">
          {record.placeOfApprehension || record.dateOfApprehension || `Record #${record.id}`}
        </h1>
        {record.docketNumber && (
          <p className="text-[13px] text-[#5B6156]">Docket no. {record.docketNumber}</p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        {/* ---------- Main column ---------- */}
        <div className="space-y-6 lg:col-span-2">
          {/* Key figures */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Products" value={String(record.items.length)} />
            <Stat label="Volume (bd.ft.)" value={num(totalBdFt)} />
            <Stat label="Volume (cu.m.)" value={num(totalCuM)} />
            <Stat label="Products value" value={peso(totalValue || null)} />
          </div>

          <Card title="Incident details">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Date of apprehension" value={record.dateOfApprehension} />
              <Field label="Place of apprehension" value={record.placeOfApprehension} />
              <Field label="Place of the source of forest products" value={record.sourcePlace} />
              <Field label="GPS coordinates" value={record.gpsCoordinates} />
              <Field label="Land classification" value={record.landClassification} />
              <Field label="Place impounded / custodian" value={record.custodianLocation} />
            </div>
            <div className="mt-4">
              <Field label="Circumstances" value={record.circumstances} multiline />
            </div>
          </Card>

          <Card title="Parties involved">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Apprehending officers" value={record.apprehendingAgency} />
              <Field label="Name of claimant/owner" value={record.claimantRespondent} />
              <Field label="Other agencies involved" value={record.otherAgencies} />
            </div>
          </Card>

          <Card title="Forest products">
            {record.items.length === 0 ? (
              <p className="text-[14px] text-[#5B6156]">No product items recorded.</p>
            ) : (
              <>
                {/* Table: tablets and desktops */}
                <div className="hidden overflow-x-auto rounded-lg border border-[#E9E5D8] md:block">
                  <table className="w-full text-left text-[14px]">
                    <thead className="border-b border-[#E9E5D8] bg-[#FAFAF6] text-[13px] text-[#5B6156]">
                      <tr>
                        <th className="px-4 py-2 font-medium">Qty</th>
                        <th className="px-4 py-2 font-medium">Species</th>
                        <th className="px-4 py-2 font-medium">Forms</th>
                        <th className="px-4 py-2 text-right font-medium">bd.ft.</th>
                        <th className="px-4 py-2 text-right font-medium">cu.m.</th>
                        <th className="px-4 py-2 text-right font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.items.map((item) => (
                        <tr key={item.id} className="border-b border-[#F0EDE3] last:border-0">
                          <td className="px-4 py-2">{item.quantity || "—"}</td>
                          <td className="px-4 py-2">{item.species || "—"}</td>
                          <td className="px-4 py-2">{item.forms || item.description || "—"}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{num(item.volumeBdFt)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{num(item.volumeCuM)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{peso(item.estimatedValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {record.items.length > 1 && (
                      <tfoot className="border-t border-[#E9E5D8] bg-[#FAFAF6] font-semibold">
                        <tr>
                          <td className="px-4 py-2" colSpan={3}>
                            Total
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{num(totalBdFt)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{num(totalCuM)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{peso(totalValue)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Cards: phones */}
                <div className="space-y-3 md:hidden">
                  {record.items.map((item) => (
                    <div key={item.id} className="rounded-lg border border-[#E9E5D8] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="break-words font-medium">
                          {item.species || item.forms || item.description || "Item"}
                        </p>
                        {item.quantity && (
                          <span className="shrink-0 rounded-full bg-[#F0EDE3] px-2 py-0.5 text-[12px] text-[#5B6156]">
                            Qty {item.quantity}
                          </span>
                        )}
                      </div>
                      {item.species && (item.forms || item.description) && (
                        <p className="mt-0.5 text-[13px] text-[#5B6156]">
                          {item.forms || item.description}
                        </p>
                      )}
                      <dl className="mt-2 grid grid-cols-3 gap-2 text-[13px]">
                        <MiniStat label="bd.ft." value={num(item.volumeBdFt)} />
                        <MiniStat label="cu.m." value={num(item.volumeCuM)} />
                        <MiniStat label="Value" value={peso(item.estimatedValue)} />
                      </dl>
                    </div>
                  ))}
                  {record.items.length > 1 && (
                    <div className="rounded-lg bg-[#FAFAF6] p-3 text-[13px] font-semibold">
                      <div className="flex justify-between">
                        <span>Total</span>
                        <span className="tabular-nums">
                          {num(totalBdFt)} bd.ft. · {peso(totalValue)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Conveyances">
              <PairList rows={record.conveyances} />
            </Card>
            <Card title="Equipment / tools">
              <PairList rows={record.equipment} />
            </Card>
          </div>

          <Card title="Endorsement and case status">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="ACP endorsed to PENRO" value={fmtDate(record.acpEndorsedToPenro)} />
              <Field label="ACP endorsed to RO" value={fmtDate(record.acpEndorsedToRo)} />
              <Field label="Order of finality date" value={record.orderOfFinalityDate} />
            </div>
            <div className="mt-4 space-y-4">
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
          </Card>
        </div>

        {/* ---------- Action panel (stays in view on wide screens) ---------- */}
        <aside className="lg:sticky lg:top-6">
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

/* ---------- Small building blocks ---------- */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E9E5D8] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-[15px] font-semibold text-[#2F3A2B]">{title}</h2>
      {children}
    </section>
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
    <div className="min-w-0">
      <p className="text-[12px] font-medium uppercase tracking-wide text-[#5B6156]">{label}</p>
      <p
        className={`mt-1 break-words text-[14px] leading-relaxed ${
          multiline ? "whitespace-pre-wrap" : ""
        } ${value ? "" : "text-[#9A9A8A]"}`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E9E5D8] bg-white p-3 shadow-sm sm:p-4">
      <p className="text-[12px] font-medium text-[#5B6156]">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-[#5B6156]">{label}</dt>
      <dd className="mt-0.5 break-words tabular-nums">{value}</dd>
    </div>
  );
}

function PairList({
  rows,
}: {
  rows: { id: number; type: string | null; quantity: number; estimatedValue: number | null }[];
}) {
  if (rows.length === 0) return <p className="text-[14px] text-[#5B6156]">None</p>;
  return (
    <ul className="divide-y divide-[#F0EDE3] rounded-lg border border-[#E9E5D8]">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-[14px]">
          <span className="min-w-0 break-words font-medium">{r.type || "—"}</span>
          <span className="shrink-0 text-[13px] text-[#5B6156]">
            ×{r.quantity} · {peso(r.estimatedValue)}
          </span>
        </li>
      ))}
    </ul>
  );
}