'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase/client';
import type { ClaimWithItem } from '../lib/types';

type Props = {
  initialClaims: ClaimWithItem[];
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ClaimsBoard({ initialClaims }: Props) {
  const [claims, setClaims] = useState<ClaimWithItem[]>(initialClaims);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleStatusChange = async (
    claimId: string,
    nextStatus: 'new' | 'contacted' | 'resolved' | 'dismissed'
  ) => {
    const targetClaim = claims.find((claim) => claim.id === claimId);
    if (!targetClaim) return;

    setSavingId(claimId);

    const { error: claimError } = await supabase
      .from('claims')
      .update({ status: nextStatus })
      .eq('id', claimId);

    if (claimError) {
      setSavingId(null);
      toast.error(`Status update failed: ${claimError.message}`, {
        duration: 6000,
      });
      return;
    }

    if (nextStatus === 'resolved' && targetClaim.items?.id) {
      const itemId = targetClaim.items.id;

      const { error: itemError } = await supabase
        .from('items')
        .update({ status: 'closed' })
        .eq('id', itemId);

      if (itemError) {
        setSavingId(null);
        toast.error(`Claim updated, but item status failed: ${itemError.message}`, {
          duration: 6000,
        });

        setClaims((prev) =>
          prev.map((claim) =>
            claim.id === claimId ? { ...claim, status: nextStatus } : claim
          )
        );

        return;
      }

      const { error: siblingError } = await supabase
        .from('claims')
        .update({ status: 'dismissed' })
        .eq('item_id', itemId)
        .neq('id', claimId)
        .in('status', ['new', 'contacted']);

      if (siblingError) {
        console.warn('Sibling claim update failed:', siblingError.message);
      }

      setClaims((prev) =>
        prev.map((claim) => {
          if (claim.id === claimId) {
            return {
              ...claim,
              status: 'resolved',
              items: claim.items ? { ...claim.items, status: 'closed' } : claim.items,
            };
          }

          if (
            claim.item_id === itemId &&
            claim.id !== claimId &&
            (claim.status === 'new' || claim.status === 'contacted')
          ) {
            return {
              ...claim,
              status: 'dismissed',
              items: claim.items ? { ...claim.items, status: 'closed' } : claim.items,
            };
          }

          if (claim.item_id === itemId) {
            return {
              ...claim,
              items: claim.items ? { ...claim.items, status: 'closed' } : claim.items,
            };
          }

          return claim;
        })
      );

      setSavingId(null);
      toast.success('Claim resolved, item closed, and other open claims dismissed.');
      return;
    }

    setClaims((prev) =>
      prev.map((claim) =>
        claim.id === claimId ? { ...claim, status: nextStatus } : claim
      )
    );

    setSavingId(null);
    toast.success(`Claim marked as ${nextStatus}.`);
  };

  if (claims.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
        <div className="text-4xl">📬</div>
        <h2 className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          No claims yet
        </h2>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          When someone responds to one of your items, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {claims.map((claim) => {
        const item = claim.items;
        const isSaving = savingId === claim.id;

        return (
          <article
            key={claim.id}
            className="rounded-2xl border border-emerald-100/80 bg-white/90 p-6 shadow-sm dark:border-emerald-900/30 dark:bg-zinc-900/85"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {item?.title ?? 'Unknown item'}
                  </h2>

                  <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    {claim.status}
                  </span>

                  {item?.status ? (
                    <span className="rounded-md bg-sky-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
                      item: {item.status}
                    </span>
                  ) : null}
                </div>

                {item ? (
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {item.item_type} • {item.category} • {item.location}
                  </p>
                ) : null}

                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Contact email
                </p>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                  {claim.contact_email}
                </p>

                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Message
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  {claim.message}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Submitted {formatDate(claim.created_at)}</span>
                  {item ? (
                    <Link
                      href={`/items/${item.id}`}
                      className="font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                      View item →
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:w-[280px] lg:justify-end">
                {(['new', 'contacted', 'resolved', 'dismissed'] as const).map(
                  (status) => {
                    const active = claim.status === status;

                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleStatusChange(claim.id, status)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                        } ${isSaving ? 'opacity-50' : ''}`}
                      >
                        {status}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}