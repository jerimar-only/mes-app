"use client";

import { useState, useTransition } from "react";
import { deleteRecord } from "../actions";
import ConfirmModal from "@/components/ui/ConfirmModal";

export function DeleteButton({ recordId }: { recordId: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", String(recordId));
      await deleteRecord(formData);
      // deleteRecord should redirect; if not, navigate manually:
      // window.location.href = "/records";
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-red-300 bg-white px-4 py-2 text-[14px] text-red-700 hover:bg-red-50"
      >
        Delete record
      </button>

      <ConfirmModal
        open={open}
        title="Delete this record?"
        message="This cannot be undone. The record will be marked as deleted."
        confirmLabel={isPending ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        danger
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}