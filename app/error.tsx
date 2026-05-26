'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6 py-12 sm:px-8">
      <div className="rounded-3xl border border-black/5 bg-white/85 p-10 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900/85">
        <div className="text-5xl">⚠️</div>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Something went wrong
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Try the action again. If it keeps failing, refresh the page.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}