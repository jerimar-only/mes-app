"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";

const MIN_WIDTH = 72;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 256;
const COLLAPSED_WIDTH = 72;

export default function Sidebar({
  isAdmin,
  isSuperAdmin,
  userName,
}: {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userName: string;
}) {
  const pathname = usePathname();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [desktopCollapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const savedWidth = localStorage.getItem("sidebar-width");
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedWidth) setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Number(savedWidth))));
    if (savedCollapsed === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-width", String(width));
    localStorage.setItem("sidebar-collapsed", String(desktopCollapsed));
    window.dispatchEvent(new Event("sidebar-change"));
  }, [width, desktopCollapsed]);

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
      {/* Mobile hamburger */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          type="button"
          className="fixed left-3 top-3 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow)] transition hover:bg-[var(--shell)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:hidden"
        >
          <span className="sr-only">Open sidebar</span>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </button>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 sm:hidden"
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
        <div className="sidebar-panel relative flex h-full flex-col overflow-y-auto px-3 py-4">
          {/* Brand + controls */}
          <div
            className={`mb-5 flex items-center px-1 ${
              collapsed ? "flex-col gap-3" : "relative justify-center"
            }`}
          >
            <Link
              href="/dashboard"
              aria-label="EMS Tracker home"
              className="flex items-center justify-center"
            >
              <Image
                src="/seal.png"
                alt="EMS Tracker"
                width={56}
                height={56}
                priority
                className={`shrink-0 object-contain drop-shadow transition-all ${
                  collapsed ? "h-10 w-10" : "h-14 w-14"
                }`}
              />
            </Link>

            <div
              className={
                collapsed
                  ? "flex items-center"
                  : "absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1"
              }
            >
              <button
                onClick={toggleCollapse}
                className="hidden rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--border)] hover:text-[var(--foreground)] sm:inline-flex"
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

              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--border)] hover:text-[var(--foreground)] sm:hidden"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Navigation */}
          <ul className="space-y-1 font-medium">
            {!collapsed && <li className="nav-group">Overview</li>}
            <NavItem href="/dashboard" active={isActive("/dashboard")} collapsed={collapsed} icon={<DashboardIcon />}>
              Dashboard
            </NavItem>

            {!collapsed && <li className="nav-group">Records</li>}
            <NavItem href="/records" active={isActive("/records")} collapsed={collapsed} icon={<RecordsIcon />}>
              All Records
            </NavItem>
            <NavItem href="/new" active={isActive("/new")} collapsed={collapsed} icon={<PlusIcon />}>
              Log new apprehension
            </NavItem>
            <NavItem href="/upload" active={isActive("/upload")} collapsed={collapsed} icon={<UploadIcon />}>
              Upload Excel file
            </NavItem>

            {!collapsed && <li className="nav-group">Reports</li>}
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

            {isSuperAdmin && (
              <>
                {!collapsed && <li className="nav-group">Administration</li>}
                <NavItem
                  href="/adminportal"
                  active={isActive("/adminportal")}
                  collapsed={collapsed}
                  icon={<UsersIcon />}
                >
                  Admin Portal
                </NavItem>
              </>
            )}

            <li className="mt-3 border-t border-[var(--border)] pt-3">
              <form action={logout}>
                <button
                  type="submit"
                  title="Log out"
                  className={`flex w-full items-center rounded-xl p-2.5 text-sm font-medium text-[var(--danger)] transition hover:bg-[var(--danger-soft)] ${
                    collapsed ? "justify-center" : ""
                  }`}
                >
                  <LogoutIcon />
                  {!collapsed && <span className="ms-3">Log out</span>}
                </button>
              </form>
            </li>
          </ul>

          {/* Signed-in user */}
          <div className="mt-auto pt-4">
            {!collapsed && (
              <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[13px] font-semibold text-white">
                  {userName?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-[var(--foreground)]">
                    {userName}
                  </p>
                  <p className="text-[12px] text-[var(--muted)]">Signed in</p>
                </div>
              </div>
            )}
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={startDrag}
            className="absolute right-0 top-0 hidden h-full w-1.5 cursor-col-resize bg-transparent transition hover:bg-[var(--accent)]/20 sm:block"
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
  if (disabled) {
    return (
      <li>
        <span
          title={disabledReason}
          className={`nav-link cursor-not-allowed opacity-40 ${collapsed ? "justify-center" : ""}`}
        >
          <span className="h-5 w-5 shrink-0">{icon}</span>
          {!collapsed && <span className="truncate">{children}</span>}
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        title={collapsed ? String(children) : undefined}
        className={`nav-link ${collapsed ? "justify-center" : ""} ${
          active ? "nav-link-active" : ""
        }`}
      >
        <span className="h-5 w-5 shrink-0">{icon}</span>
        {!collapsed && <span className="truncate">{children}</span>}
      </Link>
    </li>
  );
}

function DashboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function RecordsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
