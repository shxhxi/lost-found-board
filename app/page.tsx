import { connection } from 'next/server';
import { createSupabaseServerClient } from '../lib/supabase/server';
import ItemsBoard from '../components/items-board';
import HeaderNav from '../components/header-nav';
import AccountMenu from '../components/account-menu';
import type { ItemRow } from '../lib/types';

export default async function HomePage() {
  await connection();

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
    .in('status', ['open', 'matched'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const items: ItemRow[] = (data ?? []) as ItemRow[];

  return (
    <main className="mx-auto w-full max-w-[1800px] px-6 pb-12 pt-6 sm:px-8 xl:px-10 2xl:px-12">
      <div className="mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              East Bay Community Board
            </p>

            <HeaderNav />
          </div>

          <AccountMenu />
        </div>

        <h1 className="mt-5 bg-gradient-to-r from-sky-600 via-emerald-600 to-amber-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl dark:from-sky-400 dark:via-emerald-400 dark:to-amber-300">
          Lost But Now Found
        </h1>

        <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-300">
          A local lost and found board for Martinez, Concord, Pleasant Hill, Walnut Creek, Lafayette, Orinda, Clayton, Pittsburg, Antioch, and Brentwood.
        </p>
      </div>

      <ItemsBoard initialItems={items} />
    </main>
  );
}