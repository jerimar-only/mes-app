"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { getRecordForEdit } from "./actions";
import { EditForm } from "./[id]/edit/EditForm";

const DEFAULT_BUTTON =
  "rounded-md border border-zinc-300 bg-white px-3 py-1 text-[13px] font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";

export function EditModal({
  recordId,
  label = "Edit",
  className = DEFAULT_BUTTON,
}: {
  recordId: number;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [error, setError] = useState("");

  async function openModal() {
    setOpen(true);
    setRecord(null);
    setError("");
    try {
      const data = await getRecordForEdit(recordId);
      if (!data) setError("Record not found.");
      else setRecord(data);
    } catch {
      setError("Could not load the record.");
    }
  }

  function close() {
    setOpen(false);
    setRecord(null);
  }

  function saved() {
    close();
    router.refresh();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    // Always force-unlock on close — never restore a prior "hidden"
    // (restoring prev can leave mobile scroll stuck after sidebar/modal stacking).
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={openModal} className={className}>
        {label}
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div className="w-full max-w-4xl rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Edit record #{recordId}</h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="text-2xl leading-none text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  ×
                </button>
              </div>

              {error && <p className="text-[14px] text-red-600">{error}</p>}
              {!record && !error && <p className="text-[14px] text-[var(--muted)]">Loading...</p>}
              {record && <EditForm record={record} onSaved={saved} onCancel={close} />}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}