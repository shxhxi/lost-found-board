import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import ItemDetailClient from '../../../components/item-detail-client';
import type { ItemRow } from '../../../lib/types';

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getAreaLabel(item: ItemRow) {
  if (item.city && item.zip_code) {
    return `${item.city} ${item.zip_code}`;
  }

  if (item.city) {
    return item.city;
  }

  return 'East Bay Area';
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('items')
    .select(
      `
        id,
        user_id,
        title,
        description,
        item_type,
        category,
        location,
        city,
        zip_code,
        event_date,
        image_url,
        image_path,
        status,
        ai_summary,
        created_at,
        updated_at
      `
    )
    .eq('id', id)
    .single();

  if (error || !data) {
    notFound();
  }

  const item = data as ItemRow;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 sm:px-8">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Back to Board
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-2xl border border-black/5 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/85">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title}
              className="mb-6 h-[340px] w-full rounded-xl object-cover"
            />
          ) : (
            <div className="mb-6 flex h-[340px] w-full items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-emerald-100 text-lg font-bold uppercase tracking-[0.3em] text-zinc-600 dark:from-sky-500/10 dark:to-emerald-500/10 dark:text-zinc-300">
              {item.item_type}
            </div>
          )}

          <div className="flex flex-wrap items-start gap-3">
            <h1 className="flex-1 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {item.title}
            </h1>

            <span
              className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                item.item_type === 'lost'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
              }`}
            >
              {item.item_type}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="rounded-md bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
              {item.category}
            </span>
            <span className="rounded-md bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
              {item.location}
            </span>
            <span className="rounded-md bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
              {getAreaLabel(item)}
            </span>
            <span className="rounded-md bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
              {formatDate(item.event_date)}
            </span>
            <span className="rounded-md bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
              {item.status}
            </span>
          </div>

          {item.ai_summary ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                AI Summary
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                {item.ai_summary}
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Full Description
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              {item.description}
            </p>
          </div>
        </section>

        <aside>
          <ItemDetailClient item={item} />
        </aside>
      </div>
    </main>
  );
}