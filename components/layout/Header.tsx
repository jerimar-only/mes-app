"use client";

import ThemeToggle from "@/components/layout/ThemeToggle";

export default function Header() {
  return (
    <header className="app-header sticky top-0 z-30 flex h-14 items-center justify-between pl-14 pr-5 sm:pl-6 sm:pr-6">
      <span className="truncate text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
        EMS Tracker
      </span>

      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
