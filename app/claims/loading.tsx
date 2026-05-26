export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
      <div className="mb-8">
        <div className="h-4 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 h-10 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-3 h-5 w-72 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-black/5 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/85"
          >
            <div className="h-6 w-56 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-6 h-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </main>
  );
}