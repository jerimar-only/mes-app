export default function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}