"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/Toast";

type Item = { id: number; name: string };

export default function LookupPanel({
  title,
  items,
  createAction,
  deleteAction,
  placeholder,
}: {
  title: string;
  items: Item[];
  createAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  placeholder: string;
}) {
  const [pending, startTransition] = useTransition();
  const { error, flash } = useToast();

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createAction(formData);
        flash("success", "Entry added.", "Saved");
        form.reset();
      } catch (err) {
        error(err instanceof Error ? err.message : "Could not add entry.");
      }
    });
  }

  function onDelete(formData: FormData) {
    startTransition(async () => {
      try {
        await deleteAction(formData);
        flash("success", "Entry removed.", "Deleted");
      } catch (err) {
        error(err instanceof Error ? err.message : "Could not remove entry.");
      }
    });
  }

  return (
    <div className="dash-panel p-4 sm:p-5">
      <h3 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
        {title}
        <span className="ml-2 text-[12px] font-normal text-[var(--muted)]">
          ({items.length})
        </span>
      </h3>

      <form onSubmit={onCreate} className="mb-3 flex gap-2">
        <input
          type="text"
          name="name"
          required
          disabled={pending}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "…" : "Add"}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">No entries yet.</p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--background)]/40 px-2.5 py-1.5"
            >
              <span className="truncate text-[13px] text-[var(--foreground)]">
                {item.name}
              </span>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onDelete(new FormData(e.currentTarget));
                }}
              >
                <input type="hidden" name="id" value={item.id} />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded px-1.5 py-0.5 text-[12px] text-[var(--muted)] hover:bg-red-100 hover:text-red-700 disabled:opacity-60 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                  title="Remove"
                  aria-label={`Remove ${item.name}`}
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
