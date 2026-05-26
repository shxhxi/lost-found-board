export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
      <div className="mb-8">
        <div className="h-4 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 h-10 w-52 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-3 h-5 w-80 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-black/5 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/85"
          >
            <div className="h-52 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-4 h-6 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-6 h-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </main>
  );
}