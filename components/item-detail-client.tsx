'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase/client';
import type { ClaimFormData, ItemRow } from '../lib/types';

type Props = {
  item: ItemRow;
};

const EMPTY_CLAIM: ClaimFormData = {
  message: '',
  contact_email: '',
};

export default function ItemDetailClient({ item }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<ClaimFormData>(EMPTY_CLAIM);
  const [submitting, setSubmitting] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      setUser(user ?? null);
      setForm((prev) => ({
        ...prev,
        contact_email: user?.email ?? prev.contact_email,
      }));
      setReady(true);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setForm((prev) => ({
        ...prev,
        contact_email: nextUser?.email ?? prev.contact_email,
      }));
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadOwnerEmail = async () => {
      if (!user || ownerEmail) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', item.user_id)
        .maybeSingle();

      if (!error) {
        setOwnerEmail(data?.email ?? null);
      }
    };

    loadOwnerEmail();
  }, [user, ownerEmail, item.user_id]);

  const signIn = async () => {
    const next = pathname || `/items/${item.id}`;
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      toast.error(`Sign in failed: ${error.message}`, { duration: 6000 });
    }
  };

  const handleClaim = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      toast.error('You need to sign in first.');
      return;
    }

    if (!form.message.trim() || !form.contact_email.trim()) {
      toast.error('Message and contact email are required.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('claims').insert([
        {
          item_id: item.id,
          claimer_id: user.id,
          message: form.message.trim(),
          contact_email: form.contact_email.trim(),
          status: 'new',
        },
      ]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('You already submitted a claim for this item.');
        }

        throw new Error(error.message);
      }

      const notifyResponse = await fetch('/api/notify-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          itemTitle: item.title,
          itemType: item.item_type,
          location: item.location,
          contactEmail: form.contact_email.trim(),
          message: form.message.trim(),
          ownerEmail,
        }),
      });

      if (!notifyResponse.ok) {
        console.warn('Claim email notification failed.');
      }

      setForm({
        message: '',
        contact_email: user.email ?? '',
      });

      toast.success('Claim submitted.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit claim.';
      toast.error(message, { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/85">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Checking sign-in status...
        </p>
      </div>
    );
  }

  if (user?.id === item.user_id) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-900/20">
        <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">
          You posted this item
        </h2>
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
          Manage this listing from your dashboard or review incoming claim messages.
        </p>

        <div className="mt-5 flex gap-3">
          <Link
            href="/my-items"
            className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            My Items
          </Link>

          <Link
            href="/claims"
            className="rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Claims Inbox
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/85">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Think this might be yours?
      </h2>

      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Send a claim message with enough detail for follow-up.
      </p>

      {!user ? (
        <button
          type="button"
          onClick={signIn}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="h-4 w-4"
          />
          Sign in to claim
        </button>
      ) : (
        <form onSubmit={handleClaim} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Contact Email *
            </label>
            <input
              value={form.contact_email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, contact_email: e.target.value }))
              }
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="you@example.com"
              type="email"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Message *
            </label>
            <textarea
              value={form.message}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, message: e.target.value }))
              }
              className="min-h-[140px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="Describe why you think this item is yours and any details that help verify ownership."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Send Claim'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}