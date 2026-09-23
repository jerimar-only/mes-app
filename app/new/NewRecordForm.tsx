"use client";

import { useState } from "react";

type Office = { id: number; name: string };

export default function NewRecordForm({
  offices,
  action,
}: {
  offices: Office[];
  action: (formData: FormData) => void;
}) {
  const [itemRows, setItemRows] = useState([0]);

  return (
    <form action={action} className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">CENRO office</label>
          <select
            name="cenroOfficeId"
            required
            className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
          >
            {offices.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Year</label>
          <input
            type="number"
            name="year"
            required
            defaultValue={new Date().getFullYear()}
            className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Date of apprehension</label>
          <input
            type="text"
            name="dateOfApprehension"
            placeholder="e.g. Jan. 16, 2026"
            className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Place of apprehension</label>
          <input
            type="text"
            name="placeOfApprehension"
            placeholder="e.g. Burubur, Magapit, Lal-lo, Cag."
            className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Circumstances</label>
        <textarea
          name="circumstances"
          rows={2}
          placeholder="e.g. No permit/transport documents"
          className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Custodian / stockpile location</label>
          <input
            type="text"
            name="custodianLocation"
            className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Other agencies involved</label>
          <input
            type="text"
            name="otherAgencies"
            className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-[13px] font-medium text-[#5B6156]">Forest product items</label>
          <button
            type="button"
            onClick={() => setItemRows((rows) => [...rows, rows.length])}
            className="text-[13px] text-[#4A6741] hover:underline"
          >
            + Add item
          </button>
        </div>
        <div className="space-y-2">
          {itemRows.map((row) => (
            <div key={row} className="grid grid-cols-3 gap-2">
              <input
                type="text"
                name="itemDescription"
                placeholder="Description (e.g. 8 pcs. Narra flitches)"
                className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
              />
              <input
                type="number"
                step="any"
                name="itemVolume"
                placeholder="Volume (cu.m.)"
                className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
              />
              <input
                type="number"
                step="any"
                name="itemValue"
                placeholder="Est. value (₱)"
                className="rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">Remarks</label>
        <textarea
          name="remarks"
          rows={3}
          className="w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]"
        />
      </div>

      <button
        type="submit"
        className="rounded-md bg-[#4A6741] px-5 py-2.5 text-[14px] text-white hover:bg-[#3D5636]"
      >
        Save record
      </button>
    </form>
  );
}
