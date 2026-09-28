"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { getRecordForEdit } from "./actions";
import { EditForm } from "./[id]/edit/EditForm";

const DEFAULT_BUTTON =
  "rounded-md border border-[#D8D3C4] bg-white px-3 py-1 text-[13px] text-[#4A6741] hover:bg-[#F0EDE3]";

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
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
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
            <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">Edit record #{recordId}</h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="text-2xl leading-none text-[#5B6156] hover:text-black"
                >
                  ×
                </button>
              </div>

              {error && <p className="text-[14px] text-red-600">{error}</p>}
              {!record && !error && <p className="text-[14px] text-[#5B6156]">Loading...</p>}
              {record && <EditForm record={record} onSaved={saved} onCancel={close} />}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}