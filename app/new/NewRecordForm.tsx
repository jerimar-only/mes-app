"use client";

import { useState } from "react";
import Section from "@/components/ui/Section";
import Field from "@/components/ui/Field";

type Office = { id: number; name: string };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const inputClass =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20";

export default function NewRecordForm({
  offices,
  action,
}: {
  offices: Office[];
  action: (formData: FormData) => void;
}) {
  const [itemRows, setItemRows] = useState([0]);
  const [convRows, setConvRows] = useState<number[]>([]);
  const [equipRows, setEquipRows] = useState<number[]>([]);

  return (
    <form action={action} className="mx-auto max-w-4xl space-y-8">
     

      {/* Basic information */}
      <Section title="Basic information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="CENRO office">
            <select name="cenroOfficeId" required className={inputClass}>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Year">
            <input
              type="number"
              name="year"
              required
              defaultValue={new Date().getFullYear()}
              className={inputClass}
            />
          </Field>

          <Field label="Month">
            <select
              name="month"
              required
              defaultValue={new Date().getMonth() + 1}
              className={inputClass}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date of apprehension">
            <input
              type="text"
              name="dateOfApprehension"
              placeholder="e.g. September 21, 2026"
              className={inputClass}
            />
          </Field>

          <Field label="Place of apprehension">
            <input
              type="text"
              name="placeOfApprehension"
              placeholder="e.g. Sta. Ana, Gattaran, Cagayan"
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      {/* Parties involved */}
      <Section title="Parties involved">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Apprehending agency/s">
            <input
              type="text"
              name="apprehendingAgency"
              placeholder="e.g. PNP Gattaran"
              className={inputClass}
            />
          </Field>

          <Field label="Name of claimant / respondent">
            <input
              type="text"
              name="claimantRespondent"
              placeholder="e.g. Alfredo B. Pavo"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Circumstances">
            <textarea name="circumstances" rows={3} className={inputClass} />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Custodian / stockpile location">
            <input type="text" name="custodianLocation" className={inputClass} />
          </Field>

          <Field label="Other agencies involved">
            <input type="text" name="otherAgencies" className={inputClass} />
          </Field>
        </div>
      </Section>

      {/* Forest products */}
      <Section
        title="Forest products"
        action={
          <button
            type="button"
            onClick={() => setItemRows((r) => [...r, r.length])}
            className="text-[13px] font-medium text-[var(--accent)] hover:underline"
          >
            + Add product
          </button>
        }
      >
        <div className="space-y-3">
          {itemRows.map((row) => (
            <div
              key={row}
              className="grid grid-cols-1 gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-3 sm:grid-cols-5"
            >
              <input
                type="text"
                name="itemQty"
                placeholder="Qty (e.g. 7 & 1)"
                className={inputClass}
              />
              <input
                type="text"
                name="itemSpecies"
                placeholder="Species (e.g. Gmelina)"
                className={inputClass}
              />
              <input
                type="text"
                name="itemForms"
                placeholder="Forms (e.g. Lumber)"
                className={inputClass}
              />
              <input
                type="number"
                step="any"
                name="itemVolumeBdFt"
                placeholder="Volume (BDFT)"
                className={inputClass}
              />
              <input
                type="number"
                step="any"
                name="itemVolumeCuM"
                placeholder="Volume (cu.m.)"
                className={inputClass}
              />
              <input type="hidden" name="itemValue" value="" />
            </div>
          ))}
        </div>
      </Section>

      {/* Conveyances */}
      <Section
        title="Conveyances (optional)"
        action={
          <button
            type="button"
            onClick={() => setConvRows((r) => [...r, r.length])}
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
              <div key={row} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  name="convType"
                  placeholder="Type (e.g. Utility vehicle)"
                  className={inputClass}
                />
                <input
                  type="number"
                  name="convQty"
                  defaultValue={1}
                  min={1}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Equipment */}
      <Section
        title="Equipment / tools (optional)"
        action={
          <button
            type="button"
            onClick={() => setEquipRows((r) => [...r, r.length])}
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
              <div key={row} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  name="equipType"
                  placeholder="Type (e.g. Chainsaw with defaced serial number)"
                  className={inputClass}
                />
                <input
                  type="number"
                  name="equipQty"
                  defaultValue={1}
                  min={1}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Remarks */}
      <Section title="Remarks">
        <textarea
          name="remarks"
          rows={4}
          placeholder="Additional notes..."
          className={inputClass}
        />
      </Section>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[15px] font-medium text-white transition hover:opacity-90"
        >
          Save record
        </button>
      </div>
    </form>
  );
}