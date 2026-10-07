"use client";

import ThemeToggle from "@/components/layout/ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-black/70 pl-14 pr-6 backdrop-blur-xl sm:pl-6">
      {/* Left side: app name (pl-14 on mobile leaves room for the burger) */}
      <span className="truncate text-[15px] font-semibold tracking-wide text-white">
        EMS Tracker
      </span>

      {/* Right side: night mode toggle only */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}