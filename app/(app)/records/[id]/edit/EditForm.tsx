"use client";

import { useState } from "react";
import Link from "next/link";
import { updateRecord, updateRecordInline } from "../../actions";
import { useToast } from "@/components/ui/Toast";
import CaseDocumentsUpload from "@/components/ui/CaseDocumentsUpload";
import {
  ForestRowFields,
  ConvRowFields,
  EquipRowFields,
  emptyForestRow,
  emptyConvRow,
  emptyEquipRow,
  type ForestRow,
  type ConvRow,
  type EquipRow,
} from "@/components/ui/ProductRows";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[14px] text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500";
const labelCls =
  "mb-1 block text-[13px] font-medium text-zinc-700 dark:text-zinc-300";
const selectCls = inputCls;

const rowStyles = { inputCls, selectCls, labelCls };

let counter = 0;
const nextKey = () => ++counter;

type Named = { id: number; name: string };
type PenroOfficeItem = Named & { defaultOfficerName: string | null };
type CenroOfficeItem = Named & {
  penroOfficeId: number | null;
  penroOfficeName: string | null;
  defaultOfficerName: string | null;
};

type EditFormProps = {
  record: any;
  onSaved?: () => void;
  onCancel?: () => void;
};

function YesNo({
  name,
  value,
  onChange,
  label,
}: {
  name: string;
  value: "" | "yes" | "no";
  onChange: (v: "" | "yes" | "no") => void;
  label: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value as "" | "yes" | "no")}
        className={selectCls}
      >
        <option value="">— Select —</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  );
}

/** Card-style section so edit form categories are clearly divided */
function FormSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/80">
        <h2 className="text-[14px] font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          {title}
        </h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

export function EditForm({ record, onSaved, onCancel }: EditFormProps) {
  const lookups = record.lookups ?? {
    penroOffices: [] as PenroOfficeItem[],
    penroOfficers: [] as Named[],
    cenroOfficers: [] as Named[],
    cenroOffices: [] as CenroOfficeItem[],
  };

  // Rows live in state so the Appraisal section edits the same data.
  const [items, setItems] = useState<ForestRow[]>(() =>
    (record.items ?? []).map((i: any) => ({
      k: nextKey(),
      type: i.type || i.forms || "",
      species: i.species ?? "",
      qty: i.qty ?? "",
      bdft: i.bdft ?? "",
      cum: i.cum ?? "",
      condition: i.condition ?? "",
      value: i.value ?? "",
    })),
  );
  const [convs, setConvs] = useState<ConvRow[]>(() =>
    (record.conveyances ?? []).map((c: any) => ({
      k: nextKey(),
      type: c.type ?? "",
      plateNo: c.plateNo ?? "",
      status: c.status ?? "",
      qty: c.qty ?? "1",
      value: c.value ?? "",
    })),
  );
  const [equip, setEquip] = useState<EquipRow[]>(() =>
    (record.equipment ?? []).map((e: any) => ({
      k: nextKey(),
      type: e.type ?? "",
      registered: e.registered ?? "",
      status: e.status ?? "",
      qty: e.qty ?? "1",
      value: e.value ?? "",
    })),
  );
  const patchItem = (k: number, patch: Partial<ForestRow>) =>
    setItems((r) => r.map((x) => (x.k === k ? { ...x, ...patch } : x)));
  const patchConv = (k: number, patch: Partial<ConvRow>) =>
    setConvs((r) => r.map((x) => (x.k === k ? { ...x, ...patch } : x)));
  const patchEquip = (k: number, patch: Partial<EquipRow>) =>
    setEquip((r) => r.map((x) => (x.k === k ? { ...x, ...patch } : x)));

  const [selectedPenro, setSelectedPenro] = useState(record.penroOffice ?? "");
  const [selectedPenroOfficer, setSelectedPenroOfficer] = useState(
    record.penroOfficer ?? "",
  );
  const [selectedCenroId, setSelectedCenroId] = useState(
    record.cenroOfficeId != null ? String(record.cenroOfficeId) : "",
  );
  const [selectedCenroOfficer, setSelectedCenroOfficer] = useState(
    record.cenroOfficer ?? "",
  );

  const [hasRespondent, setHasRespondent] = useState<"" | "yes" | "no">(
    record.hasRespondent || "",
  );
  const [acpConducted, setAcpConducted] = useState<"" | "yes" | "no">(
    record.acpConducted || "",
  );
  const [appraisalFp, setAppraisalFp] = useState<"" | "yes" | "no">(
    record.appraisalForestProducts || "",
  );
  const [appraisalConv, setAppraisalConv] = useState<"" | "yes" | "no">(
    record.appraisalConveyances || "",
  );
  const [appraisalEquip, setAppraisalEquip] = useState<"" | "yes" | "no">(
    record.appraisalEquipment || "",
  );
  const [appraisalConducted, setAppraisalConducted] = useState<
    "" | "yes" | "no"
  >(() => {
    const vals = [
      record.appraisalForestProducts,
      record.appraisalConveyances,
      record.appraisalEquipment,
    ];
    if (vals.some((v) => v === "yes" || v === true)) return "yes";
    if (vals.some((v) => v === "no" || v === false)) return "no";
    return "";
  });
  const [donationMade, setDonationMade] = useState<"" | "yes" | "no">(
    record.donationMade || "",
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { success, error: toastError, flash } = useToast();

  const selectedPenroRow = (lookups.penroOffices as PenroOfficeItem[]).find(
    (p) => p.name === selectedPenro,
  );
  const filteredCenro = selectedPenroRow
    ? (lookups.cenroOffices as CenroOfficeItem[]).filter(
        (o) =>
          o.penroOfficeId === selectedPenroRow.id ||
          String(o.id) === selectedCenroId,
      )
    : (lookups.cenroOffices as CenroOfficeItem[]);

  function onPenroChange(name: string) {
    setSelectedPenro(name);
    const row = (lookups.penroOffices as PenroOfficeItem[]).find(
      (p) => p.name === name,
    );
    if (row?.defaultOfficerName) setSelectedPenroOfficer(row.defaultOfficerName);
    setSelectedCenroId("");
    setSelectedCenroOfficer("");
  }

  function onCenroChange(idStr: string) {
    setSelectedCenroId(idStr);
    const row = (lookups.cenroOffices as CenroOfficeItem[]).find(
      (o) => String(o.id) === idStr,
    );
    if (row?.defaultOfficerName) setSelectedCenroOfficer(row.defaultOfficerName);
  }

  async function handleInlineSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateRecordInline(new FormData(e.currentTarget));
      success("Record changes were saved.", "Saved");
      onSaved?.();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not save changes. Please try again.";
      setError(msg);
      toastError(msg);
      setBusy(false);
    }
  }

  async function handlePageSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateRecord(new FormData(e.currentTarget));
      flash("success", "Record changes were saved.", "Saved");
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "digest" in err &&
        String((err as { digest?: string }).digest || "").startsWith("NEXT_REDIRECT")
      ) {
        flash("success", "Record changes were saved.", "Saved");
        return;
      }
      const msg =
        err instanceof Error ? err.message : "Could not save changes. Please try again.";
      setError(msg);
      toastError(msg);
      setBusy(false);
    }
  }

  const formProps = onSaved
    ? { onSubmit: handleInlineSubmit }
    : { onSubmit: handlePageSubmit };

  return (
    <form {...formProps} className="space-y-5">
      <input type="hidden" name="id" value={record.id} />

      {/* Office concerned */}
      <FormSection title="Office concerned">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>PENR Office</label>
            <select
              name="penroOffice"
              value={selectedPenro}
              onChange={(e) => onPenroChange(e.target.value)}
              className={selectCls}
            >
              <option value="">— Select —</option>
              {(lookups.penroOffices as PenroOfficeItem[]).map((o) => (
                <option key={o.id} value={o.name}>
                  {o.name}
                </option>
              ))}
              {selectedPenro &&
                !(lookups.penroOffices as PenroOfficeItem[]).some(
                  (o) => o.name === selectedPenro,
                ) && <option value={selectedPenro}>{selectedPenro}</option>}
            </select>
          </div>
          <div>
            <label className={labelCls}>PENR Officer</label>
            <select
              name="penroOfficer"
              value={selectedPenroOfficer}
              onChange={(e) => setSelectedPenroOfficer(e.target.value)}
              className={selectCls}
            >
              <option value="">— Select —</option>
              {(lookups.penroOfficers as Named[]).map((o) => (
                <option key={o.id} value={o.name}>
                  {o.name}
                </option>
              ))}
              {selectedPenroOfficer &&
                !(lookups.penroOfficers as Named[]).some(
                  (o) => o.name === selectedPenroOfficer,
                ) && (
                  <option value={selectedPenroOfficer}>{selectedPenroOfficer}</option>
                )}
            </select>
          </div>
          <div>
            <label className={labelCls}>CENR Office</label>
            <select
              name="cenroOfficeId"
              value={selectedCenroId}
              onChange={(e) => onCenroChange(e.target.value)}
              className={selectCls}
            >
              <option value="">— Select —</option>
              {filteredCenro.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>CENR Officer</label>
            <select
              name="cenroOfficer"
              value={selectedCenroOfficer}
              onChange={(e) => setSelectedCenroOfficer(e.target.value)}
              className={selectCls}
            >
              <option value="">— Select —</option>
              {(lookups.cenroOfficers as Named[]).map((o) => (
                <option key={o.id} value={o.name}>
                  {o.name}
                </option>
              ))}
              {selectedCenroOfficer &&
                !(lookups.cenroOfficers as Named[]).some(
                  (o) => o.name === selectedCenroOfficer,
                ) && (
                  <option value={selectedCenroOfficer}>{selectedCenroOfficer}</option>
                )}
            </select>
          </div>
        </div>
      </FormSection>

      {/* Incident */}
      <FormSection title="Incident information">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Date of apprehension</label>
            <input
              type="date"
              name="dateOfApprehension"
              defaultValue={record.dateOfApprehension ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Time of apprehension</label>
            <input
              type="time"
              name="timeOfApprehension"
              defaultValue={record.timeOfApprehension ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Place of apprehension</label>
            <div className="space-y-2">
              <input
                name="placeSitioBrgy"
                defaultValue={record.placeSitioBrgy ?? ""}
                placeholder="Sitio / Barangay"
                className={inputCls}
              />
              <input
                name="placeMunicipality"
                defaultValue={record.placeMunicipality ?? ""}
                placeholder="Municipality / City"
                className={inputCls}
              />
              <input
                name="placeProvince"
                defaultValue={record.placeProvince ?? ""}
                placeholder="Province"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Coordinates (UTM)</label>
            <div className="space-y-2">
              <input
                name="gpsNorthing"
                defaultValue={record.gpsNorthing ?? ""}
                placeholder="Northing"
                className={inputCls}
              />
              <input
                name="gpsEasting"
                defaultValue={record.gpsEasting ?? ""}
                placeholder="Easting"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </FormSection>

      {/* Apprehending */}
      <FormSection title="Apprehending officer">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Agency</label>
            <input
              name="apprehendingAgency"
              defaultValue={record.apprehendingAgency ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Officer name</label>
            <input
              name="apprehendingOfficer"
              defaultValue={record.apprehendingOfficer ?? ""}
              className={inputCls}
            />
          </div>
        </div>
      </FormSection>

      {/* Respondent */}
      <FormSection title="Respondent / claimant">
        <div className="grid gap-4 sm:grid-cols-2">
          <YesNo
            name="hasRespondent"
            label="Has respondent?"
            value={hasRespondent}
            onChange={setHasRespondent}
          />
          {hasRespondent === "yes" && (
            <>
              <div>
                <label className={labelCls}>Name</label>
                <input
                  name="claimantRespondent"
                  defaultValue={
                    record.claimantRespondent === "Abandoned"
                      ? ""
                      : record.claimantRespondent ?? ""
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <input
                  name="respondentAddress"
                  defaultValue={record.respondentAddress ?? ""}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Contact</label>
                <input
                  name="respondentContact"
                  defaultValue={record.respondentContact ?? ""}
                  className={inputCls}
                />
              </div>
            </>
          )}
          {hasRespondent === "no" && (
            <p className="text-[13px] text-zinc-500 sm:col-span-2">
              Will be recorded as <strong>Abandoned</strong>.
            </p>
          )}
        </div>
      </FormSection>

      {/* Forest products */}
      <FormSection
        title="Forest products"
        action={
          <button
            type="button"
            onClick={() => setItems((r) => [...r, emptyForestRow(nextKey())])}
            className="text-[13px] font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            + Add product
          </button>
        }
      >
        {items.length === 0 ? (
          <p className="text-[13px] text-zinc-500">No forest products.</p>
        ) : (
          <div className="space-y-3">
            {items.map((row) => (
              <div key={row.k} className="relative grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 p-3 pt-10 dark:border-zinc-700 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setItems((r) => r.filter((x) => x.k !== row.k))}
                  className="absolute right-2 top-2 text-[12px] text-zinc-500 hover:text-red-600"
                  aria-label="Remove product"
                >
                  ✕
                </button>
                <ForestRowFields
                  row={row}
                  onChange={(p) => patchItem(row.k, p)}
                  named
                  styles={rowStyles}
                />
              </div>
            ))}
          </div>
        )}
      </FormSection>

      {/* Conveyances */}
      <FormSection
        title="Conveyances"
        action={
          <button
            type="button"
            onClick={() => setConvs((r) => [...r, emptyConvRow(nextKey())])}
            className="text-[13px] font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            + Add conveyance
          </button>
        }
      >
        {convs.length === 0 ? (
          <p className="text-[13px] text-zinc-500">No conveyances.</p>
        ) : (
          <div className="space-y-3">
            {convs.map((row) => (
              <div key={row.k} className="relative grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 p-3 pt-10 dark:border-zinc-700 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setConvs((r) => r.filter((x) => x.k !== row.k))}
                  className="absolute right-2 top-2 text-[12px] text-zinc-500 hover:text-red-600"
                  aria-label="Remove conveyance"
                >
                  ✕
                </button>
                <ConvRowFields
                  row={row}
                  onChange={(p) => patchConv(row.k, p)}
                  named
                  styles={rowStyles}
                />
              </div>
            ))}
          </div>
        )}
      </FormSection>

      {/* Equipment */}
      <FormSection
        title="Equipment / implements"
        action={
          <button
            type="button"
            onClick={() => setEquip((r) => [...r, emptyEquipRow(nextKey())])}
            className="text-[13px] font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            + Add equipment
          </button>
        }
      >
        {equip.length === 0 ? (
          <p className="text-[13px] text-zinc-500">No equipment.</p>
        ) : (
          <div className="space-y-3">
            {equip.map((row) => (
              <div key={row.k} className="relative grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 p-3 pt-10 dark:border-zinc-700 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setEquip((r) => r.filter((x) => x.k !== row.k))}
                  className="absolute right-2 top-2 text-[12px] text-zinc-500 hover:text-red-600"
                  aria-label="Remove equipment"
                >
                  ✕
                </button>
                <EquipRowFields
                  row={row}
                  onChange={(p) => patchEquip(row.k, p)}
                  named
                  styles={rowStyles}
                />
              </div>
            ))}
          </div>
        )}
      </FormSection>

      {/* ACP */}
      <FormSection title="ACP conducted">
        <div className="grid gap-4 sm:grid-cols-2">
          <YesNo
            name="acpConducted"
            label="ACP conducted?"
            value={acpConducted}
            onChange={setAcpConducted}
          />
          {acpConducted === "yes" && (
            <>
              <div>
                <label className={labelCls}>ACP date</label>
                <input type="date" name="acpDate" defaultValue={record.acpDate ?? ""} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Endorsed to PENRO</label>
                <input
                  type="date"
                  name="acpEndorsedToPenro"
                  defaultValue={record.acpEndorsedToPenro ?? ""}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Endorsed to RO</label>
                <input
                  type="date"
                  name="acpEndorsedToRo"
                  defaultValue={record.acpEndorsedToRo ?? ""}
                  className={inputCls}
                />
              </div>
            </>
          )}
        </div>
      </FormSection>

      {/* Promulgation */}
      <FormSection title="Promulgation & docket">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Date of promulgation</label>
            <input
              type="date"
              name="dateOfPromulgation"
              defaultValue={record.dateOfPromulgation ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Promulgated by</label>
            <input
              name="promulgatedBy"
              defaultValue={record.promulgatedBy ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Docket no.</label>
            <input
              name="docketNumber"
              defaultValue={record.docketNumber ?? ""}
              className={inputCls}
            />
          </div>
        </div>
      </FormSection>

      {/* Appraisals */}
      <FormSection title="Appraisal conducted">
        <div className="grid gap-4 sm:grid-cols-2">
          <YesNo
            name="appraisalConducted"
            label="Appraisal conducted?"
            value={appraisalConducted}
            onChange={(v) => {
              setAppraisalConducted(v);
              if (v === "no") {
                setAppraisalFp("no");
                setAppraisalConv("no");
                setAppraisalEquip("no");
              }
            }}
          />
        </div>

        {appraisalConducted === "yes" && (
          <div className="mt-4 space-y-6">
            {/* Forest products */}
            <div className="space-y-3">
              <YesNo
                name="appraisalForestProducts"
                label="Forest products"
                value={appraisalFp}
                onChange={setAppraisalFp}
              />
              {appraisalFp === "yes" && (
                <div className="space-y-3 rounded-md border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-600 dark:bg-zinc-900/40">
                  <div>
                    <label className={labelCls}>Date of appraisal</label>
                    <input
                      type="date"
                      name="appraisalForestProductsDate"
                      defaultValue={record.appraisalForestProductsDate ?? ""}
                      className={inputCls}
                    />
                  </div>
                  {items.length === 0 ? (
                    <p className="text-[13px] text-zinc-500">No forest products encoded yet. Add them in the “Forest products” section above — they will appear here for appraisal.</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[12px] text-zinc-500">
                        Same entries as above — update them here as appraised.
                      </p>
                      {items.map((row, idx) => (
                        <div
                          key={row.k}
                          className="grid gap-2 rounded-md border border-zinc-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-950/40 sm:grid-cols-2 lg:grid-cols-3"
                        >
                          <p className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500 sm:col-span-2 lg:col-span-3">
                            Product {idx + 1}
                          </p>
                          <ForestRowFields
                            row={row}
                            onChange={(p) => patchItem(row.k, p)}
                            named={false}
                            styles={rowStyles}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Conveyances */}
            <div className="space-y-3">
              <YesNo
                name="appraisalConveyances"
                label="Conveyances"
                value={appraisalConv}
                onChange={setAppraisalConv}
              />
              {appraisalConv === "yes" && (
                <div className="space-y-3 rounded-md border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-600 dark:bg-zinc-900/40">
                  <div>
                    <label className={labelCls}>Date of appraisal</label>
                    <input
                      type="date"
                      name="appraisalConveyancesDate"
                      defaultValue={record.appraisalConveyancesDate ?? ""}
                      className={inputCls}
                    />
                  </div>
                  {convs.length === 0 ? (
                    <p className="text-[13px] text-zinc-500">No conveyances encoded yet. Add them in the “Conveyances” section above — they will appear here for appraisal.</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[12px] text-zinc-500">
                        Same entries as above — update them here as appraised.
                      </p>
                      {convs.map((row, idx) => (
                        <div
                          key={row.k}
                          className="grid gap-2 rounded-md border border-zinc-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-950/40 sm:grid-cols-2 lg:grid-cols-3"
                        >
                          <p className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500 sm:col-span-2 lg:col-span-3">
                            Conveyance {idx + 1}
                          </p>
                          <ConvRowFields
                            row={row}
                            onChange={(p) => patchConv(row.k, p)}
                            named={false}
                            styles={rowStyles}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Equipment */}
            <div className="space-y-3">
              <YesNo
                name="appraisalEquipment"
                label="Equipment"
                value={appraisalEquip}
                onChange={setAppraisalEquip}
              />
              {appraisalEquip === "yes" && (
                <div className="space-y-3 rounded-md border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-600 dark:bg-zinc-900/40">
                  <div>
                    <label className={labelCls}>Date of appraisal</label>
                    <input
                      type="date"
                      name="appraisalEquipmentDate"
                      defaultValue={record.appraisalEquipmentDate ?? ""}
                      className={inputCls}
                    />
                  </div>
                  {equip.length === 0 ? (
                    <p className="text-[13px] text-zinc-500">No equipment encoded yet. Add it in the “Equipment / implements” section above — it will appear here for appraisal.</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[12px] text-zinc-500">
                        Same entries as above — update them here as appraised.
                      </p>
                      {equip.map((row, idx) => (
                        <div
                          key={row.k}
                          className="grid gap-2 rounded-md border border-zinc-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-950/40 sm:grid-cols-2 lg:grid-cols-3"
                        >
                          <p className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500 sm:col-span-2 lg:col-span-3">
                            Equipment {idx + 1}
                          </p>
                          <EquipRowFields
                            row={row}
                            onChange={(p) => patchEquip(row.k, p)}
                            named={false}
                            styles={rowStyles}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {appraisalConducted === "no" && (
          <>
            <input type="hidden" name="appraisalForestProducts" value="no" />
            <input type="hidden" name="appraisalConveyances" value="no" />
            <input type="hidden" name="appraisalEquipment" value="no" />
            <p className="mt-3 text-[13px] text-zinc-500 dark:text-zinc-400">
              Will be recorded as <strong>None</strong>.
            </p>
          </>
        )}
      </FormSection>

      {/* Donation */}
      <FormSection title="Donation made">
        <YesNo
          name="donationMade"
          label="Donation made?"
          value={donationMade}
          onChange={setDonationMade}
        />
        {donationMade === "yes" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>FP date</label>
              <input name="donationFpDate" defaultValue={record.donationFpDate ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>FP donor</label>
              <input name="donationFpDonor" defaultValue={record.donationFpDonor ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>FP donee</label>
              <input name="donationFpDonee" defaultValue={record.donationFpDonee ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>FP volume</label>
              <input name="donationFpVolume" defaultValue={record.donationFpVolume ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Conv. date</label>
              <input name="donationConvDate" defaultValue={record.donationConvDate ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Conv. donor</label>
              <input name="donationConvDonor" defaultValue={record.donationConvDonor ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Conv. donee</label>
              <input name="donationConvDonee" defaultValue={record.donationConvDonee ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Equip. date</label>
              <input name="donationEquipDate" defaultValue={record.donationEquipDate ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Equip. donor</label>
              <input name="donationEquipDonor" defaultValue={record.donationEquipDonor ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Equip. donee</label>
              <input name="donationEquipDonee" defaultValue={record.donationEquipDonee ?? ""} className={inputCls} />
            </div>
          </div>
        )}
      </FormSection>

      {/* Legacy / notes */}
      <FormSection title="Additional notes">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Source of forest products</label>
            <input name="sourcePlace" defaultValue={record.sourcePlace ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Land classification</label>
            <input name="landClassification" defaultValue={record.landClassification ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Place impounded / custodian</label>
            <input name="custodianLocation" defaultValue={record.custodianLocation ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Other agencies</label>
            <input name="otherAgencies" defaultValue={record.otherAgencies ?? ""} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Circumstances / remarks</label>
          <textarea name="remarks" defaultValue={record.remarks ?? record.circumstances ?? ""} rows={3} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Other remarks</label>
          <textarea name="otherRemarks" defaultValue={record.otherRemarks ?? ""} rows={2} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Case status</label>
          <textarea name="caseStatus" defaultValue={record.caseStatus ?? ""} rows={2} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Case documents (Google Drive)</label>
          <CaseDocumentsUpload
            name="caseDocumentsUrl"
            existingUrl={record.caseDocumentsUrl ?? null}
            caseLabel={
              record.docketNumber ||
              (record.id != null ? `Case-${record.id}` : undefined)
            }
          />
          <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
            Upload a scan/PDF to Drive. The link is saved on this record.
          </p>
        </div>
      </FormSection>

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-emerald-600 px-4 py-2 text-[14px] font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Saving..." : "Save changes"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-zinc-300 px-4 py-2 text-[14px] text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        ) : (
          <Link
            href={`/records/${record.id}`}
            className="rounded-md border border-zinc-300 px-4 py-2 text-[14px] text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
