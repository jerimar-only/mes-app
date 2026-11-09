"use client";

import { useState } from "react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "September 21, 2026" / "Sept 21, 2026" → "2026-09-21" (empty if unreadable) */
export function textToIso(text: string): string {
  const m = text
    .trim()
    .match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!m) return "";
  const idx = MONTHS.findIndex((x) =>
    x.toLowerCase().startsWith(m[1].toLowerCase().slice(0, 3)),
  );
  if (idx < 0) return "";
  return `${m[3]}-${String(idx + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

/** "2026-09-21" → "September 21, 2026" */
export function isoToText(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  if (!y || !mo || !d) return "";
  return `${MONTHS[mo - 1]} ${d}, ${y}`;
}

/** "2026-09-21" or Date → "09/21/2026" */
export function isoToNumeric(iso: string): string {
  const [y, mo, d] = iso.split("-");
  if (!y || !mo || !d) return "";
  return `${mo}/${d}/${y}`;
}

const datePickerClass =
  "cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:scale-125";

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try {
    e.currentTarget.showPicker?.();
  } catch {
    /* showPicker not supported or not allowed */
  }
}

type LongDateFieldProps = {
  /** Form field name for the value that is submitted */
  name: string;
  defaultValue?: string;
  className?: string;
  required?: boolean;
  /**
   * What to submit in the named field:
   * - "text" → "November 6, 2026" (string columns)
   * - "iso"  → "2026-11-06" (DateTime columns / reliable parsing)
   */
  submitFormat?: "text" | "iso";
  /** Also post mm/dd/yyyy under this name when set (e.g. companion numeric field) */
  numericName?: string;
  /** Sync year/month form fields when the date changes (date of apprehension) */
  syncYearMonth?: boolean;
};

/**
 * Date control that picks with the native calendar but shows / can submit
 * long form dates like "November 6, 2026".
 */
export function LongDateField({
  name,
  defaultValue = "",
  className,
  required,
  submitFormat = "text",
  numericName,
  syncYearMonth = false,
}: LongDateFieldProps) {
  // Accept either long text or ISO as the initial value
  const initialIso =
    textToIso(defaultValue) ||
    (/^\d{4}-\d{2}-\d{2}$/.test(defaultValue.trim()) ? defaultValue.trim() : "");
  const initialText =
    isoToText(initialIso) ||
    (textToIso(defaultValue) ? defaultValue.trim() : "");

  const [iso, setIso] = useState(initialIso);
  const [text, setText] = useState(initialText);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value; // "YYYY-MM-DD" or ""
    setIso(value);
    setText(value ? isoToText(value) : "");

    if (syncYearMonth && value) {
      const form = e.target.form;
      const [y, mo] = value.split("-");
      const year = form?.elements.namedItem("year") as HTMLInputElement | null;
      const month = form?.elements.namedItem("month") as HTMLSelectElement | null;
      if (year) year.value = y;
      if (month) month.value = String(Number(mo));
    }
  }

  const submittedValue =
    submitFormat === "iso" ? iso : text;

  return (
    <>
      {/* Date picker only — long text is submitted via hidden field */}
      <input
        type="date"
        value={iso}
        onChange={handleChange}
        onClick={openPicker}
        required={required && !submittedValue}
        className={[
          "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20",
          datePickerClass,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Pick date"
      />

      {/* Value posted to the server (long text or ISO) */}
      <input type="hidden" name={name} value={submittedValue} />

      {/* Optional mm/dd/yyyy companion field */}
      {numericName ? (
        <input
          type="hidden"
          name={numericName}
          value={iso ? isoToNumeric(iso) : ""}
        />
      ) : null}
    </>
  );
}

/** Backward-compatible export used by edit forms */
export function DateOfApprehensionField({
  defaultValue = "",
  className,
}: {
  defaultValue?: string;
  className?: string;
}) {
  return (
    <LongDateField
      name="dateOfApprehension"
      defaultValue={defaultValue}
      className={className}
      required
      submitFormat="text"
      numericName="dateOfApprehensionNumeric"
      syncYearMonth
    />
  );
}
