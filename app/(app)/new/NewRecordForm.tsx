"use client";

import { useState, useTransition } from "react";
import Section from "@/components/ui/Section";
import Field from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

type Office = { id: number; name: string };

const PRODUCT_TYPES = ["Logs", "Flitches", "Lumber", "Rattan", "Other"] as const;

const PRODUCT_CONDITIONS = [
  { value: "GOOD_CONDITION", label: "Good condition" },
  { value: "DETERIORATING", label: "Deteriorating" },
  { value: "DETERIORATED", label: "Deteriorated" },
] as const;

const SERVICE_STATUSES = [
  { value: "SERVICEABLE", label: "Serviceable" },
  { value: "UNSERVICEABLE", label: "Unserviceable" },
] as const;

const inputClass =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20";

const selectClass = inputClass;

function YesNoField({
  name,
  label,
  value,
  onChange,
  required,
}: {
  name: string;
  label?: string;
  value: "" | "yes" | "no";
  onChange: (v: "" | "yes" | "no") => void;
  required?: boolean;
}) {
  const select = (
    <select
      name={name}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value as "" | "yes" | "no")}
      className={selectClass}
    >
      <option value="" disabled>
        — Select —
      </option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );

  if (!label) {
    return <div>{select}</div>;
  }

  return <Field label={label}>{select}</Field>;
}

type NamedItem = { id: number; name: string };

/** PENRO office with optional default officer (from Settings mappings) */
type PenroOfficeItem = NamedItem & {
  defaultOfficerName: string | null;
};

/** CENRO office with parent PENRO + default officer (from Settings mappings) */
type CenroOfficeItem = Office & {
  penroOfficeId: number | null;
  penroOfficeName: string | null;
  defaultOfficerName: string | null;
};

export default function NewRecordForm({
  offices,
  penroOffices = [],
  penroOfficers = [],
  cenroOfficers = [],
  action,
  lockedOfficeId = null,
}: {
  offices: CenroOfficeItem[];
  penroOffices?: PenroOfficeItem[];
  penroOfficers?: NamedItem[];
  cenroOfficers?: NamedItem[];
  action: (formData: FormData) => void | Promise<void>;
  /** When set (CENRO users), office cannot be changed */
  lockedOfficeId?: number | null;
}) {
  // Start empty so user must click "+ Add product" (same behavior as conveyances / equipment)
  const [itemRows, setItemRows] = useState<number[]>([]);
  const [convRows, setConvRows] = useState<number[]>([]);
  const [equipRows, setEquipRows] = useState<number[]>([]);

  // YES/NO gates (System Requirements process rule)
  const [hasRespondent, setHasRespondent] = useState<"" | "yes" | "no">("");
  const [acpConducted, setAcpConducted] = useState<"" | "yes" | "no">("");
  const [appraisalFp, setAppraisalFp] = useState<"" | "yes" | "no">("");
  const [appraisalConv, setAppraisalConv] = useState<"" | "yes" | "no">("");
  const [appraisalEquip, setAppraisalEquip] = useState<"" | "yes" | "no">("");
  const [donationMade, setDonationMade] = useState<"" | "yes" | "no">("");

  // ── Cascading office / officer state (driven by Admin Settings mappings) ──
  const lockedCenro = lockedOfficeId
    ? offices.find((o) => o.id === lockedOfficeId) ?? null
    : null;

  const initialPenroName =
    lockedCenro?.penroOfficeName ??
    (penroOffices.length === 1 ? penroOffices[0].name : "");
  const initialPenroOfficer =
    (initialPenroName
      ? penroOffices.find((p) => p.name === initialPenroName)?.defaultOfficerName
      : null) ?? "";
  const initialCenroId = lockedOfficeId
    ? String(lockedOfficeId)
    : offices.length === 1
      ? String(offices[0].id)
      : "";
  const initialCenroOfficer =
    (initialCenroId
      ? offices.find((o) => String(o.id) === initialCenroId)?.defaultOfficerName
      : null) ?? "";

  const [selectedPenro, setSelectedPenro] = useState(initialPenroName);
  const [selectedPenroOfficer, setSelectedPenroOfficer] =
    useState(initialPenroOfficer);
  const [selectedCenroId, setSelectedCenroId] = useState(initialCenroId);
  const [selectedCenroOfficer, setSelectedCenroOfficer] =
    useState(initialCenroOfficer);

  const selectedPenroRow = penroOffices.find((p) => p.name === selectedPenro);
  const filteredCenroOffices = selectedPenroRow
    ? offices.filter(
        (o) =>
          o.penroOfficeId === selectedPenroRow.id ||
          // Keep locked office visible even if mapping missing
          (lockedOfficeId != null && o.id === lockedOfficeId),
      )
    : // No PENRO selected yet — show all (or locked only)
      lockedOfficeId != null
      ? offices.filter((o) => o.id === lockedOfficeId)
      : offices;

  function onPenroChange(name: string) {
    setSelectedPenro(name);
    const row = penroOffices.find((p) => p.name === name);
    setSelectedPenroOfficer(row?.defaultOfficerName ?? "");
    // Reset CENRO when PENRO changes (unless locked)
    if (!lockedOfficeId) {
      setSelectedCenroId("");
      setSelectedCenroOfficer("");
    }
  }

  function onCenroChange(idStr: string) {
    setSelectedCenroId(idStr);
    const row = offices.find((o) => String(o.id) === idStr);
    setSelectedCenroOfficer(row?.defaultOfficerName ?? "");
  }

  const [pending, startTransition] = useTransition();
  const { error, flash } = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await action(formData);
        // Only reached if the server action does not redirect
        flash("success", "New apprehension record was created.", "Saved");
      } catch (err) {
        // Next.js redirect() throws; treat as success
        if (
          typeof err === "object" &&
          err !== null &&
          "digest" in err &&
          String((err as { digest?: string }).digest || "").startsWith(
            "NEXT_REDIRECT",
          )
        ) {
          flash("success", "New apprehension record was created.", "Saved");
          return;
        }
        const message =
          err instanceof Error ? err.message : "Could not save the record.";
        error(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-8">
      {/* 1–2. PENRO + CENRO — cascading from Admin Settings mappings */}
      <Section title="OFFICE CONCERNED">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* PENRO Office */}
          <Field label="PENR Office *">
            <select
              name="penroOffice"
              required
              value={selectedPenro}
              onChange={(e) => onPenroChange(e.target.value)}
              disabled={Boolean(lockedOfficeId) || penroOffices.length === 1}
              className={
                selectClass +
                (lockedOfficeId || penroOffices.length === 1 ? " opacity-80" : "")
              }
            >
              {!selectedPenro && (
                <option value="" disabled>
                  — Please Select One —
                </option>
              )}
              {penroOffices.map((o) => (
                <option key={o.id} value={o.name}>
                  {o.name}
                </option>
              ))}
            </select>
            {(lockedOfficeId || penroOffices.length === 1) && selectedPenro && (
              <input type="hidden" name="penroOffice" value={selectedPenro} />
            )}
            {penroOffices.length === 0 && (
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                No PENRO offices configured. Ask Super Admin to add them.
              </p>
            )}
          </Field>

          {/* PENRO Officer — auto from mapping */}
          <Field label="PENR Officer *">
            <select
              name="penroOfficer"
              required
              value={selectedPenroOfficer}
              onChange={(e) => setSelectedPenroOfficer(e.target.value)}
              disabled={Boolean(
                selectedPenroRow?.defaultOfficerName ||
                  (penroOfficers.length === 1 && selectedPenro),
              )}
              className={
                selectClass +
                (selectedPenroRow?.defaultOfficerName ? " opacity-80" : "")
              }
            >
              {!selectedPenroOfficer && (
                <option value="" disabled>
                  — Please Select One —
                </option>
              )}
              {/* Prefer mapped default; still list all so Super Admin can override if not locked */}
              {penroOfficers.map((o) => (
                <option key={o.id} value={o.name}>
                  {o.name}
                </option>
              ))}
            </select>
            {selectedPenroRow?.defaultOfficerName && (
              <>
                <input
                  type="hidden"
                  name="penroOfficer"
                  value={selectedPenroRow.defaultOfficerName}
                />
                <p className="mt-1 text-[12px] text-[var(--muted)]">
                  Automatically set from PENRO mapping.
                </p>
              </>
            )}
            {penroOfficers.length === 0 && (
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                No PENRO officers configured. Ask Super Admin to add them.
              </p>
            )}
          </Field>

          {/* CENRO Office — filtered by selected PENRO AOR */}
          <Field label="CENR Office *">
            <select
              name="cenroOfficeId"
              required
              value={selectedCenroId}
              onChange={(e) => onCenroChange(e.target.value)}
              disabled={Boolean(lockedOfficeId)}
              className={
                selectClass + (lockedOfficeId ? " opacity-80" : "")
              }
            >
              {!selectedCenroId && (
                <option value="" disabled>
                  {selectedPenro
                    ? "— Please Select One —"
                    : "— Select PENRO first —"}
                </option>
              )}
              {filteredCenroOffices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            {lockedOfficeId && (
              <input type="hidden" name="cenroOfficeId" value={lockedOfficeId} />
            )}
            {!selectedPenro && !lockedOfficeId && (
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                Select a PENRO office to see CENRO offices in its AOR.
              </p>
            )}
            {selectedPenro && filteredCenroOffices.length === 0 && (
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                No CENRO offices mapped under this PENRO. Configure AOR in Admin
                → Office mappings.
              </p>
            )}
            {lockedOfficeId && (
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                Automatically set from your CENRO account.
              </p>
            )}
          </Field>

          {/* CENRO Officer — auto from mapping */}
          <Field label="CENR Officer *">
            <select
              name="cenroOfficer"
              required
              value={selectedCenroOfficer}
              onChange={(e) => setSelectedCenroOfficer(e.target.value)}
              disabled={Boolean(
                selectedCenroId &&
                  offices.find((o) => String(o.id) === selectedCenroId)
                    ?.defaultOfficerName,
              )}
              className={
                selectClass +
                (selectedCenroId &&
                offices.find((o) => String(o.id) === selectedCenroId)
                  ?.defaultOfficerName
                  ? " opacity-80"
                  : "")
              }
            >
              {!selectedCenroOfficer && (
                <option value="" disabled>
                  — Please Select One —
                </option>
              )}
              {cenroOfficers.map((o) => (
                <option key={o.id} value={o.name}>
                  {o.name}
                </option>
              ))}
            </select>
            {selectedCenroId &&
              offices.find((o) => String(o.id) === selectedCenroId)
                ?.defaultOfficerName && (
                <>
                  <input
                    type="hidden"
                    name="cenroOfficer"
                    value={
                      offices.find((o) => String(o.id) === selectedCenroId)!
                        .defaultOfficerName!
                    }
                  />
                  <p className="mt-1 text-[12px] text-[var(--muted)]">
                    Automatically set from CENRO mapping.
                  </p>
                </>
              )}
            {cenroOfficers.length === 0 && (
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                No CENRO officers configured. Ask Super Admin to add them.
              </p>
            )}
          </Field>
        </div>
      </Section>

      {/* 3–4. Date, time, place, coordinates — year/month derived from date */}
      <Section title="INCIDENT INFORMATION">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date of apprehension *">
            <input
              type="date"
              name="dateOfApprehension"
              required
              className={inputClass}
            />
          </Field>
          <Field label="Time of apprehension">
            <input type="time" name="timeOfApprehension" className={inputClass} />
          </Field>
          <Field label="Place of apprehension">
            <div className="space-y-2">
              <input
                type="text"
                name="placeSitioBrgy"
                placeholder="Sitio / Barangay (e.g. Sitio Baguio Point, Lapi)"
                className={inputClass}
              />
              <input
                type="text"
                name="placeMunicipality"
                placeholder="Municipality / City (e.g. Peñablanca)"
                className={inputClass}
              />
              <input
                type="text"
                name="placeProvince"
                placeholder="Province (e.g. Cagayan)"
                className={inputClass}
              />
            </div>
          </Field>
          <Field label="Coordinates (UTM)">
            <div className="space-y-2">
              <input
                type="text"
                name="gpsNorthing"
                placeholder="Northing (e.g. 18.2512, 121.6334)"
                className={inputClass}
              />
              <input
                type="text"
                name="gpsEasting"
                placeholder="Easting (e.g. 18.2512, 121.6334)"
                className={inputClass}
              />
            </div>
          </Field>
        </div>
        <p className="mt-2 text-[12px] text-[var(--muted)]">
          Year and month are taken automatically from the date of apprehension.
        </p>
      </Section>

      {/* 5. Forest products — same empty-start + Add behavior as conveyances / equipment */}
      <Section
        title="Forest products"
        action={
          <button
            type="button"
            onClick={() =>
              setItemRows((r) => [...r, r.length ? Math.max(...r) + 1 : 0])
            }
            className="text-[13px] font-medium text-[var(--accent)] hover:underline"
          >
            + Add product
          </button>
        }
      >
        {itemRows.length === 0 ? (
          <p className="text-[14px] text-[var(--muted)]">No forest products added yet.</p>
        ) : (
          <div className="space-y-3">
            {itemRows.map((row) => (
              <div
                key={row}
                className="relative grid grid-cols-1 gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-3 pt-10 sm:grid-cols-2 lg:grid-cols-3"
              >
                <button
                  type="button"
                  onClick={() => setItemRows((r) => r.filter((id) => id !== row))}
                  className="absolute right-2 top-2 rounded-md px-2 py-1 text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                  aria-label="Remove product"
                  title="Remove"
                >
                  ✕
                </button>
                <Field label="Type">
                  <select name="itemType" className={selectClass} defaultValue="">
                    <option value="">— Type —</option>
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Number of pieces">
                  <input
                    type="text"
                    name="itemQty"
                    placeholder="e.g. 12"
                    className={inputClass}
                  />
                </Field>
                <Field label="Volume (bd. ft.)">
                  <input
                    type="number"
                    step="any"
                    name="itemVolumeBdFt"
                    placeholder="Board feet"
                    className={inputClass}
                  />
                </Field>
                <Field label="Volume (cu. m.)">
                  <input
                    type="number"
                    step="any"
                    name="itemVolumeCuM"
                    placeholder="Cubic meters"
                    className={inputClass}
                  />
                </Field>
                <Field label="Status">
                  <select name="itemCondition" className={selectClass} defaultValue="">
                    <option value="">— Status —</option>
                    {PRODUCT_CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Estimated value (₱)">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    name="itemValue"
                    placeholder="0.00"
                    className={inputClass}
                  />
                </Field>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 6. Conveyances */}
      <Section
        title="Conveyances"
        action={
          <button
            type="button"
            onClick={() =>
              setConvRows((r) => [...r, r.length ? Math.max(...r) + 1 : 0])
            }
            className="text-[13px] font-medium text-[var(--accent)] hover:underline"
          >
            + Add conveyance
          </button>
        }
      >
        {convRows.length === 0 ? (
          <p className="text-[14px] text-[var(--muted)]">No conveyances added yet.</p>
        ) : (
          <div className="space-y-3">
            {convRows.map((row) => (
              <div
                key={row}
                className="relative grid grid-cols-1 gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-3 pt-10 sm:grid-cols-3"
              >
                <button
                  type="button"
                  onClick={() => setConvRows((r) => r.filter((id) => id !== row))}
                  className="absolute right-2 top-2 rounded-md px-2 py-1 text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                  aria-label="Remove conveyance"
                  title="Remove"
                >
                  ✕
                </button>
                <Field label="Type">
                  <input
                    type="text"
                    name="convType"
                    placeholder="e.g. Motorcycle, kulong-kulong"
                    className={inputClass}
                  />
                </Field>
                <Field label="Plate no. *">
                  <input
                    type="text"
                    name="convPlateNo"
                    placeholder="Plate number"
                    className={inputClass}
                  />
                </Field>
                <Field label="Status">
                  <select name="convStatus" className={selectClass} defaultValue="">
                    <option value="">— Status —</option>
                    {SERVICE_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 7. Equipment / implement */}
      <Section
        title="Equipment / implement"
        action={
          <button
            type="button"
            onClick={() =>
              setEquipRows((r) => [...r, r.length ? Math.max(...r) + 1 : 0])
            }
            className="text-[13px] font-medium text-[var(--accent)] hover:underline"
          >
            + Add equipment
          </button>
        }
      >
        {equipRows.length === 0 ? (
          <p className="text-[14px] text-[var(--muted)]">No equipment added yet.</p>
        ) : (
          <div className="space-y-3">
            {equipRows.map((row) => (
              <div
                key={row}
                className="relative grid grid-cols-1 gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-3 pt-10 sm:grid-cols-3"
              >
                <button
                  type="button"
                  onClick={() => setEquipRows((r) => r.filter((id) => id !== row))}
                  className="absolute right-2 top-2 rounded-md px-2 py-1 text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                  aria-label="Remove equipment"
                  title="Remove"
                >
                  ✕
                </button>
                <Field label="Type">
                  <input
                    type="text"
                    name="equipType"
                    placeholder="e.g. Chainsaw"
                    className={inputClass}
                  />
                </Field>
                <Field label="Registered *">
                  <select name="equipRegistered" className={selectClass} defaultValue="">
                    <option value="">— Select —</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select name="equipStatus" className={selectClass} defaultValue="">
                    <option value="">— Status —</option>
                    {SERVICE_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 8. Apprehending officer */}
      <Section title="Apprehending officer *">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Agency *">
            <input
              type="text"
              name="apprehendingAgency"
              required
              placeholder="e.g. PNP, LGU, DENR"
              className={inputClass}
            />
          </Field>
          <Field label="Officer name">
            <input
              type="text"
              name="apprehendingOfficer"
              placeholder="Optional"
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      {/* 9. Respondent / claimant — YES shows fields; NO → Abandoned */}
      <Section title="Respondent / claimant present? *">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <YesNoField
            name="hasRespondent"
            value={hasRespondent}
            onChange={setHasRespondent}
            required
          />
        </div>
        {hasRespondent === "yes" && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                type="text"
                name="claimantRespondent"
                placeholder="Full name"
                className={inputClass}
              />
            </Field>
            <Field label="Contact no. *">
              <input
                type="text"
                name="respondentContact"
                required
                placeholder="Mobile / landline"
                className={inputClass}
              />
            </Field>
            <Field label="Address">
              <input
                type="text"
                name="respondentAddress"
                placeholder="Address"
                className={inputClass + " sm:col-span-2"}
              />
            </Field>
          </div>
        )}
        {hasRespondent === "no" && (
          <p className="mt-3 text-[13px] text-[var(--muted)]">
            Will be recorded as <strong>Abandoned</strong>.
          </p>
        )}
      </Section>

      {/* 10. ACP conducted */}
      <Section title="Administrative Confiscation Proceeding conducted? *">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <YesNoField
            name="acpConducted"
            value={acpConducted}
            onChange={setAcpConducted}
            required
          />
        </div>
        {acpConducted === "yes" && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Date of ACP">
              <input type="date" name="acpDate" className={inputClass} />
            </Field>
            <Field label="Endorsed to PENRO">
              <input type="date" name="acpEndorsedToPenro" className={inputClass} />
            </Field>
            <Field label="Endorsed to R.O.">
              <input type="date" name="acpEndorsedToRo" className={inputClass} />
            </Field>
          </div>
        )}
        {acpConducted === "no" && (
          <p className="mt-3 text-[13px] text-[var(--muted)]">
            Will be recorded as <strong>None</strong>.
          </p>
        )}
      </Section>

      {/* 11–13. Promulgation + docket */}
      <Section title="Promulgation & Docket Number">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Date of promulgation">
            <input type="date" name="dateOfPromulgation" className={inputClass} />
          </Field>
          <Field label="Promulgated by">
            <input type="text" name="promulgatedBy" className={inputClass} />
          </Field>
          <Field label="Docket no.">
            <input
              type="text"
              name="docketNumber"
              placeholder="Docket number"
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      {/* 14–16. Appraisals */}
      <Section title="Appraisal conducted? *">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <YesNoField
              name="appraisalForestProducts"
              label="Forest products *"
              value={appraisalFp}
              onChange={setAppraisalFp}
              required
            />
            {appraisalFp === "yes" && (
              <Field label="Date of appraisal (forest products)">
                <input
                  type="date"
                  name="appraisalForestProductsDate"
                  className={inputClass}
                />
              </Field>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <YesNoField
              name="appraisalConveyances"
              label="Conveyances *"
              value={appraisalConv}
              onChange={setAppraisalConv}
              required
            />
            {appraisalConv === "yes" && (
              <Field label="Date of appraisal (conveyances)">
                <input
                  type="date"
                  name="appraisalConveyancesDate"
                  className={inputClass}
                />
              </Field>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <YesNoField
              name="appraisalEquipment"
              label="Equipment / implements *"
              value={appraisalEquip}
              onChange={setAppraisalEquip}
              required
            />
            {appraisalEquip === "yes" && (
              <Field label="Date of appraisal (equipment)">
                <input
                  type="date"
                  name="appraisalEquipmentDate"
                  className={inputClass}
                />
              </Field>
            )}
          </div>
        </div>
      </Section>

      {/* 17. Mode of disposition */}
      <Section title="Donation made? *">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <YesNoField
            name="donationMade"
            value={donationMade}
            onChange={setDonationMade}
            required
          />
        </div>

        {donationMade === "yes" && (
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Donation of forest products
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Date of donation">
                  <input type="date" name="donationFpDate" className={inputClass} />
                </Field>
                <Field label="Volume">
                  <input type="text" name="donationFpVolume" className={inputClass} />
                </Field>
                <Field label="Donor">
                  <input type="text" name="donationFpDonor" className={inputClass} />
                </Field>
                <Field label="Donee">
                  <input type="text" name="donationFpDonee" className={inputClass} />
                </Field>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Donation / bid of conveyances
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Date of donation / bid">
                  <input type="date" name="donationConvDate" className={inputClass} />
                </Field>
                <Field label="Donor / office">
                  <input type="text" name="donationConvDonor" className={inputClass} />
                </Field>
                <Field label="Donee / bidder">
                  <input type="text" name="donationConvDonee" className={inputClass} />
                </Field>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Donation of equipment / implements
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Date of donation">
                  <input type="date" name="donationEquipDate" className={inputClass} />
                </Field>
                <Field label="Donor">
                  <input type="text" name="donationEquipDonor" className={inputClass} />
                </Field>
                <Field label="Donee">
                  <input type="text" name="donationEquipDonee" className={inputClass} />
                </Field>
              </div>
            </div>
          </div>
        )}
        {donationMade === "no" && (
          <p className="mt-3 text-[13px] text-[var(--muted)]">
            Will be recorded as <strong>None</strong>.
          </p>
        )}
      </Section>

      {/* Optional notes */}
      <Section title="Additional notes (optional)">
        <Field label="Circumstances / remarks">
          <textarea name="remarks" rows={3} className={inputClass} />
        </Field>
      </Section>

      <div className="flex justify-end gap-3 pb-8">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save apprehension record"}
        </button>
      </div>
    </form>
  );
}
