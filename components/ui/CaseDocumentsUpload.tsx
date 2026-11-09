"use client";

import { useRef, useState } from "react";

type Uploaded = {
  id: string;
  name: string;
  webViewLink: string | null;
};

type Props = {
  /** Optional label used as Drive subfolder name (e.g. case number) */
  caseLabel?: string;
  /** Existing Drive link already saved on the record */
  existingUrl?: string | null;
  /** Called after a successful upload so the parent form can store the URL */
  onUploaded?: (link: string, meta: Uploaded) => void;
  /** Hidden input name for form submit (stores the Drive URL) */
  name?: string;
  disabled?: boolean;
};

/**
 * Upload a case document to Google Drive (configured in Settings).
 * Stores the returned webViewLink in a hidden field (or via onUploaded).
 */
export default function CaseDocumentsUpload({
  caseLabel,
  existingUrl,
  onUploaded,
  name = "caseDocumentsUrl",
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState(existingUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled) return;

    setError(null);
    setBusy(true);
    setProgress("Uploading to Google Drive…");

    try {
      const form = new FormData();
      form.append("file", file);
      if (caseLabel) form.append("caseLabel", caseLabel);

      const res = await fetch("/api/drive/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error || `Upload failed (${res.status})`
        );
      }

      const uploaded = data as Uploaded;
      const url = uploaded.webViewLink || "";
      setLink(url);
      setProgress("Uploaded");
      onUploaded?.(url, uploaded);
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
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2 text-[13.5px] font-medium text-[var(--foreground)] hover:bg-[var(--border)] disabled:opacity-50"
        >
          {busy ? "Uploading…" : link ? "Replace document" : "Upload to Google Drive"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*"
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
      </div>

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
