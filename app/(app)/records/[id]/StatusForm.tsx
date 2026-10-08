"use client";

import { useEffect, useState, useTransition } from "react";
import { updateRecordStatus } from "../actions";

const STATUS_OPTIONS = [
  ["FOR_RESOLUTION", "For resolution"],
  ["UNDER_ADJUDICATION", "Under adjudication"],
  ["CONFISCATED", "Confiscated"],
  ["DONATED", "Donated"],
  ["RELEASED", "Released"],
  ["UNKNOWN", "Needs review"],
] as const;

const statusLabel = (v: string) => STATUS_OPTIONS.find(([k]) => k === v)?.[1] ?? v;

type Values = { status: string; docketNumber: string; orderOfFinalityDate: string };

export function StatusForm({
  recordId,
  status,
  docketNumber,
  orderOfFinalityDate,
}: {
  recordId: number;
  status: string;
  docketNumber: string | null;
  orderOfFinalityDate: string | null;
}) {
  const initial: Values = {
    status,
    docketNumber: docketNumber ?? "",
    orderOfFinalityDate: orderOfFinalityDate ?? "",
  };

  const [values, setValues] = useState<Values>(initial);
  const [saved, setSaved] = useState<Values>(initial); // last saved values
  const [toast, setToast] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const [pending, startTransition] = useTransition();

  // Keep in sync if the page data changes from elsewhere
  useEffect(() => {
    const next = { status, docketNumber: docketNumber ?? "", orderOfFinalityDate: orderOfFinalityDate ?? "" };
    setValues(next);
    setSaved(next);
  }, [status, docketNumber, orderOfFinalityDate]);

  // Auto-hide the toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Which fields did the user change?
    const lines: string[] = [];
    if (values.status !== saved.status)
      lines.push(`Status: ${statusLabel(saved.status)} → ${statusLabel(values.status)}`);
    if (values.docketNumber !== saved.docketNumber)
      lines.push(`Docket number: ${values.docketNumber || "(cleared)"}`);
    if (values.orderOfFinalityDate !== saved.orderOfFinalityDate)
      lines.push(`Order of finality date: ${values.orderOfFinalityDate || "(cleared)"}`);

    if (lines.length === 0) {
      setToast({ ok: true, lines: ["No changes to save."] });
      return;
    }

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateRecordStatus(formData);
        setSaved(values);
        setToast({ ok: true, lines });
      } catch {
        setToast({ ok: false, lines: ["Could not save. Please try again."] });
      }
    });
  }

  const field =
    "w-full rounded-md border border-[#D8D3C4] px-3 py-2 text-[14px]";
  const label = "mb-1 block text-[13px] font-medium text-[#5B6156]";

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-[#E9E5D8] bg-white p-4"
      >
        <input type="hidden" name="id" value={recordId} />
        <div>
          <label className={label}>Status</label>
          <select
            name="status"
            value={values.status}
            onChange={(e) => setValues({ ...values, status: e.target.value })}
            className={field}
          >
            {STATUS_OPTIONS.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Docket number</label>
          <input
            type="text"
            name="docketNumber"
            value={values.docketNumber}
            onChange={(e) => setValues({ ...values, docketNumber: e.target.value })}
            placeholder="e.g. R2-F-1105"
            className={field}
          />
        </div>
        <div>
          <label className={label}>Order of finality date</label>
          <input
            type="text"
            name="orderOfFinalityDate"
            value={values.orderOfFinalityDate}
            onChange={(e) => setValues({ ...values, orderOfFinalityDate: e.target.value })}
            placeholder="e.g. Sept. 04, 2024"
            className={field}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-[#4A6741] px-4 py-2 text-[14px] text-white hover:bg-[#3D5636] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] rounded-lg border px-4 py-3 text-[14px] shadow-lg sm:max-w-sm ${
            toast.ok
              ? "border-[#4A6741] bg-white text-[#2F4A29]"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{toast.ok ? "✓ Saved" : "Error"}</p>
              <ul className="mt-1 space-y-0.5">
                {toast.lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Close"
              className="text-[#5B6156] hover:text-black"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}