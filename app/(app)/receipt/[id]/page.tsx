import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PrintButton } from "./PrintButton";

const yn = (v: boolean | null | undefined) =>
  v === true ? "Yes" : v === false ? "No" : "—";

const fmtDate = (d: Date | string | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

const num = (v: number | null | undefined, decimals = 2) =>
  v == null
    ? "—"
    : v.toLocaleString("en-US", { maximumFractionDigits: decimals });

const peso = (v: number | null | undefined) =>
  v == null
    ? "—"
    : `₱${v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const CONDITION_LABEL: Record<string, string> = {
  GOOD_CONDITION: "Good condition",
  DETERIORATING: "Deteriorating",
  DETERIORATED: "Deteriorated",
};

const SERVICE_LABEL: Record<string, string> = {
  SERVICEABLE: "Serviceable",
  UNSERVICEABLE: "Unserviceable",
};

export default async function ReceiptPage({
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

  if (!record || record.isDeleted) notFound();

  const totalBdFt = record.items.reduce((s, i) => s + (i.volumeBdFt ?? 0), 0);
  const totalCuM = record.items.reduce((s, i) => s + (i.volumeCuM ?? 0), 0);
  const totalValue = record.items.reduce(
    (s, i) => s + (i.estimatedValue ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-[800px]">
      {/* Screen-only controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <Link
          href="/receipt"
          className="text-[14px] text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← Back to search
        </Link>
        <Link
          href={`/records/${record.id}`}
          className="text-[14px] text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          View record
        </Link>
        <div className="ml-auto">
          <PrintButton />
        </div>
      </div>

      {/* Printable receipt */}
      <article className="receipt-document rounded-xl border border-[var(--border)] bg-white p-6 text-zinc-900 shadow-sm dark:bg-white">
        <header className="border-b border-zinc-300 pb-4 text-center">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-zinc-600">
            Republic of the Philippines
          </p>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-zinc-600">
            Department of Environment and Natural Resources
          </p>
          <h1 className="mt-2 text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">
            Apprehension Receipt
          </h1>
          <p className="mt-1 text-[13px] text-zinc-600">
            Record #{record.id}
            {record.docketNumber ? ` · Docket ${record.docketNumber}` : ""}
          </p>
        </header>

        <Section title="Office concerned">
          <Grid>
            <Row label="PENRO office" value={record.penroOffice} />
            <Row label="PENRO officer" value={record.penroOfficer} />
            <Row label="CENRO office" value={record.cenroOffice?.name} />
            <Row label="CENRO officer" value={record.cenroOfficer} />
          </Grid>
        </Section>

        <Section title="Incident details">
          <Grid>
            <Row label="Date of apprehension" value={record.dateOfApprehension} />
            <Row label="Time of apprehension" value={record.timeOfApprehension} />
            <Row
              label="Place of apprehension"
              value={record.placeOfApprehension}
            />
            <Row
              label="Source of forest products"
              value={record.sourcePlace}
            />
            <Row label="GPS coordinates" value={record.gpsCoordinates} />
            <Row label="Land classification" value={record.landClassification} />
            <Row
              label="Place impounded / custodian"
              value={record.custodianLocation}
            />
          </Grid>
          {record.circumstances && (
            <p className="mt-3 text-[13px] leading-relaxed text-zinc-800">
              <span className="font-semibold text-zinc-600">Circumstances: </span>
              {record.circumstances}
            </p>
          )}
        </Section>

        <Section title="Parties">
          <Grid>
            <Row label="Apprehending agency" value={record.apprehendingAgency} />
            <Row
              label="Apprehending officer"
              value={record.apprehendingOfficer}
            />
            <Row
              label="Respondent / claimant present?"
              value={yn(record.hasRespondent)}
            />
            <Row
              label="Name of claimant / respondent"
              value={record.claimantRespondent}
            />
            <Row label="Contact" value={record.respondentContact} />
            <Row label="Address" value={record.respondentAddress} />
            <Row label="Other agencies" value={record.otherAgencies} />
          </Grid>
        </Section>

        <Section title="Forest products">
          {record.items.length === 0 ? (
            <p className="text-[13px] text-zinc-500">None recorded.</p>
          ) : (
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-zinc-300 text-[11px] uppercase tracking-wide text-zinc-600">
                  <th className="py-1.5 pr-2 font-semibold">Type</th>
                  <th className="py-1.5 pr-2 font-semibold">Qty</th>
                  <th className="py-1.5 pr-2 font-semibold">Status</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">bd.ft.</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">cu.m.</th>
                  <th className="py-1.5 text-right font-semibold">Value</th>
                </tr>
              </thead>
              <tbody>
                {record.items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-100">
                    <td className="py-1.5 pr-2">
                      {item.type || item.forms || item.species || "—"}
                    </td>
                    <td className="py-1.5 pr-2">{item.quantity || "—"}</td>
                    <td className="py-1.5 pr-2">
                      {CONDITION_LABEL[item.conditionStatus ?? ""] ||
                        item.conditionStatus ||
                        "—"}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {num(item.volumeBdFt)}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {num(item.volumeCuM)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {peso(item.estimatedValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {record.items.length > 1 && (
                <tfoot>
                  <tr className="border-t border-zinc-300 font-semibold">
                    <td className="py-1.5 pr-2" colSpan={3}>
                      Total
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {num(totalBdFt)}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {num(totalCuM)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {peso(totalValue)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </Section>

        <Section title="Conveyances">
          {record.conveyances.length === 0 ? (
            <p className="text-[13px] text-zinc-500">None recorded.</p>
          ) : (
            <ul className="space-y-1 text-[13px]">
              {record.conveyances.map((c) => (
                <li key={c.id}>
                  <span className="font-medium">{c.type || "—"}</span>
                  {c.plateNo ? ` · Plate ${c.plateNo}` : ""}
                  {" · "}
                  {SERVICE_LABEL[c.serviceStatus ?? ""] ||
                    c.serviceStatus ||
                    "—"}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Equipment / implements">
          {record.equipment.length === 0 ? (
            <p className="text-[13px] text-zinc-500">None recorded.</p>
          ) : (
            <ul className="space-y-1 text-[13px]">
              {record.equipment.map((e) => (
                <li key={e.id}>
                  <span className="font-medium">{e.type || "—"}</span>
                  {" · Registered: "}
                  {e.registered === true
                    ? "Yes"
                    : e.registered === false
                      ? "No"
                      : "—"}
                  {" · "}
                  {SERVICE_LABEL[e.serviceStatus ?? ""] ||
                    e.serviceStatus ||
                    "—"}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Administrative confiscation & appraisal">
          <Grid>
            <Row label="ACP conducted?" value={yn(record.acpConducted)} />
            <Row label="Date of ACP" value={fmtDate(record.acpDate)} />
            <Row
              label="ACP endorsed to PENRO"
              value={fmtDate(record.acpEndorsedToPenro)}
            />
            <Row
              label="ACP endorsed to RO"
              value={fmtDate(record.acpEndorsedToRo)}
            />
            <Row
              label="Appraisal — forest products"
              value={yn(record.appraisalForestProducts)}
            />
            <Row
              label="Appraisal FP date"
              value={fmtDate(record.appraisalForestProductsDate)}
            />
            <Row
              label="Appraisal — conveyances"
              value={yn(record.appraisalConveyances)}
            />
            <Row
              label="Appraisal conv. date"
              value={fmtDate(record.appraisalConveyancesDate)}
            />
            <Row
              label="Appraisal — equipment"
              value={yn(record.appraisalEquipment)}
            />
            <Row
              label="Appraisal equip. date"
              value={fmtDate(record.appraisalEquipmentDate)}
            />
            <Row label="Donation made?" value={yn(record.donationMade)} />
          </Grid>
        </Section>

        <Section title="Promulgation & case status">
          <Grid>
            <Row label="Date of promulgation" value={record.dateOfPromulgation} />
            <Row label="Promulgated by" value={record.promulgatedBy} />
            <Row label="Docket no." value={record.docketNumber} />
            <Row
              label="Order of finality date"
              value={record.orderOfFinalityDate}
            />
            <Row label="Case status" value={record.caseStatus} />
          </Grid>
          {(record.remarks || record.otherRemarks) && (
            <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-zinc-800">
              {record.otherRemarks && (
                <p>
                  <span className="font-semibold text-zinc-600">
                    Other remarks:{" "}
                  </span>
                  {record.otherRemarks}
                </p>
              )}
              {record.remarks && (
                <p>
                  <span className="font-semibold text-zinc-600">Remarks: </span>
                  {record.remarks}
                </p>
              )}
            </div>
          )}
        </Section>

        <footer className="mt-10 grid grid-cols-2 gap-8 border-t border-zinc-300 pt-8 text-[12px] text-zinc-700">
          <div className="text-center">
            <div className="mx-auto mb-10 h-px w-40 bg-zinc-400" />
            <p className="font-semibold">Apprehending officer</p>
            <p className="mt-0.5 text-zinc-500">Signature over printed name</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-10 h-px w-40 bg-zinc-400" />
            <p className="font-semibold">Witness / respondent</p>
            <p className="mt-0.5 text-zinc-500">Signature over printed name</p>
          </div>
        </footer>

        <p className="mt-6 text-center text-[11px] text-zinc-400 print:mt-4">
          Generated from EMS Apprehension Tracker · Record #{record.id}
        </p>
      </article>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 border-b border-zinc-200 pb-4 last:border-0">
      <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-zinc-600">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">{children}</div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);
  return (
    <div className="text-[13px] leading-snug">
      <span className="text-zinc-500">{label}: </span>
      <span className="font-medium text-zinc-900">{display}</span>
    </div>
  );
}
