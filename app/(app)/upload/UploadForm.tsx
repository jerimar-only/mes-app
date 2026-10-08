"use client";

import { useRef, useState } from "react";
import { uploadExcel } from "./actions";

type Row = { row: number; message: string };

type UploadResult = {
  imported: number;
  skipped?: number;
  skippedRows?: Row[];
  totalRead?: number;
  errors: Row[];
};

export default function UploadForm() {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await uploadExcel(formData);
      setResult(res);
    } catch (err) {
      setResult({
        imported: 0,
        errors: [{ row: 0, message: err instanceof Error ? err.message : "Upload failed." }],
      });
    } finally {
      setLoading(false);
    }
  }

  const skipped = result?.skipped ?? result?.skippedRows?.length ?? 0;
  const errorCount = result?.errors.length ?? 0;

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card,transparent)] p-4 sm:p-5"
      >
        <div>
          <span className="mb-1.5 block text-[14px] font-medium text-[var(--foreground)]">
            Excel file (.xlsx)
          </span>

          {/* Real input is hidden; the button below matches the other buttons */}
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept=".xlsx,.xls"
            required
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-md border border-[#D8D3C4] bg-white px-4 py-2 text-[14px] text-[#4A6741] hover:bg-[#F0EDE3] sm:w-auto"
            >
              Choose file
            </button>
            <span className="min-w-0 truncate text-[14px] text-[var(--muted)]">
              {fileName || "No file selected"}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !fileName}
          className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-[14px] text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Uploading… please wait" : "Upload"}
        </button>
      </form>

      {result && (
        <div className="space-y-3 text-[14px]">
          <p
            className={`rounded-md border p-3 ${
              result.imported > 0
                ? "border-[#4A6741]/40 bg-[#4A6741]/10 text-[var(--foreground)]"
                : "border-[var(--border)] text-[var(--foreground)]"
            }`}
          >
            {result.totalRead !== undefined && (
              <>
                {result.totalRead} record{result.totalRead === 1 ? "" : "s"} found in the file:{" "}
              </>
            )}
            <strong>{result.imported} imported</strong>
            {" · "}
            {skipped} skipped (already in the system)
            {" · "}
            {errorCount} with problems
          </p>

          {skipped > 0 && result.skippedRows && result.skippedRows.length > 0 && (
            <details className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-[var(--foreground)]">
              <summary className="cursor-pointer font-medium">
                {skipped} row{skipped === 1 ? "" : "s"} skipped because they already exist
              </summary>
              <ul className="mt-2 max-h-60 list-disc space-y-1 overflow-y-auto pl-5">
                {result.skippedRows.map((s, i) => (
                  <li key={i}>
                    Row {s.row}: {s.message}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {errorCount > 0 && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-[var(--foreground)]">
              <p className="font-medium">
                {errorCount} row{errorCount === 1 ? "" : "s"} had problems:
              </p>
              <ul className="mt-2 max-h-60 list-disc space-y-1 overflow-y-auto pl-5">
                {result.errors.map((er, i) => (
                  <li key={i}>
                    {er.row > 0 ? `Row ${er.row}: ` : ""}
                    {er.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}