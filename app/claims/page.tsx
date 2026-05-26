import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import ClaimsBoard from '../../components/claims-board';
import type { ClaimWithItem } from '../../lib/types';

type ClaimQueryRow = Omit<ClaimWithItem, 'items'> & {
  items: ClaimWithItem['items'] | ClaimWithItem['items'][];
};

function normalizeClaim(record: ClaimQueryRow): ClaimWithItem {
  return {
    ...record,
    items: Array.isArray(record.items) ? (record.items[0] ?? null) : record.items,
  };
}

export default async function ClaimsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data, error } = await supabase
    .from('claims')
    .select(
      `
        id,
        item_id,
        claimer_id,
        message,
        contact_email,
        status,
        created_at,
        items!inner (
          id,
          title,
          item_type,
          category,
          location,
          city,
          zip_code,
          status,
          user_id
        )
      `
    )
    .eq('items.user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const claims: ClaimWithItem[] = ((data ?? []) as ClaimQueryRow[]).map(
    normalizeClaim
  );

  return (
    <main className="mx-auto w-full max-w-[1800px] px-6 py-8 sm:px-8 xl:px-10 2xl:px-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Claims Inbox
        </h1>

        <p className="mt-2 text-zinc-600 dark:text-zinc-300">
          Review claim messages from people responding to your posts.
        </p>
      </div>

      <ClaimsBoard initialClaims={claims} />
    </main>
  );
}