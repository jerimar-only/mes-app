"use client";

/**
 * File: app/(app)/upload/UploadForm.tsx
 * Excel upload form using AttachmentUpload dropzone.
 */

import { useState } from "react";
import { uploadExcel } from "./actions";
import {
  AttachmentUpload,
  type AttachmentUploadItem,
} from "@/components/ui/AttachmentUpload";
import { useToast } from "@/components/ui/Toast";

type Row = { row: number; message: string };

type UploadResult = {
  imported: number;
  skipped?: number;
  skippedRows?: Row[];
  totalRead?: number;
  errors: Row[];
};

export default function UploadForm() {
  const [items, setItems] = useState<AttachmentUploadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [rejectMsg, setRejectMsg] = useState<string | null>(null);
  const { success, error } = useToast();

  async function handleUpload() {
    const file = items[0]?.file;
    if (!file) return;

    setLoading(true);
    setResult(null);
    setRejectMsg(null);

    // Mark row as uploading
    setItems((prev) =>
      prev.map((it) => ({ ...it, status: "uploading" as const, error: undefined }))
    );

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadExcel(formData);
      setResult(res);

      const failed = res.imported === 0 && res.errors.length > 0;
      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          status: failed ? ("failed" as const) : ("complete" as const),
          error: failed ? res.errors[0]?.message : undefined,
        }))
      );
      if (failed) {
        error(res.errors[0]?.message || "Upload finished with errors.", "Upload failed");
      } else {
        success(
          `${res.imported} record${res.imported === 1 ? "" : "s"} imported.`,
          "Upload complete"
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setResult({
        imported: 0,
        errors: [{ row: 0, message }],
      });
      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          status: "failed" as const,
          error: message,
        }))
      );
      error(message, "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  const skipped = result?.skipped ?? result?.skippedRows?.length ?? 0;
  const errorCount = result?.errors.length ?? 0;
  const hasFile = items.length > 0 && !!items[0]?.file;

  return (
    <div className="space-y-5">
      <AttachmentUpload
        value={items}
        onValueChange={(next) => {
          setItems(next);
          setResult(null);
          setRejectMsg(null);
        }}
        onFilesRejected={(files, reason) => {
          if (reason === "too-large") {
            setRejectMsg(
              `${files[0]?.name ?? "File"} is too large. Maximum size is 50 MB.`
            );
          } else if (reason === "max-files") {
            setRejectMsg("Only one Excel file can be uploaded at a time.");
          } else {
            setRejectMsg("That file type is not supported. Use .xlsx or .xls.");
          }
        }}
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        multiple={false}
        maxFiles={1}
        maxFileSize={50 * 1024 * 1024}
        disabled={loading}
        title="Drag and drop or browse your Excel file"
        description="Accepts .xlsx and .xls · Maximum 50 MB"
        attachmentsLabel="Selected file"
      />

      {rejectMsg && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[14px] text-[var(--foreground)]">
          {rejectMsg}
        </p>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={loading || !hasFile}
        className="w-full rounded-[10px] bg-[var(--accent)] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {loading ? "Uploading… please wait" : "Upload"}
      </button>

      {result && (
        <div className="space-y-3 text-[14px]">
          <p
            className={`rounded-xl border p-3 ${
              result.imported > 0
                ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--foreground)]"
                : "border-[var(--border)] text-[var(--foreground)]"
            }`}
          >
            {result.totalRead !== undefined && (
              <>
                {result.totalRead} record{result.totalRead === 1 ? "" : "s"}{" "}
                found in the file:{" "}
              </>
            )}
            <strong>{result.imported} imported</strong>
            {" · "}
            {skipped} skipped (already in the system)
            {" · "}
            {errorCount} with problems
          </p>

          {skipped > 0 && result.skippedRows && result.skippedRows.length > 0 && (
            <details className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-[var(--foreground)]">
              <summary className="cursor-pointer font-medium">
                {skipped} row{skipped === 1 ? "" : "s"} skipped because they
                already exist
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
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-[var(--foreground)]">
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
