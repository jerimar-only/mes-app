// NEW FILE: app/records/[id]/PermanentDeleteButton.tsx

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { permanentlyDeleteRecord } from "../actions";
import { useToast } from "@/components/ui/Toast";

export function PermanentDeleteButton({ recordId }: { recordId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { flash, error: toastError } = useToast();

  function close() {
    if (busy) return;
    setOpen(false);
    setPassword("");
    setError("");
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const fd = new FormData();
    fd.set("id", String(recordId));
    fd.set("password", password);

    try {
      const res = await permanentlyDeleteRecord(fd);
      if (!res.ok) {
        const msg = res.error ?? "Something went wrong.";
        setError(msg);
        toastError(msg);
        setBusy(false);
        return;
      }
      flash("success", "Record permanently deleted.", "Deleted");
      router.push("/records?deleted=only");
      router.refresh();
    } catch {
      const msg = "Something went wrong. Please try again.";
      setError(msg);
      toastError(msg);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-red-500/40 bg-[var(--card)] px-4 py-2 text-[14px] text-red-700 hover:bg-red-500/10 dark:text-red-400"
      >
        Delete permanently
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-lg bg-[var(--card)] p-6 text-[var(--foreground)] shadow-xl">
              <h2 className="text-lg font-semibold tracking-tight">Delete permanently?</h2>
              <p className="text-[14px] text-[var(--muted)]">
                This removes the record and all its products, conveyances and equipment for good.
                <span className="font-medium text-red-700"> This cannot be undone.</span> Enter your
                password to confirm.
              </p>

              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--muted)]">Your password</label>
                <input
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-[var(--border-strong)] px-3 py-2 text-[14px]"
                />
                {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  className="rounded-md border border-[var(--border-strong)] px-4 py-2 text-[14px] hover:bg-[var(--shell)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !password}
                  className="rounded-md bg-red-600 px-4 py-2 text-[14px] text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {busy ? "Deleting..." : "Delete permanently"}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </>
  );
}
