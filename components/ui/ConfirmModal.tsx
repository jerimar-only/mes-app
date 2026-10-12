"use client";

type Props = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-sm rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-lg)]">
        <h3 className="text-[16px] font-semibold tracking-tight text-[var(--foreground)]">
          {title}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted)]">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--shell)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold text-white transition ${
              danger
                ? "bg-[var(--danger)] hover:opacity-90"
                : "bg-[var(--accent)] hover:bg-[var(--accent-hover)]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
