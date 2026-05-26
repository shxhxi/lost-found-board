import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import ClaimsBoard from '../../components/claims-board';
import type { ClaimWithItem } from '../../lib/types';

function normalizeClaim(record: any): ClaimWithItem {
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

  const claims: ClaimWithItem[] = ((data ?? []) as any[]).map(normalizeClaim);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Back to Board
        </Link>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
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