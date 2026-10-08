"use client";

import { useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "September 21, 2026" -> "2026-09-21" (empty if the text can't be read)
function textToIso(text: string): string {
  const m = text.trim().match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!m) return "";
  const idx = MONTHS.findIndex((x) => x.toLowerCase().startsWith(m[1].toLowerCase().slice(0, 3)));
  if (idx < 0) return "";
  return `${m[3]}-${String(idx + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

// "2026-09-21" -> "September 21, 2026"
function isoToText(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  if (!y || !mo || !d) return "";
  return `${MONTHS[mo - 1]} ${d}, ${y}`;
}

export function DateOfApprehensionField({
  defaultValue = "",
  className,
}: {
  defaultValue?: string;
  className?: string;
}) {
  const [text, setText] = useState(defaultValue); // what gets saved
  const [iso, setIso] = useState(textToIso(defaultValue)); // what the picker shows

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value; // "YYYY-MM-DD" or ""
    setIso(value);
    setText(value ? isoToText(value) : "");

    // Keep the Year and Month fields in step with the chosen date
    if (value) {
      const form = e.target.form;
      const [y, mo] = value.split("-");
      const year = form?.elements.namedItem("year") as HTMLInputElement | null;
      const month = form?.elements.namedItem("month") as HTMLSelectElement | null;
      if (year) year.value = y;
      if (month) month.value = String(Number(mo));
    }
  }

  return (
    <>
      <input type="date" value={iso} onChange={handleChange} className={className} />
      {/* The text version is what is sent to the server */}
      <input type="hidden" name="dateOfApprehension" value={text} />
      {text && !iso && (
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          Current value: {text} (pick a date to replace it)
        </p>
      )}
    </>
  );
}