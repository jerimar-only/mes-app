export default function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      {/* Title + subtitle */}
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-[var(--border)]" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[var(--border)]" />
      </div>

      {/* Filter / form card */}
      <div className="h-40 animate-pulse rounded-xl bg-[var(--border)]" />

      {/* Table / content card */}
      <div className="h-96 animate-pulse rounded-xl bg-[var(--border)]" />
    </div>
  );
}