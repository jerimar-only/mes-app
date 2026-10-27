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
    <section className="dash-panel p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="dash-panel-title text-[16px]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
