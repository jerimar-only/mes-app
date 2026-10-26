"use client";

import InputTextColorPicker from "@/components/layout/InputTextColorPicker";

export default function Header() {
  function handleBurgerClick() {
    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    if (isMobile) {
      window.dispatchEvent(new Event("sidebar-open"));
    } else {
      window.dispatchEvent(new Event("sidebar-toggle-collapse"));
    }
  }

  return (
    <header className="app-header sticky top-0 z-30 flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
      <button
        type="button"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        aria-label="Toggle navigation"
        onClick={handleBurgerClick}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
        PENRO CAGAYAN - MONITORING AND ENFORCEMENT
      </span>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <InputTextColorPicker />
      </div>
    </header>
  );
}
