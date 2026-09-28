// FILE: app/records/[id]/edit/EditForm.tsx  (replace the whole file)

"use client";

import { useState } from "react";
import Link from "next/link";
import { updateRecord } from "../../actions";

const inputCls = "w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]";
const labelCls = "mb-1 block text-[13px] font-medium text-[#5B6156]";

let counter = 0;
const nextKey = () => ++counter;

type Item = { qty: string; species: string; forms: string; bdft: string; cum: string; value: string };
type Pair = { type: string; qty: string; value: string };

export function EditForm({ record }: { record: any }) {
  const [items, setItems] = useState<any[]>(() =>
    record.items.map((i: Item) => ({ ...i, k: nextKey() }))
  );
  const [convs, setConvs] = useState<any[]>(() =>
    record.conveyances.map((c: Pair) => ({ ...c, k: nextKey() }))
  );
  const [equip, setEquip] = useState<any[]>(() =>
    record.equipment.map((e: Pair) => ({ ...e, k: nextKey() }))
  );

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

  return (
    <form action={updateRecord} className="space-y-6">
      <input type="hidden" name="id" value={record.id} />

      {field("dateOfApprehension", "Date of apprehension")}
      {field("placeOfApprehension", "Place of apprehension")}
      {field("apprehendingAgency", "Apprehending agency/s")}
      {field("claimantRespondent", "Name of claimant/respondent")}
      {field("circumstances", "Circumstances", true)}
      {field("custodianLocation", "Custodian / stockpile location")}
      {field("otherAgencies", "Other agencies involved")}
      {field("remarks", "Remarks (original)", true)}

      <div>
        <h2 className="mb-2 text-[13px] font-medium text-[#5B6156]">Forest products</h2>
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
          {items.length === 0 && <p className="text-[13px] text-[#5B6156]">No product items.</p>}
        </div>
        <button
          type="button"
          onClick={() =>
            setItems([...items, { qty: "", species: "", forms: "", bdft: "", cum: "", value: "", k: nextKey() }])
          }
          className="mt-2 rounded-md border border-[#D8D3C4] px-3 py-1.5 text-[14px] text-[#4A6741] hover:bg-[#F0EDE3]"
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

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-md bg-[#4A6741] px-4 py-2 text-[14px] text-white hover:bg-[#3D5636]"
        >
          Save changes
        </button>
        <Link
          href={`/records/${record.id}`}
          className="rounded-md border border-[#D8D3C4] px-4 py-2 text-[14px]"
        >
          Cancel
        </Link>
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
      <h2 className="mb-2 text-[13px] font-medium text-[#5B6156]">{title}</h2>
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
              className="w-20 shrink-0 rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
            />
            <input
              name={valueName}
              defaultValue={r.value}
              placeholder="Value (₱)"
              className="w-28 shrink-0 rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
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
        {rows.length === 0 && <p className="text-[13px] text-[#5B6156]">None</p>}
      </div>
      <button
        type="button"
        onClick={() => setRows([...rows, { type: "", qty: "1", value: "", k: nextKey() }])}
        className="mt-2 rounded-md border border-[#D8D3C4] px-3 py-1.5 text-[14px] text-[#4A6741] hover:bg-[#F0EDE3]"
      >
        + Add
      </button>
    </div>
  );
}
