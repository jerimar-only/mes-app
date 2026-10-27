"use client";

import { usePathname } from "next/navigation";
import InputTextColorPicker from "@/components/layout/InputTextColorPicker";

type PageMeta = { title: string; description?: string };

/** More specific routes first so dynamic segments match correctly. */
const PAGE_META: { match: (path: string) => boolean; meta: PageMeta }[] = [
  {
    match: (p) => /^\/records\/\d+\/edit\/?$/.test(p),
    meta: {
      title: "Edit record",
      description: "Update apprehension details",
    },
  },
  {
    match: (p) => /^\/records\/\d+\/?$/.test(p),
    meta: {
      title: "Record detail",
      description: "View apprehension record",
    },
  },
  {
    match: (p) => p === "/records/full" || p.startsWith("/records/full/"),
    meta: {
      title: "All records — full view",
      description: "Complete table of apprehension records",
    },
  },
  {
    match: (p) => p === "/records" || p.startsWith("/records?"),
    meta: {
      title: "All Records",
      description: "Browse and filter apprehension records",
    },
  },
  {
    match: (p) => p === "/dashboard" || p.startsWith("/dashboard/"),
    meta: {
      title: "Dashboard",
      description: "Live totals from recorded apprehensions",
    },
  },
  {
    match: (p) => p === "/new" || p.startsWith("/new/"),
    meta: {
      title: "Log new apprehension",
      description: "Record a new apprehension, seizure, or confiscation",
    },
  },
  {
    match: (p) => p === "/upload" || p.startsWith("/upload/"),
    meta: {
      title: "Upload from Excel",
      description: "Import apprehensions from a completed template",
    },
  },
  {
    match: (p) => p === "/bulk-update" || p.startsWith("/bulk-update/"),
    meta: {
      title: "Bulk update from Excel",
      description: "Review and apply spreadsheet updates by record ID",
    },
  },
  {
    match: (p) => p === "/bulk-delete" || p.startsWith("/bulk-delete/"),
    meta: {
      title: "Bulk delete",
      description: "Soft-delete selected records from dashboard and reports",
    },
  },
  {
    match: (p) => p === "/reports" || p.startsWith("/reports/"),
    meta: {
      title: "Reports",
      description: "Summary of apprehensions by year and category",
    },
  },
  {
    match: (p) => p === "/export" || p.startsWith("/export/"),
    meta: {
      title: "Export to Excel",
      description: "Download records for a year and CENRO office",
    },
  },
  {
    match: (p) => p === "/adminportal" || p.startsWith("/adminportal/"),
    meta: {
      title: "Admin Portal",
      description: "Manage users and system access",
    },
  },
  {
    match: (p) => p === "/field-values" || p.startsWith("/field-values/"),
    meta: {
      title: "Field Values",
      description: "Custom fields and column layout order",
    },
  },
];

const FALLBACK: PageMeta = {
  title: "EMS Tracker",
  description: "Apprehension monitoring system",
};

function metaForPath(pathname: string): PageMeta {
  const path = pathname.replace(/\/$/, "") || "/";
  for (const entry of PAGE_META) {
    if (entry.match(path) || entry.match(pathname)) return entry.meta;
  }
  return FALLBACK;
}

export default function Header() {
  const pathname = usePathname() || "/";
  const { title, description } = metaForPath(pathname);

  function handleBurgerClick() {
    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    if (isMobile) {
      window.dispatchEvent(new Event("sidebar-open"));
    } else {
      window.dispatchEvent(new Event("sidebar-toggle-collapse"));
    }
  }

  return (
    <header className="app-header sticky top-0 z-30 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)]/95 px-4 py-2 shadow-sm backdrop-blur-md sm:px-6">
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

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
          {title}
        </p>
        {description ? (
          <p className="mt-0.5 truncate text-[12px] leading-tight text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <InputTextColorPicker />
      </div>
    </header>
  );
}
