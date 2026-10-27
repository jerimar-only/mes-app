export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer shrink-0 border-t border-[var(--border)] bg-[var(--card)] px-5 py-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1 text-center text-[12px] text-[var(--muted)] sm:flex-row sm:text-left xl:max-w-7xl 2xl:max-w-[1800px]">
        <p>
          © {year} PENRO Cagayan — Monitoring and Enforcement
        </p>
        <p className="text-[11px] opacity-80">EMS Apprehension Tracker</p>
      </div>
    </footer>
  );
}
