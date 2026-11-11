"use client";

import { useRef, useState, useEffect } from "react";
import { saveRecordDocumentUrl } from "@/app/(app)/records/actions";

type Uploaded = {
  id: string;
  name: string;
  webViewLink: string | null;
};

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB (matches the server check)

/** PUT the whole file to a Drive resumable-session URL, reporting progress. */
function putToDrive(
  uploadUrl: string,
  file: File,
  mime: string,
  onPercent: (pct: number) => void
): Promise<Uploaded> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", mime);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onPercent(Math.min(99, Math.round((ev.loaded / ev.total) * 100)));
      }
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "Upload to Google Drive failed. Check your connection and try again."
        )
      );
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          resolve(JSON.parse(xhr.responseText) as Uploaded);
        } catch {
          reject(new Error("Google Drive returned an unexpected response."));
        }
        return;
      }
      reject(new Error(`Google Drive rejected the upload (${xhr.status}).`));
    };
    xhr.send(file);
  });
}

type Props = {
  /** Which Folder Settings target this upload goes to (set by Super Admin) */
  docType?: "caseDocuments" | "appraisalReport" | "deedOfDonation" | "terminalReport";
  /** Optional label used as Drive subfolder name (e.g. case number) */
  caseLabel?: string;
  /** When set, uploading is blocked and this reason is shown (e.g. no docket number yet) */
  disabledReason?: string;
  /** Record's CENRO — used to resolve office Drive folder */
  cenroOfficeId?: number | null;
  /** Optional parent PENRO id */
  penroOfficeId?: number | null;
  /** When set (editing a saved record), the link is saved to the database as soon as the upload finishes or the link is removed */
  recordId?: number | null;
  /** Existing Drive link already saved on the record */
  existingUrl?: string | null;
  /** Called after a successful upload so the parent form can store the URL */
  onUploaded?: (link: string, meta: Uploaded) => void;
  /** Hidden input name for form submit (stores the Drive URL) */
  name?: string;
  disabled?: boolean;
  /** Document name for the button, e.g. "appraisal report" → "Upload appraisal report" */
  docLabel?: string;
  /** Called with true while a file is uploading / saving, false when finished */
  onBusyChange?: (busy: boolean) => void;
};

/**
 * Upload a case document to Google Drive (configured in Settings).
 * Stores the returned webViewLink in a hidden field (or via onUploaded).
 */
export default function CaseDocumentsUpload({
  docType = "caseDocuments",
  caseLabel,
  disabledReason,
  cenroOfficeId = null,
  penroOfficeId = null,
  recordId = null,
  existingUrl,
  onUploaded,
  name = "caseDocumentsUrl",
  disabled = false,
  docLabel,
  onBusyChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState(existingUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    onBusyChange?.(busy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  const needsLabel = Boolean(disabledReason);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled) return;
    if (needsLabel) {
      setError(disabledReason ?? "Uploading is not available.");
      return;
    }

    setError(null);
    setBusy(true);
    setProgress("Uploading to Google Drive…");

    try {
      if (file.size > MAX_BYTES) {
        throw new Error("File is too large (max 50 MB)");
      }
      if (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name)) {
        throw new Error("Only PDF files are allowed");
      }
      const mime = "application/pdf";

      // 1) Ask the server to open a Drive upload session (no file bytes sent,
      //    so the ~4.5 MB serverless request limit does not apply).
      const startRes = await fetch("/api/drive/upload/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          mimeType: mime,
          size: file.size,
          docType,
          caseLabel: caseLabel || undefined,
          recordId: recordId ?? undefined,
          cenroOfficeId: cenroOfficeId ?? undefined,
          penroOfficeId: penroOfficeId ?? undefined,
        }),
      });
      const start = (await startRes.json().catch(() => ({}))) as {
        uploadUrl?: string;
        error?: string;
      };
      if (!startRes.ok || !start.uploadUrl) {
        throw new Error(start.error || `Could not start upload (${startRes.status})`);
      }

      // 2) Send the file straight to Google Drive, with progress.
      const uploaded = await putToDrive(start.uploadUrl, file, mime, (pct) =>
        setProgress(`Uploading to Google Drive… ${pct}%`)
      );
      const url = uploaded.webViewLink || "";
      setLink(url);
      onUploaded?.(url, uploaded);

      if (recordId) {
        // Save the link to the record right away so the file is never orphaned.
        setProgress("Uploaded. Saving link to the record…");
        try {
          await saveRecordDocumentUrl(recordId, name, url);
          setProgress("Uploaded and saved to the record");
        } catch (saveErr) {
          setProgress(null);
          setError(
            `Uploaded to Google Drive, but the link could not be saved to the record: ${
              (saveErr as Error).message
            }. Click Save record to try again.`
          );
        }
      } else {
        setProgress("Uploaded");
      }
    } catch (err) {
      setError((err as Error).message);
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={link} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || busy || needsLabel}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2 text-[13.5px] font-medium text-[var(--foreground)] hover:bg-[var(--border)] disabled:opacity-50"
        >
          {busy
            ? "Uploading…"
            : docLabel
              ? `${link ? "Replace" : "Upload"} ${docLabel}`
              : link
                ? "Replace document"
                : "Upload PDF to Google Drive"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,application/pdf"
          onChange={onFileChange}
        />
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13.5px] font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Open in Drive
          </a>
        )}
        {link && !disabled && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = window.confirm(
                recordId
                  ? "Remove this Drive link from the record? The file stays in Google Drive."
                  : "Remove this Drive link from the record? The file stays in Google Drive. Click Save to apply."
              );
              if (!ok) return;

              setError(null);
              if (recordId) {
                setBusy(true);
                try {
                  await saveRecordDocumentUrl(recordId, name, "");
                } catch (err) {
                  setError(
                    `Could not remove the link: ${(err as Error).message}`
                  );
                  setBusy(false);
                  return;
                }
                setBusy(false);
              }
              setLink("");
              setProgress(recordId ? "Link removed from the record" : null);
              onUploaded?.("", { id: "", name: "", webViewLink: null });
            }}
            className="rounded-lg border border-red-200 px-3 py-2 text-[13.5px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Remove link
          </button>
        )}
      </div>

      {needsLabel && !link && (
        <p className="text-[12.5px] text-[var(--muted)]">
          {disabledReason}
        </p>
      )}
      {progress && !error && (
        <p className="text-[12.5px] text-[var(--muted)]">{progress}</p>
      )}
      {error && (
        <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>
      )}
      {link && (
        <p className="truncate text-[12px] text-[var(--muted)]" title={link}>
          {link}
        </p>
      )}
    </div>
  );
}
