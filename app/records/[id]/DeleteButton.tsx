"use client";

import { deleteRecord } from "../actions";

export function DeleteButton({ recordId }: { recordId: number }) {
  return (
    <form
      action={deleteRecord}
      onSubmit={(e) => {
        if (!confirm("Are you sure you want to delete this record? This cannot be undone from the UI.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={recordId} />
      <button
        type="submit"
        className="w-full rounded-md border border-red-300 bg-white px-4 py-2 text-[14px] text-red-700 hover:bg-red-50"
      >
        Delete record
      </button>
    </form>
  );
}