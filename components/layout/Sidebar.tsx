"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";

const MIN_WIDTH = 72;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 256;
const COLLAPSED_WIDTH = 72;

export default function Sidebar({
  isAdmin,
  userName,
}: {
  isAdmin: boolean;
  userName: string;
}) {
  const pathname = usePathname();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [desktopCollapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Load saved width + collapsed state
  useEffect(() => {
    const savedWidth = localStorage.getItem("sidebar-width");
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedWidth) setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Number(savedWidth))));
    if (savedCollapsed === "true") setCollapsed(true);
  }, []);

  // Persist + notify layout
  useEffect(() => {
    localStorage.setItem("sidebar-width", String(width));
    localStorage.setItem("sidebar-collapsed", String(desktopCollapsed));
    window.dispatchEvent(new Event("sidebar-change"));
  }, [width, desktopCollapsed]);

  // Close the mobile drawer when the page changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(newWidth);
      // Auto-collapse when dragged very small
      if (newWidth <= 90) setCollapsed(true);
      else setCollapsed(false);
    };

    const onUp = () => setIsDragging(false);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const toggleCollapse = () => {
    setCollapsed((c) => !c);
  };

  // The mobile drawer always opens fully expanded
  const collapsed = desktopCollapsed && !mobileOpen;
  const currentWidth = mobileOpen
    ? DEFAULT_WIDTH
    : collapsed
    ? COLLAPSED_WIDTH
    : width;

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <>
      {/* Mobile hamburger (hidden while the drawer is open) */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          type="button"
        className="fixed left-3 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/60 text-white shadow-lg backdrop-blur-xl transition hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/30 sm:hidden"
        >
          <span className="sr-only">Open sidebar</span>
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              clipRule="evenodd"
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
            />
          </svg>
        </button>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 sm:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        style={{ width: currentWidth }}
        className={`
          fixed left-0 top-0 z-40 h-screen
          transition-[width] duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}
          ${isDragging ? "transition-none select-none" : ""}
        `}
        aria-label="Sidebar"
      >
        <div className="relative flex h-full flex-col overflow-y-auto border-r border-white/10 bg-black/40 px-3 py-4 backdrop-blur-xl">
          {/* Brand + controls */}
          <div className="mb-5 flex items-center justify-between gap-2 px-1">
            {!collapsed && (
              <Link href="/dashboard" className="min-w-0 flex-1 truncate">
                <span className="text-[15px] font-semibold text-white">EMS Tracker</span>
              </Link>
            )}

            <div className="flex items-center gap-1">
              {/* Collapse / Expand (desktop only) */}
              <button
                onClick={toggleCollapse}
                className="hidden rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white sm:inline-flex"
                title={collapsed ? "Expand" : "Collapse"}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {collapsed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  )}
                </svg>
              </button>

              {/* Mobile close */}
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 sm:hidden"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Navigation */}
          <ul className="space-y-1 font-medium">
            {!collapsed && (
              <li className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Overview
              </li>
            )}
            <NavItem href="/dashboard" active={isActive("/dashboard")} collapsed={collapsed} icon={<DashboardIcon />}>
              Dashboard
            </NavItem>

            {!collapsed && (
              <li className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Records
              </li>
            )}
            <NavItem href="/records" active={isActive("/records")} collapsed={collapsed} icon={<RecordsIcon />}>
              All Records
            </NavItem>
            <NavItem href="/new" active={isActive("/new")} collapsed={collapsed} icon={<PlusIcon />}>
              Log new apprehension
            </NavItem>
            <NavItem href="/upload" active={isActive("/upload")} collapsed={collapsed} icon={<UploadIcon />}>
              Upload Excel file
            </NavItem>

            {!collapsed && (
              <li className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Reports
              </li>
            )}
            <NavItem href="/reports" active={isActive("/reports")} collapsed={collapsed} icon={<ChartIcon />}>
              Reports
            </NavItem>
            <NavItem
              href="/export"
              collapsed={collapsed}
              disabled
              disabledReason="Export is currently unavailable"
              icon={<DownloadIcon />}
            >
              Export to Excel
            </NavItem>

            {isAdmin && (
              <>
                {!collapsed && (
                  <li className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Administration
                  </li>
                )}
                <NavItem href="/users" active={isActive("/users")} collapsed={collapsed} icon={<UsersIcon />}>
                  Create user account
                </NavItem>
              </>
            )}
          </ul>

          {/* User + Logout */}
          <div className="mt-auto border-t border-white/10 pt-4">
            {!collapsed && (
              <p className="mb-2 truncate px-2 text-xs text-white/50">
                Signed in as <span className="text-white/90">{userName}</span>
              </p>
            )}
            <form action={logout}>
              <button
                type="submit"
                title="Log out"
                className={`flex w-full items-center rounded-lg p-2 text-sm text-red-400 hover:bg-red-500/10 ${
                  collapsed ? "justify-center" : ""
                }`}
              >
                <LogoutIcon />
                {!collapsed && <span className="ms-3">Log out</span>}
              </button>
            </form>
          </div>

          {/* Drag handle (desktop only) */}
          <div
            onMouseDown={startDrag}
            className="absolute right-0 top-0 hidden h-full w-1.5 cursor-col-resize bg-transparent transition hover:bg-white/20 sm:block"
            title="Drag to resize"
          />
        </div>
      </aside>
    </>
  );
}

function NavItem({
  href,
  active,
  collapsed,
  icon,
  disabled = false,
  disabledReason,
  children,
}: {
  href: string;
  active?: boolean;
  collapsed: boolean;
  icon: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
  children: React.ReactNode;
}) {
  const base = "flex items-center rounded-lg p-2 text-sm transition";

  if (disabled) {
    return (
      <li>
        <span
          title={disabledReason}
          className={`${base} cursor-not-allowed text-white/30 ${collapsed ? "justify-center" : ""}`}
        >
          <span className="h-5 w-5 shrink-0">{icon}</span>
          {!collapsed && <span className="ms-3 truncate">{children}</span>}
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        title={collapsed ? String(children) : undefined}
        className={`${base} ${collapsed ? "justify-center" : ""} ${
          active
            ? "bg-white/15 font-medium text-white"
            : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span className="h-5 w-5 shrink-0">{icon}</span>
        {!collapsed && <span className="ms-3 truncate">{children}</span>}
      </Link>
    </li>
  );
}

/* Simple icons */
function DashboardIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
      <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
    </svg>
  );
}
function RecordsIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
    </svg>
  );
}