"use client";

import { useEffect, useState, useTransition } from "react";
import { updateRecordStatus } from "../actions";
import { useToast } from "@/components/ui/Toast";

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
  const [pending, startTransition] = useTransition();
  const { success, error } = useToast();

  // Keep in sync if the page data changes from elsewhere
  useEffect(() => {
    const next = { status, docketNumber: docketNumber ?? "", orderOfFinalityDate: orderOfFinalityDate ?? "" };
    setValues(next);
    setSaved(next);
  }, [status, docketNumber, orderOfFinalityDate]);

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
      success("No changes to save.", "Nothing to update");
      return;
    }

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateRecordStatus(formData);
        setSaved(values);
        // Immediate toast (same page)
        success(lines.join(" · "), "Saved");
      } catch (err) {
        // Ignore Next.js redirect errors if any
        if (
          typeof err === "object" &&
          err !== null &&
          "digest" in err &&
          String((err as { digest?: string }).digest || "").startsWith("NEXT_REDIRECT")
        ) {
          return;
        }
        error("Could not save. Please try again.");
      }
    });
  }

  const field =
    "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[14px] text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";
  const label = "mb-1 block text-[13px] font-medium text-zinc-600 dark:text-zinc-300";

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
          className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-[14px] text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </>
  );
}