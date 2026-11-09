export default function Section({
  title,
  action,
  children,
  description,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <section className="dash-panel overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--shell)]/60 px-5 py-3.5 sm:px-6">
        <div className="min-w-0">
          <h2 className="dash-panel-title text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
