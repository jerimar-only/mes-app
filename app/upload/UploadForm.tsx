"use client";

import { useState } from "react";
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
        errors: [
          {
            row: 0,
            message: err instanceof Error ? err.message : "Upload failed.",
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  const skipped = result?.skipped ?? result?.skippedRows?.length ?? 0;
  const errorCount = result?.errors.length ?? 0;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Excel file (.xlsx)</span>
          <input
            type="file"
            name="file"
            accept=".xlsx,.xls"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-white hover:file:bg-blue-700"
          />
        </label>
        {fileName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
            Selected: {fileName}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !fileName}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Uploading… please wait" : "Upload"}
        </button>
      </form>

      {result && (
        <div className="space-y-3 text-sm">
          {/* Summary */}
          <p
            className={`rounded-md border p-3 ${
              result.imported > 0
                ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
                : "border-gray-300 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
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

          {/* Skipped rows */}
          {skipped > 0 && result.skippedRows && result.skippedRows.length > 0 && (
            <details className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
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

          {/* Errors */}
          {errorCount > 0 && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
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