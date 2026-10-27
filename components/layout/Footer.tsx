export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer relative z-30 shrink-0 border-t border-[var(--border)] bg-[var(--card)] px-4 sm:px-5">
      <div className="flex w-full items-center justify-between gap-3 text-[12px] text-[var(--muted)]">
        <p className="min-w-0 truncate">
          © {year} PENRO Cagayan — Monitoring and Enforcement
        </p>
        <p className="shrink-0 text-[11px] opacity-80">EMS Apprehension Tracker</p>
      </div>
    </footer>
  );
}
