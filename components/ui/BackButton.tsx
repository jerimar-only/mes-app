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
    // Go back if there is a page to go back to, otherwise use the fallback
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-1.5 rounded-md border border-[#D8D3C4] bg-white px-3 py-1.5 text-[14px] font-medium text-[#4A6741] shadow-sm transition hover:bg-[#F0EDE3]"
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  );
}