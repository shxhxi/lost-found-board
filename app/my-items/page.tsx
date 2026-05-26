import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import MyItemsManager from '../../components/my-items-manager';
import type { ItemRow } from '../../lib/types';

export default async function MyItemsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

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
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const items: ItemRow[] = (data ?? []) as ItemRow[];

  return (
    <main className="mx-auto w-full max-w-[1800px] px-6 py-8 sm:px-8 xl:px-10 2xl:px-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          My East Bay Items
        </h1>

        <p className="mt-2 text-zinc-600 dark:text-zinc-300">
          Edit, close, or delete the items you have posted in the East Bay service area.
        </p>
      </div>

      <MyItemsManager initialItems={items} currentUserId={user.id} />
    </main>
  );
}