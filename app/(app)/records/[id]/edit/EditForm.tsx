"use client";

import { useState } from "react";
import Link from "next/link";
import { updateRecord, updateRecordInline } from "../../actions";
import { DateOfApprehensionField } from "@/components/ui/DateOfApprehensionField";
import { useToast } from "@/components/ui/Toast";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[14px] text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500";
const labelCls =
  "mb-1 block text-[13px] font-medium text-zinc-700 dark:text-zinc-300";

let counter = 0;
const nextKey = () => ++counter;

type Item = { qty: string; species: string; forms: string; bdft: string; cum: string; value: string };
type Pair = { type: string; qty: string; value: string };

type EditFormProps = {
  record: any;
  // Provided by the modal. When absent (full edit page), the form
  // submits to updateRecord, which redirects to the record page.
  onSaved?: () => void;
  onCancel?: () => void;
};

export function EditForm({ record, onSaved, onCancel }: EditFormProps) {
  const [items, setItems] = useState<any[]>(() =>
    record.items.map((i: Item) => ({ ...i, k: nextKey() }))
  );
  const [convs, setConvs] = useState<any[]>(() =>
    record.conveyances.map((c: Pair) => ({ ...c, k: nextKey() }))
  );
  const [equip, setEquip] = useState<any[]>(() =>
    record.equipment.map((e: Pair) => ({ ...e, k: nextKey() }))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { success, error: toastError, flash } = useToast();

  async function handleInlineSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateRecordInline(new FormData(e.currentTarget));
      success("Record changes were saved.", "Saved");
      onSaved?.();
    } catch {
      const msg = "Could not save changes. Please try again.";
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
      flash("success", "Record changes were saved.", "Saved");
      await updateRecord(new FormData(e.currentTarget));
    } catch {
      const msg = "Could not save changes. Please try again.";
      setError(msg);
      toastError(msg);
      setBusy(false);
    }
  }

  const field = (name: string, title: string, multiline = false) => (
    <div>
      <label className={labelCls}>{title}</label>
      {multiline ? (
        <textarea name={name} defaultValue={record[name]} rows={3} className={inputCls} />
      ) : (
        <input type="text" name={name} defaultValue={record[name]} className={inputCls} />
      )}
    </div>
  );

  const dateField = (name: string, title: string) => (
    <div>
      <label className={labelCls}>{title}</label>
      <input type="date" name={name} defaultValue={record[name]} className={inputCls} />
    </div>
  );

  // Modal and page mode both go through client handlers so toasts fire.
  const formProps = onSaved
    ? { onSubmit: handleInlineSubmit }
    : { onSubmit: handlePageSubmit };

  return (
    <form {...formProps} className="space-y-6">
      <input type="hidden" name="id" value={record.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Date of apprehension</label>
          <DateOfApprehensionField
            defaultValue={record.dateOfApprehension ?? ""}
            className={inputCls}
          />
        </div>
        {field("placeOfApprehension", "Place of apprehension")}
        {field("sourcePlace", "Place of the source of forest products")}
        {field("gpsCoordinates", "GPS coordinates")}
        {field("landClassification", "Land classification")}
        {field("apprehendingAgency", "Apprehending officers")}
        {field("claimantRespondent", "Name of claimant/owner")}
        {field("custodianLocation", "Place impounded / custodian")}
        {field("otherAgencies", "Other agencies involved")}
      </div>

      {field("circumstances", "Circumstances", true)}

      <div>
        <h2 className="mb-2 text-[13px] font-medium text-zinc-700 dark:text-zinc-300">Forest products</h2>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.k} className="grid grid-cols-7 gap-2">
              <input name="itemQty" defaultValue={it.qty} placeholder="Qty" className={`${inputCls} col-span-2`} />
              <input name="itemSpecies" defaultValue={it.species} placeholder="Species" className={inputCls} />
              <input name="itemForms" defaultValue={it.forms} placeholder="Forms" className={inputCls} />
              <input name="itemVolumeBdFt" defaultValue={it.bdft} placeholder="bd.ft." className={inputCls} />
              <input name="itemVolumeCuM" defaultValue={it.cum} placeholder="cu.m." className={inputCls} />
              <div className="flex gap-2">
                <input name="itemValue" defaultValue={it.value} placeholder="Value (₱)" className={inputCls} />
                <button
                  type="button"
                  onClick={() => setItems(items.filter((x) => x.k !== it.k))}
                  className="text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-[13px] text-zinc-500 dark:text-zinc-400">No product items.</p>}
        </div>
        <button
          type="button"
          onClick={() =>
            setItems([...items, { qty: "", species: "", forms: "", bdft: "", cum: "", value: "", k: nextKey() }])
          }
          className="mt-2 rounded-md border border-zinc-300 px-3 py-1.5 text-[14px] font-medium text-emerald-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-emerald-400 dark:hover:bg-zinc-800"
        >
          + Add product
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <PairRows
          title="Conveyances"
          typeName="convType"
          qtyName="convQty"
          valueName="convValue"
          rows={convs}
          setRows={setConvs}
        />
        <PairRows
          title="Equipment / tools"
          typeName="equipType"
          qtyName="equipQty"
          valueName="equipValue"
          rows={equip}
          setRows={setEquip}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {dateField("acpEndorsedToPenro", "ACP endorsed to PENRO")}
        {dateField("acpEndorsedToRo", "ACP endorsed to RO")}
      </div>

      {field("otherRemarks", "Other remarks (condition, status of criminal complaint)", true)}
      {field("remarks", "Remarks", true)}
      {field("caseStatus", "Case status (filed in court or prosecutor's office)", true)}

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

function PairRows({
  title,
  typeName,
  qtyName,
  valueName,
  rows,
  setRows,
}: {
  title: string;
  typeName: string;
  qtyName: string;
  valueName: string;
  rows: any[];
  setRows: (r: any[]) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-[13px] font-medium text-zinc-700 dark:text-zinc-300">{title}</h2>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.k} className="flex gap-2">
            <input name={typeName} defaultValue={r.type} placeholder="Type" className={inputCls} />
            <input
              name={qtyName}
              type="number"
              min={1}
              defaultValue={r.qty}
              placeholder="Qty"
              className={`${inputCls} w-20 shrink-0`}
            />
            <input
              name={valueName}
              defaultValue={r.value}
              placeholder="Value (₱)"
              className={`${inputCls} w-28 shrink-0`}
            />
            <button
              type="button"
              onClick={() => setRows(rows.filter((x) => x.k !== r.k))}
              className="text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-[13px] text-zinc-500 dark:text-zinc-400">None</p>}
      </div>
      <button
        type="button"
        onClick={() => setRows([...rows, { type: "", qty: "1", value: "", k: nextKey() }])}
        className="mt-2 rounded-md border border-zinc-300 px-3 py-1.5 text-[14px] font-medium text-emerald-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-emerald-400 dark:hover:bg-zinc-800"
      >
        + Add
      </button>
    </div>
  );
}