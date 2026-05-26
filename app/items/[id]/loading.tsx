export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 sm:px-8">
      <div className="mb-8 h-4 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />

      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-3xl border border-black/5 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/85">
          <div className="h-[340px] animate-pulse rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-6 h-10 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-4 h-6 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-6 h-28 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        </section>

        <aside className="rounded-3xl border border-black/5 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/85">
          <div className="h-8 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-4 h-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-4 h-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </aside>
      </div>
    </main>
  );
}