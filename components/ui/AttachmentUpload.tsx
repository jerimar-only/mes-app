"use client";

/**
 * File: components/ui/AttachmentUpload.tsx
 * Adapted from beui.dev attachment upload for EMS Excel upload.
 * Uses project CSS variables; no external motion/lucide deps.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export type AttachmentUploadKind = "file" | "link" | "image" | "audio";
export type AttachmentRejectReason = "too-large" | "max-files" | "type";
export type AttachmentUploadStatus =
  | "idle"
  | "uploading"
  | "complete"
  | "failed";

export type AttachmentUploadItem = {
  id: string;
  name: string;
  kind: AttachmentUploadKind;
  size?: number;
  href?: string;
  previewUrl?: string;
  status?: AttachmentUploadStatus;
  error?: string;
  file?: File;
};

export interface AttachmentUploadProps {
  value?: AttachmentUploadItem[];
  defaultValue?: AttachmentUploadItem[];
  onValueChange?: (items: AttachmentUploadItem[]) => void;
  onFilesAdded?: (items: AttachmentUploadItem[], files: File[]) => void;
  onFilesRejected?: (files: File[], reason: AttachmentRejectReason) => void;
  onRemove?: (item: AttachmentUploadItem) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  disabled?: boolean;
  title?: string;
  description?: string;
  attachmentsLabel?: string;
  className?: string;
}

const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB for Excel

function formatBytes(bytes: number | undefined) {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

function formatMaxSize(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function AttachmentUpload({
  value,
  defaultValue,
  onValueChange,
  onFilesAdded,
  onFilesRejected,
  onRemove,
  accept,
  multiple = false,
  maxFiles = 1,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  disabled = false,
  title = "Drag and drop or browse files",
  description,
  attachmentsLabel = "Attachments",
  className,
}: AttachmentUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [internalValue, setInternalValue] = useState<AttachmentUploadItem[]>(
    defaultValue ?? []
  );

  const controlled = value !== undefined;
  const items = value ?? internalValue;

  const setItems = useCallback(
    (next: AttachmentUploadItem[]) => {
      if (!controlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange]
  );

  const maxReached = items.length >= maxFiles;

  const addFiles = useCallback(
    (incomingFiles: File[]) => {
      if (disabled || incomingFiles.length === 0) return;

      const availableSlots = Math.max(0, maxFiles - items.length);
      if (availableSlots === 0) {
        onFilesRejected?.(incomingFiles, "max-files");
        return;
      }

      const selectedFiles = incomingFiles.slice(
        0,
        multiple ? availableSlots : Math.min(1, availableSlots)
      );
      const oversized = selectedFiles.filter((f) => f.size > maxFileSize);
      const accepted = selectedFiles.filter((f) => f.size <= maxFileSize);

      if (oversized.length > 0) onFilesRejected?.(oversized, "too-large");
      if (incomingFiles.length > selectedFiles.length) {
        onFilesRejected?.(
          incomingFiles.slice(selectedFiles.length),
          "max-files"
        );
      }
      if (accepted.length === 0) return;

      const added: AttachmentUploadItem[] = accepted.map((file, index) => ({
        id: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        kind: "file" as const,
        size: file.size,
        status: "idle" as const,
        file,
      }));

      // Single-file mode: replace existing
      const next = multiple ? [...items, ...added] : added;
      setItems(next);
      onFilesAdded?.(added, accepted);
    },
    [
      disabled,
      items,
      maxFileSize,
      maxFiles,
      multiple,
      onFilesAdded,
      onFilesRejected,
      setItems,
    ]
  );

  const removeItem = useCallback(
    (item: AttachmentUploadItem) => {
      setItems(items.filter((e) => e.id !== item.id));
      onRemove?.(item);
    },
    [items, onRemove, setItems]
  );

  const resetDrag = useCallback(() => {
    dragDepthRef.current = 0;
    setDragging(false);
  }, []);

  // Escape closes nothing special; keep body clean
  useEffect(() => {
    return () => {
      dragDepthRef.current = 0;
    };
  }, []);

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        aria-label="Upload attachments"
        accept={accept}
        multiple={multiple}
        disabled={disabled || maxReached}
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => {
          addFiles(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }}
      />

      {/* Dropzone */}
      <button
        type="button"
        disabled={disabled || maxReached}
        data-dragging={dragging}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          if (disabled || maxReached) return;
          event.preventDefault();
          dragDepthRef.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (disabled || maxReached) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (disabled || maxReached) return;
          event.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          if (disabled || maxReached) return;
          event.preventDefault();
          resetDrag();
          addFiles(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "group relative isolate flex min-h-52 w-full flex-col items-center justify-center overflow-hidden rounded-[2rem] p-2 text-center outline-none",
          "bg-[var(--shell)] transition-colors duration-200 hover:bg-[var(--border)]/40",
          "focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          "data-[dragging=true]:bg-[var(--border)]/50",
          "disabled:pointer-events-none disabled:opacity-55"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-2 -z-10 rounded-[1.5rem] border border-dashed bg-[var(--card)] transition-[border-color,background-color] duration-200",
            dragging
              ? "border-[var(--accent)] bg-[var(--accent)]/5"
              : "border-[var(--border-strong)] group-hover:border-[var(--muted)]"
          )}
        />

        <span
          aria-hidden="true"
          className={cn(
            "mb-3 grid size-11 place-items-center rounded-2xl transition-colors duration-200",
            dragging
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--shell)] text-[var(--foreground)] group-hover:bg-[var(--border)]"
          )}
        >
          {/* Upload icon */}
          <svg
            className="size-[18px]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <path d="M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </span>

        <span className="text-sm font-semibold tracking-[-0.01em] text-[var(--foreground)]">
          {maxReached ? "Attachment limit reached" : title}
        </span>
        <span className="mt-1 text-xs leading-5 text-[var(--muted)]">
          {maxReached
            ? `${items.length} of ${maxFiles} attachments added`
            : description ?? `Maximum ${formatMaxSize(maxFileSize)} file size`}
        </span>
      </button>

      {/* Attachment list */}
      {items.length > 0 && (
        <section className="mt-6" aria-labelledby={`${inputId}-attachments`}>
          <h3
            id={`${inputId}-attachments`}
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            {attachmentsLabel}
          </h3>
          <ul className="mt-3 space-y-2">
            {items.map((item) => {
              const size = formatBytes(item.size);
              const failed = item.status === "failed";
              const uploading = item.status === "uploading";
              const complete = item.status === "complete";

              return (
                <li
                  key={item.id}
                  className="flex min-h-14 items-center gap-1 rounded-2xl bg-[var(--shell)] p-1"
                >
                  <div
                    className={cn(
                      "relative isolate flex min-w-0 flex-1 items-center gap-3 self-stretch overflow-hidden rounded-xl bg-[var(--card)] px-3 py-2",
                      failed && "bg-red-500/10"
                    )}
                  >
                    {uploading && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 -z-10 origin-left animate-pulse bg-[var(--accent)]/15"
                      />
                    )}
                    {complete && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 -z-10 bg-emerald-500/10"
                      />
                    )}

                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center text-[var(--muted)]"
                    >
                      {/* Paperclip */}
                      <svg
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                        {item.name}
                      </span>
                      {failed && (
                        <span className="block truncate text-[11px] text-red-600">
                          {item.error ?? "Upload failed"}
                        </span>
                      )}
                      {uploading && (
                        <span className="block text-[11px] text-[var(--muted)]">
                          Uploading…
                        </span>
                      )}
                      {complete && (
                        <span className="block text-[11px] text-emerald-600">
                          Upload complete
                        </span>
                      )}
                    </span>

                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      {size}
                    </span>
                  </div>

                  {/* Remove / status */}
                  {complete ? (
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-xl text-emerald-600"
                      title="Upload complete"
                    >
                      <svg
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : uploading ? (
                    <span className="size-9 shrink-0" aria-hidden />
                  ) : (
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      title="Remove"
                      onClick={() => removeItem(item)}
                      disabled={disabled}
                      className="grid size-9 shrink-0 place-items-center rounded-xl text-[var(--muted)] outline-none transition-colors hover:bg-[var(--border)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      <svg
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        strokeLinecap="round"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
