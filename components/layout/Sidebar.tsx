"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 68;

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("sidebar-collapsed", String(collapsed));
    localStorage.setItem(
      "sidebar-width",
      String(collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH)
    );
    window.dispatchEvent(new Event("sidebar-change"));
  }, [collapsed, mounted]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const open = () => setMobileOpen(true);
    const close = () => setMobileOpen(false);
    const toggle = () => setCollapsed((c) => !c);
    window.addEventListener("sidebar-open", open);
    window.addEventListener("sidebar-close", close);
    window.addEventListener("sidebar-toggle-collapse", toggle);
    return () => {
      window.removeEventListener("sidebar-open", open);
      window.removeEventListener("sidebar-close", close);
      window.removeEventListener("sidebar-toggle-collapse", toggle);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const railCollapsed = collapsed && !mobileOpen;
  const width = mobileOpen
    ? EXPANDED_WIDTH
    : railCollapsed
    ? COLLAPSED_WIDTH
    : EXPANDED_WIDTH;

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 sm:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      <aside
        style={{ width }}
        className={`
          fixed top-0 left-0 z-50 flex h-dvh flex-col
          border-r border-[var(--border)] bg-[var(--shell)]
          transition-[width,transform] duration-200 ease-out
          ${mobileOpen ? "translate-x-0 shadow-[0_25px_50px_rgba(0,0,0,.28)]" : "-translate-x-full"}
          sm:translate-x-0 sm:shadow-none
        `}
        aria-label="Navigation"
      >
        <div className="flex h-full flex-col overflow-x-hidden overflow-y-auto px-2 py-3">
          <div
            className={`mb-2 flex items-center gap-2 px-1 ${
              railCollapsed ? "flex-col gap-2" : ""
            }`}
          >
            <Link
              href="/dashboard"
              aria-label="EMS Tracker home"
              className="flex shrink-0 items-center justify-center rounded-xl p-1.5 transition hover:bg-[var(--border)]"
              title={railCollapsed ? "EMS Tracker" : undefined}
            >
              <Image
                src="/seal.png"
                alt="EMS Tracker"
                width={36}
                height={36}
                priority
                className="h-9 w-9 object-contain"
              />
            </Link>

            {!railCollapsed && (
              <div className="min-w-0 flex-1 px-1">
                <p className="truncate text-[14.5px] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
                  EMS Tracker
                </p>
                <p className="truncate text-[11.5px] text-[var(--muted)]">Cagayan</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--border)] hover:text-[var(--foreground)] sm:grid"
              title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelIcon collapsed={railCollapsed} />
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--border)] hover:text-[var(--foreground)] sm:hidden"
              aria-label="Close menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5">
            <GroupLabel collapsed={railCollapsed}>Overview</GroupLabel>
            <NavItem href="/dashboard" active={isActive("/dashboard")} collapsed={railCollapsed} icon={<DashboardIcon />}>
              Dashboard
            </NavItem>

            <GroupLabel collapsed={railCollapsed}>Records</GroupLabel>
            <NavItem href="/records" active={isActive("/records")} collapsed={railCollapsed} icon={<RecordsIcon />}>
              All Records
            </NavItem>
            <NavItem href="/new" active={isActive("/new")} collapsed={railCollapsed} icon={<PlusIcon />}>
              Log new apprehension
            </NavItem>
            <NavItem href="/upload" active={isActive("/upload")} collapsed={railCollapsed} icon={<UploadIcon />}>
              Upload Excel file
            </NavItem>
            {isAdmin && (
              <NavItem
                href="/bulk-update"
                active={isActive("/bulk-update")}
                collapsed={railCollapsed}
                icon={<BulkIcon />}
              >
                Bulk update
              </NavItem>
            )}
            {isAdmin && (
              <NavItem
                href="/bulk-delete"
                active={isActive("/bulk-delete")}
                collapsed={railCollapsed}
                icon={<TrashIcon />}
              >
                Bulk delete
              </NavItem>
            )}

            <GroupLabel collapsed={railCollapsed}>Reports</GroupLabel>
            <NavItem href="/reports" active={isActive("/reports")} collapsed={railCollapsed} icon={<ChartIcon />}>
              Reports
            </NavItem>
            <NavItem
              href="/export"
              collapsed={railCollapsed}
              disabled
              disabledReason="Export is currently unavailable"
              icon={<DownloadIcon />}
            >
              Export to Excel
            </NavItem>

            <GroupLabel collapsed={railCollapsed}>Administration</GroupLabel>
            {isSuperAdmin && (
              <NavItem
                href="/adminportal"
                active={isActive("/adminportal")}
                collapsed={railCollapsed}
                icon={<UsersIcon />}
              >
                Create user account
              </NavItem>
            )}
            <NavItem
              href="/field-values"
              active={isActive("/field-values")}
              collapsed={railCollapsed}
              icon={<SlidersIcon />}
            >
              Field Values
            </NavItem>

            <div className="mt-2 border-t border-[var(--border)] pt-2">
              <form action={logout}>
                <button
                  type="submit"
                  title={railCollapsed ? "Log out" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl text-[14.5px] font-medium text-[#c93a34] transition hover:bg-[rgba(201,58,52,0.1)] ${
                    railCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
                  }`}
                >
                  <LogoutIcon />
                  {!railCollapsed && <span>Log out</span>}
                </button>
              </form>
            </div>
          </nav>

          <div className="mt-auto pt-3 pb-1">
            {railCollapsed ? (
              <div
                className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-[13px] font-semibold text-white"
                title={userName}
              >
                {userName?.charAt(0)?.toUpperCase() || "U"}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[13.5px] font-semibold text-white">
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
        </div>
      </aside>
    </>
  );
}

function GroupLabel({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: React.ReactNode;
}) {
  if (collapsed) {
    return <div className="my-1.5 mx-auto h-px w-6 bg-[var(--border)] first:mt-0" aria-hidden />;
  }
  return (
    <div className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)] first:mt-1">
      {children}
    </div>
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
  const base =
    "group relative flex items-center gap-3 rounded-xl text-[14.5px] font-medium transition-[background,color,box-shadow] duration-150";
  const layout = collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5";
  const state = active
    ? "bg-[var(--card)] font-semibold text-[var(--foreground)] shadow-[var(--shadow)] [&_svg]:text-[var(--accent)]"
    : "text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]";

  if (disabled) {
    return (
      <span
        title={disabledReason || String(children)}
        className={`${base} ${layout} cursor-not-allowed opacity-40`}
      >
        <span className="grid h-5 w-5 shrink-0 place-items-center">{icon}</span>
        {!collapsed && <span className="truncate">{children}</span>}
      </span>
    );
  }

  return (
    <Link
      href={href}
      title={collapsed ? String(children) : undefined}
      className={`${base} ${layout} ${state}`}
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center">{icon}</span>
      {!collapsed && <span className="truncate">{children}</span>}
      {collapsed && (
        <span
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[var(--foreground)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--background)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
          role="tooltip"
        >
          {children}
        </span>
      )}
    </Link>
  );
}

function PanelIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      {collapsed ? <path d="M9 3v18M13 12h5" /> : <path d="M9 3v18" />}
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function RecordsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}
function BulkIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function SlidersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
