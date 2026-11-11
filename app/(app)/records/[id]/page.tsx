import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOfficeScope, canAccessOffice } from "@/lib/officeScope";
import { permissions, type Role } from "@/lib/permissions";
import { restoreRecord } from "../actions";
import { DeleteButton } from "./DeleteButton";
import { PermanentDeleteButton } from "./PermanentDeleteButton";
import { EditModal } from "../EditModal";
import { StatusForm } from "./StatusForm";
import { BackButton } from "@/components/ui/BackButton";

const STATUS_LABEL: Record<string, string> = {
  FOR_RESOLUTION: "For Donation",
  UNDER_ADJUDICATION: "For Appraisal",
  CONFISCATED: "Donated",
  DONATED: "Donated",
  RELEASED: "Donated",
  UNKNOWN: "For Appraisal",
};

const STATUS_STYLE: Record<string, string> = {
  FOR_RESOLUTION: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  UNDER_ADJUDICATION: "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300",
  CONFISCATED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  DONATED: "border-purple-500/30 bg-purple-500/10 text-purple-800 dark:text-purple-300",
  RELEASED: "border-[var(--border)] bg-[var(--shell)] text-[var(--foreground)]",
  UNKNOWN: "border-[var(--border)] bg-[var(--shell)] text-[var(--muted)]",
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

const yn = (v: boolean | null | undefined) =>
  v === true ? "Yes" : v === false ? "No" : null;

const CONDITION_LABEL: Record<string, string> = {
  GOOD_CONDITION: "Good condition",
  DETERIORATING: "Deteriorating",
  DETERIORATED: "Deteriorated",
};

const SERVICE_LABEL: Record<string, string> = {
  SERVICEABLE: "Serviceable",
  UNSERVICEABLE: "Unserviceable",
};

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recordId = parseInt(id, 10);
  if (!Number.isFinite(recordId) || recordId <= 0) notFound();

  const record = await prisma.apprehensionRecord.findUnique({
    where: { id: recordId },
    include: { cenroOffice: true, items: true, conveyances: true, equipment: true },
  });

  if (!record) notFound();

  // Records of offices outside the user's area behave as "not found"
  const scope = await getOfficeScope();
  if (!canAccessOffice(scope, record.cenroOfficeId)) notFound();

  const session = await getSession();
  const canEdit = session ? permissions.editSavedRecord(session.role as Role) : false;
  const canSoftDelete = session ? permissions.softDeleteRecord(session.role as Role) : false;
  const canPermanentDelete = session
    ? permissions.permanentDeleteRecord(session.role as Role)
    : false;

  const totalBdFt = record.items.reduce((s, i) => s + (i.volumeBdFt ?? 0), 0);
  const totalCuM = record.items.reduce((s, i) => s + (i.volumeCuM ?? 0), 0);
  const totalValue = record.items.reduce((s, i) => s + (i.estimatedValue ?? 0), 0);

  return (
    <div className="space-y-6">
      <BackButton />

      {record.isDeleted && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-800 dark:text-red-300">
          This record was deleted. It is not counted in the dashboard or reports.
        </div>
      )}

      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--muted)]">
          <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-0.5 font-medium text-[var(--foreground)]">
            {record.cenroOffice.name}
          </span>
          <span>
            {record.year}
            {record.month ? `-${String(record.month).padStart(2, "0")}` : ""}
          </span>
          <span className="text-[var(--muted)]">•</span>
          <span>Record #{record.id}</span>
          <span
            className={`ml-auto rounded-full border px-3 py-0.5 text-[12px] font-semibold ${
              STATUS_STYLE[record.status] ?? STATUS_STYLE.UNKNOWN
            }`}
          >
            {STATUS_LABEL[record.status] ?? record.status}
          </span>
        </div>
        <h1 className="break-words text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
          {record.placeOfApprehension || record.dateOfApprehension || `Record #${record.id}`}
        </h1>
        {record.docketNumber && (
          <p className="text-[13px] text-[var(--muted)]">Docket no. {record.docketNumber}</p>
        )}
        {!record.isDeleted && (
          <p className="pt-1">
            <a
              href={`/receipt/${record.id}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9V2h12v7" />
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <path d="M6 14h12v8H6z" />
              </svg>
              Print apprehension receipt
            </a>
          </p>
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

          <Card title="Office concerned">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="PENRO office" value={record.penroOffice} />
              <Field label="PENRO officer" value={record.penroOfficer} />
              <Field label="CENRO office" value={record.cenroOffice?.name} />
              <Field label="CENRO officer" value={record.cenroOfficer} />
            </div>
          </Card>

          <Card title="Incident details">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Date of apprehension" value={record.dateOfApprehension} />
              <Field label="Time of apprehension" value={record.timeOfApprehension} />
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
              <Field label="Apprehending agency" value={record.apprehendingAgency} />
              <Field label="Apprehending officer" value={record.apprehendingOfficer} />
              <Field label="Respondent / claimant present?" value={yn(record.hasRespondent)} />
              <Field label="Name of claimant / respondent" value={record.claimantRespondent} />
              <Field label="Respondent contact" value={record.respondentContact} />
              <Field label="Respondent address" value={record.respondentAddress} />
              <Field label="Other agencies involved" value={record.otherAgencies} />
            </div>
          </Card>

          <Card title="Forest products">
            {record.items.length === 0 ? (
              <p className="text-[14px] text-[var(--muted)]">No product items recorded.</p>
            ) : (
              <>
                {/* Table: tablets and desktops */}
                <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700 md:block">
                  <table className="w-full text-left text-[14px]">
                    <thead className="border-b border-[var(--border)] bg-[var(--accent)] text-[13px] font-semibold text-white">
                      <tr>
                        <th className="px-4 py-2 font-medium">Type</th>
                        <th className="px-4 py-2 font-medium">Species</th>
                        <th className="px-4 py-2 font-medium">Qty</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 text-right font-medium">bd.ft.</th>
                        <th className="px-4 py-2 text-right font-medium">cu.m.</th>
                        <th className="px-4 py-2 text-right font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.items.map((item) => (
                        <tr key={item.id} className="border-b border-zinc-100 text-zinc-900 last:border-0 dark:border-zinc-800 dark:text-zinc-100">
                          <td className="px-4 py-2">{item.type || item.forms || "—"}</td>
                          <td className="px-4 py-2">{item.species || "—"}</td>
                          <td className="px-4 py-2">{item.quantity || "—"}</td>
                          <td className="px-4 py-2">
                            {CONDITION_LABEL[item.conditionStatus ?? ""] || item.conditionStatus || "—"}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{num(item.volumeBdFt)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{num(item.volumeCuM)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{peso(item.estimatedValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {record.items.length > 1 && (
                      <tfoot className="border-t border-zinc-200 bg-zinc-50 font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                        <tr>
                          <td className="px-4 py-2" colSpan={4}>
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
                    <div key={item.id} className="rounded-lg border border-[var(--border)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="break-words font-medium">
                          {item.type || item.forms || item.description || "Item"}
                          {item.species ? ` — ${item.species}` : ""}
                        </p>
                        {item.quantity && (
                          <span className="shrink-0 rounded-full bg-[var(--shell)] px-2 py-0.5 text-[12px] text-[var(--muted)]">
                            Qty {item.quantity}
                          </span>
                        )}
                      </div>
                      {(item.conditionStatus || item.forms || item.description) && (
                        <p className="mt-0.5 text-[13px] text-[var(--muted)]">
                          {CONDITION_LABEL[item.conditionStatus ?? ""] || item.conditionStatus || item.forms || item.description}
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
                    <div className="rounded-lg bg-[var(--shell)] p-3 text-[13px] font-semibold">
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
              {record.conveyances.length === 0 ? (
                <p className="text-[14px] text-[var(--muted)]">None</p>
              ) : (
                <ul className="divide-y divide-[var(--shell)] rounded-lg border border-[var(--border)]">
                  {record.conveyances.map((c) => (
                    <li key={c.id} className="space-y-1 px-4 py-2.5 text-[14px]">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                        <span className="min-w-0 break-words font-medium text-[var(--foreground)]">
                          {c.type || "—"}
                        </span>
                        <span className="shrink-0 text-[13px] text-[var(--muted)]">
                          {SERVICE_LABEL[c.serviceStatus ?? ""] || c.serviceStatus || "—"}
                        </span>
                      </div>
                      {c.plateNo && (
                        <p className="text-[13px] text-[var(--muted)]">Plate no. {c.plateNo}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Equipment / implements">
              {record.equipment.length === 0 ? (
                <p className="text-[14px] text-[var(--muted)]">None</p>
              ) : (
                <ul className="divide-y divide-[var(--shell)] rounded-lg border border-[var(--border)]">
                  {record.equipment.map((e) => (
                    <li key={e.id} className="space-y-1 px-4 py-2.5 text-[14px]">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                        <span className="min-w-0 break-words font-medium text-[var(--foreground)]">
                          {e.type || "—"}
                        </span>
                        <span className="shrink-0 text-[13px] text-[var(--muted)]">
                          {SERVICE_LABEL[e.serviceStatus ?? ""] || e.serviceStatus || "—"}
                        </span>
                      </div>
                      <p className="text-[13px] text-[var(--muted)]">
                        Registered:{" "}
                        {e.registered === true ? "Yes" : e.registered === false ? "No" : "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Administrative Confiscation Proceeding">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="ACP conducted?" value={yn(record.acpConducted)} />
              <Field label="Date of ACP" value={fmtDate(record.acpDate)} />
              <Field label="ACP endorsed to PENRO" value={fmtDate(record.acpEndorsedToPenro)} />
              <Field label="ACP endorsed to RO" value={fmtDate(record.acpEndorsedToRo)} />
            </div>
          </Card>

          <Card title="Promulgation, docket & finality">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Date of promulgation" value={record.dateOfPromulgation} />
              <Field label="Promulgated by" value={record.promulgatedBy} />
              <Field label="Docket no." value={record.docketNumber} />
              <Field label="Order of finality date" value={record.orderOfFinalityDate} />
            </div>
          </Card>

          <Card title="Appraisal conducted">
            <div className="space-y-4">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Forest products" value={yn(record.appraisalForestProducts)} />
                <Field
                  label="Date of appraisal (forest products)"
                  value={fmtDate(record.appraisalForestProductsDate)}
                />
                <Field label="Conveyances" value={yn(record.appraisalConveyances)} />
                <Field
                  label="Date of appraisal (conveyances)"
                  value={fmtDate(record.appraisalConveyancesDate)}
                />
                <Field label="Equipment / implements" value={yn(record.appraisalEquipment)} />
                <Field
                  label="Date of appraisal (equipment)"
                  value={fmtDate(record.appraisalEquipmentDate)}
                />
                <DocLink label="Appraisal report" href={record.appraisalReportUrl} />
              </div>
            </div>
          </Card>

          <Card title="Donation">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Donation made?" value={yn(record.donationMade)} />
              <Field label="Forest products — date" value={record.donationFpDate} />
              <Field label="Forest products — donor" value={record.donationFpDonor} />
              <Field label="Forest products — donee" value={record.donationFpDonee} />
              <Field label="Forest products — volume" value={record.donationFpVolume} />
              <Field label="Conveyances — date" value={record.donationConvDate} />
              <Field label="Conveyances — donor" value={record.donationConvDonor} />
              <Field label="Conveyances — donee" value={record.donationConvDonee} />
              <Field label="Equipment — date" value={record.donationEquipDate} />
              <Field label="Equipment — donor" value={record.donationEquipDonor} />
              <Field label="Equipment — donee" value={record.donationEquipDonee} />
              <DocLink label="Deed of donation" href={record.deedOfDonationUrl} />
              <DocLink label="Terminal report" href={record.terminalReportUrl} />
            </div>
          </Card>

          <Card title="Notes & case status">
            <div className="space-y-4">
              <Field
                label="Other remarks (condition, status of criminal complaint)"
                value={record.otherRemarks}
                multiline
              />
              <Field label="Remarks / additional notes" value={record.remarks} multiline />
              <Field
                label="Case status (filed in court or prosecutor's office)"
                value={record.caseStatus}
                multiline
              />
              <div>
                <p className="mb-1 text-[12.5px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  Case documents (Google Drive)
                </p>
                {record.caseDocumentsUrl ? (
                  <a
                    href={record.caseDocumentsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                  >
                    Open in Google Drive
                  </a>
                ) : (
                  <p className="text-[14px] text-[var(--muted)]">—</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ---------- Action panel (stays in view on wide screens) ---------- */}
        <aside className="lg:sticky lg:top-6">
          {record.isDeleted ? (
            <div className="space-y-4">
              {canSoftDelete && (
                <form action={restoreRecord}>
                  <input type="hidden" name="id" value={record.id} />
                  <button
                    type="submit"
                    className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-[14px] text-white hover:bg-[var(--accent-hover)]"
                  >
                    Restore record
                  </button>
                </form>
              )}
              {/* Permanent delete: Super Admin only, and only after soft-delete */}
              {canPermanentDelete && (
                <PermanentDeleteButton
                  recordId={record.id}
                  redirectTo="/records?deleted=only"
                />
              )}
              {!canSoftDelete && !canPermanentDelete && (
                <p className="text-[13px] text-[var(--muted)]">
                  This record is deleted. Contact an administrator to restore it.
                </p>
              )}
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
                className="block w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-center text-[14px] font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              />

              <a
                href={`/receipt/${record.id}`}
                className="block w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-center text-[14px] font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Print apprehension receipt
              </a>

              {/* Soft delete: Administrator + Super Admin. Permanent delete is only on deleted records. */}
              {canSoftDelete && <DeleteButton recordId={record.id} />}
            </div>
          ) : (
            <div className="space-y-4">
              <a
                href={`/receipt/${record.id}`}
                className="block w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-center text-[14px] font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Print apprehension receipt
              </a>
              <div className="dash-panel p-4 text-[14px] text-[var(--muted)]">
                Only administrators can edit saved records.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ---------- Small building blocks ---------- */

function DocLink({ label, href }: { label: string; href?: string | null }) {
  return (
    <div>
      <p className="mb-1 text-[12.5px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14px] font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          Open in Google Drive
        </a>
      ) : (
        <p className="text-[14px] text-[var(--muted)]">—</p>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm sm:p-5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
      <h2 className="mb-4 text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
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
      <p className="text-[12px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p
        className={`mt-1 break-words text-[14px] leading-relaxed ${
          multiline ? "whitespace-pre-wrap" : ""
        } ${
          value
            ? "text-zinc-900 dark:text-zinc-100"
            : "text-zinc-400 dark:text-zinc-500"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-zinc-900 shadow-sm sm:p-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
      <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 break-words tabular-nums">{value}</dd>
    </div>
  );
}

function PairList({
  rows,
}: {
  rows: { id: number; type: string | null; quantity: number; estimatedValue: number | null }[];
}) {
  if (rows.length === 0) return <p className="text-[14px] text-[var(--muted)]">None</p>;
  return (
    <ul className="divide-y divide-[var(--shell)] rounded-lg border border-[var(--border)]">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-[14px]">
          <span className="min-w-0 break-words font-medium text-[var(--foreground)]">{r.type || "—"}</span>
          <span className="shrink-0 text-[13px] text-[var(--muted)]">
            ×{r.quantity} · {peso(r.estimatedValue)}
          </span>
        </li>
      ))}
    </ul>
  );
}