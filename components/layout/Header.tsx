"use client";

import { useState, useEffect } from "react";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function Header() {
  const [collapsed, setCollapsed] = useState(false);

  // Load preference
  useEffect(() => {
    const saved = localStorage.getItem("header-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  // Persist + notify
  useEffect(() => {
    localStorage.setItem("header-collapsed", String(collapsed));
    window.dispatchEvent(new Event("header-change"));
  }, [collapsed]);

  if (collapsed) {
    // Tiny floating restore button
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed right-4 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/70 text-white/70 backdrop-blur-xl transition hover:bg-black/30 hover:text-white"
        title="Show header"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-black/70 pl-14 pr-6 backdrop-blur-xl sm:pl-6">
      {/* Left side – can add breadcrumbs later */}
      <div className="text-sm text-white/50">
        {/* optional page title area */}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {/* Collapse header button */}
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          title="Hide header"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    </header>
  );
}