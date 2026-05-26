export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-6 py-12 sm:px-8">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-zinc-300 border-t-sky-500 dark:border-zinc-700 dark:border-t-sky-400" />
        <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Loading lost and found items...
        </p>
      </div>
    </main>
  );
}