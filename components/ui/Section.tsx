export default function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}