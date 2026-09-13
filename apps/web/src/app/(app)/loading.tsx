export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-[var(--color-border)]" />
        <div className="h-4 w-72 max-w-full rounded-md bg-[var(--color-border)]/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="h-3 w-20 rounded bg-[var(--color-border)]" />
            <div className="mt-4 h-7 w-16 rounded bg-[var(--color-border)]" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded-md bg-[var(--color-border)]/60" />
        ))}
      </div>
    </div>
  );
}
