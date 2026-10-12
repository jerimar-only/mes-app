"use client";

import { useRouter } from "next/navigation";

export function BackButton({
  fallbackHref = "/records",
  label = "Back to previous page",
}: {
  fallbackHref?: string;
  label?: string;
}) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-[13.5px] font-medium text-[var(--foreground)] shadow-[var(--shadow)] transition hover:border-[var(--accent)] hover:bg-[var(--shell)]"
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  );
}
