export default function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-[var(--border)]" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-lg bg-[var(--border)]" />
      </div>

      <div className="h-40 animate-pulse rounded-[20px] bg-[var(--border)]" />

      <div className="h-96 animate-pulse rounded-[20px] bg-[var(--border)]" />
    </div>
  );
}
