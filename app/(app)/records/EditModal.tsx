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
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");

  async function openModal() {
    setOpen(true);
    setUploading(false);
    setNotice("");
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
    setUploading(false);
    setNotice("");
  }

  // Closing (outside click, Esc, X, Cancel) is blocked while a file is uploading.
  function requestClose() {
    if (uploading) {
      setNotice("A file is still uploading. Please wait until it finishes before closing.");
      return;
    }
    close();
  }

  function saved() {
    close();
    router.refresh();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
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
  }, [open, uploading]);

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
              if (e.target === e.currentTarget) requestClose();
            }}
          >
            <div className="w-full max-w-4xl rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Edit record #{recordId}</h2>
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label="Close"
                  className="text-2xl leading-none text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  ×
                </button>
              </div>

              {notice && (
                <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-[13px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  {notice}
                </p>
              )}
              {error && <p className="text-[14px] text-red-600">{error}</p>}
              {!record && !error && <p className="text-[14px] text-[var(--muted)]">Loading...</p>}
              {record && (
                <EditForm
                  record={record}
                  onSaved={saved}
                  onCancel={requestClose}
                  onBusyChange={(b) => {
                    setUploading(b);
                    if (!b) setNotice("");
                  }}
                />
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}