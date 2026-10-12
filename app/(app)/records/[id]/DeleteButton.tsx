"use client";

import { useState, useTransition } from "react";
import { deleteRecord } from "../actions";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";

export function DeleteButton({ recordId }: { recordId: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { flash, error } = useToast();

  function handleConfirm() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("id", String(recordId));
        flash("success", "Record was deleted.", "Deleted");
        await deleteRecord(formData);
        setOpen(false);
      } catch (err) {
        if (
          typeof err === "object" &&
          err !== null &&
          "digest" in err &&
          String((err as { digest?: string }).digest || "").startsWith("NEXT_REDIRECT")
        ) {
          return;
        }
        error(err instanceof Error ? err.message : "Could not delete record.");
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-red-500/40 bg-[var(--card)] px-4 py-2 text-[14px] text-red-700 hover:bg-red-500/10 dark:text-red-400"
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
