"use client";

import { useState } from "react";

type Office = { id: number; name: string };
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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
    <form action={action} className="max-w-3xl space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">CENRO office</label>
          <select name="cenroOfficeId" required className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]">
            {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Year</label>
          <input type="number" name="year" required defaultValue={new Date().getFullYear()} className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Month</label>
          <select name="month" required defaultValue={new Date().getMonth() + 1} className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]">
            {MONTH_NAMES.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Date of apprehension</label>
          <input type="text" name="dateOfApprehension" placeholder="e.g. September 21, 2026" className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Place of apprehension</label>
          <input type="text" name="placeOfApprehension" placeholder="e.g. Sta. Ana, Gattaran, Cagayan" className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Apprehending agency/s</label>
          <input type="text" name="apprehendingAgency" placeholder="e.g. PNP Gattaran" className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Name of claimant/respondent</label>
          <input type="text" name="claimantRespondent" placeholder="e.g. Alfredo B. Pavo" className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Circumstances</label>
        <textarea name="circumstances" rows={2} className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Custodian / stockpile location</label>
          <input type="text" name="custodianLocation" className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Other agencies involved</label>
          <input type="text" name="otherAgencies" className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
        </div>
      </div>

      {/* Forest product items */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-[13px] font-medium text-[#5B6156]">Forest products</label>
          <button type="button" onClick={() => setItemRows((r) => [...r, r.length])} className="text-[13px] text-[#4A6741] hover:underline">+ Add product</button>
        </div>
        <div className="space-y-2">
          {itemRows.map((row) => (
            <div key={row} className="grid grid-cols-5 gap-2">
              <input type="text" name="itemQty" placeholder="Qty (e.g. 7 & 1)" className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
              <input type="text" name="itemSpecies" placeholder="Species (e.g. Gmelina)" className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
              <input type="text" name="itemForms" placeholder="Forms (e.g. Lumber)" className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
              <input type="number" step="any" name="itemVolumeBdFt" placeholder="Volume (BDFT)" className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
              <input type="number" step="any" name="itemVolumeCuM" placeholder="Volume (cu.m., optional)" className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
              <input type="hidden" name="itemValue" value="" />
            </div>
          ))}
        </div>
      </div>

      {/* Conveyances */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-[13px] font-medium text-[#5B6156]">Conveyances (optional)</label>
          <button type="button" onClick={() => setConvRows((r) => [...r, r.length])} className="text-[13px] text-[#4A6741] hover:underline">+ Add conveyance</button>
        </div>
        <div className="space-y-2">
          {convRows.map((row) => (
            <div key={row} className="grid grid-cols-2 gap-2">
              <input type="text" name="convType" placeholder="Type (e.g. Utility vehicle)" className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
              <input type="number" name="convQty" defaultValue={1} min={1} className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
            </div>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-[13px] font-medium text-[#5B6156]">Equipment / tools (optional)</label>
          <button type="button" onClick={() => setEquipRows((r) => [...r, r.length])} className="text-[13px] text-[#4A6741] hover:underline">+ Add equipment</button>
        </div>
        <div className="space-y-2">
          {equipRows.map((row) => (
            <div key={row} className="grid grid-cols-2 gap-2">
              <input type="text" name="equipType" placeholder="Type (e.g. Chainsaw with defaced serial number)" className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
              <input type="number" name="equipQty" defaultValue={1} min={1} className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Remarks</label>
        <textarea name="remarks" rows={3} className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]" />
      </div>

      <button type="submit" className="rounded-md bg-[#4A6741] px-5 py-2.5 text-[14px] text-white hover:bg-[#3D5636]">
        Save record
      </button>
    </form>
  );
}
