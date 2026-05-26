'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ItemRow } from '../lib/types';
import { ITEM_CATEGORIES } from '../lib/constants';

type Props = {
  initialItems: ItemRow[];
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

function getFallbackVisual(itemType: string) {
  return itemType === 'lost' ? 'LOST' : 'FOUND';
}

function getAreaLabel(item: ItemRow) {
  if (item.city && item.zip_code) {
    return `${item.city} • ${item.zip_code}`;
  }

  if (item.city) {
    return item.city;
  }

  return 'East Bay Area';
}

function getTypePillClass(itemType: string) {
  return itemType === 'lost'
    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200';
}

function getStatusPillClass(status: string) {
  if (status === 'matched') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
  }

  if (status === 'closed') {
    return 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  }

  return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200';
}

export default function ItemsBoard({ initialItems }: Props) {
  const [items] = useState<ItemRow[]>(initialItems);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [debouncing, setDebouncing] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'lost' | 'found'>(
    'all'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    setDebouncing(true);

    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim().toLowerCase());
      setDebouncing(false);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const visibleCategories = useMemo(() => {
    const present = new Set(items.map((item) => item.category));
    return ITEM_CATEGORIES.filter((category) => present.has(category));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType =
        selectedType === 'all' ? true : item.item_type === selectedType;

      const matchesCategory =
        selectedCategory === 'All' ? true : item.category === selectedCategory;

      const haystack = [
        item.title,
        item.description,
        item.category,
        item.location,
        item.city ?? '',
        item.zip_code ?? '',
        item.item_type,
        item.ai_summary ?? '',
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = search ? haystack.includes(search) : true;

      return matchesType && matchesCategory && matchesSearch;
    });
  }, [items, search, selectedType, selectedCategory]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-300/70 p-10 text-center dark:border-emerald-800/60">
        <div className="text-4xl">🌉</div>
        <h2 className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          No East Bay posts yet
        </h2>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Be the first to report a lost or found item in Martinez, Concord, Walnut Creek, or nearby.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, city, zip code, category, or location"
              className="w-full rounded-xl border border-emerald-200/80 bg-white/90 px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-emerald-900/40 dark:bg-zinc-900/85 dark:text-zinc-100"
            />
            {debouncing ? (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-500 dark:border-zinc-700 dark:border-t-emerald-400" />
              </div>
            ) : null}
          </div>

          <Link
            href="/report"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-sky-700 hover:to-emerald-700"
          >
            Report an Item
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex w-fit rounded-xl border border-emerald-200/80 bg-white/90 p-1 shadow-sm dark:border-emerald-900/40 dark:bg-zinc-900/85">
            {(['all', 'lost', 'found'] as const).map((type) => {
              const active = selectedType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-gradient-to-r from-sky-600 to-emerald-600 text-white shadow-sm'
                      : 'text-zinc-700 hover:bg-emerald-50 dark:text-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {type === 'all'
                    ? 'All'
                    : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              selectedCategory === 'All'
                ? 'bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900'
                : 'border border-emerald-200/70 bg-white text-zinc-700 shadow-sm hover:-translate-y-0.5 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            All Categories
          </button>

          {visibleCategories.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-gradient-to-r from-emerald-600 to-amber-500 text-white shadow-md'
                    : 'border border-emerald-200/70 bg-white text-zinc-700 shadow-sm hover:-translate-y-0.5 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-300/70 p-10 text-center text-zinc-500 dark:border-emerald-800/60 dark:text-zinc-400">
          <div className="text-4xl">🔎</div>
          <h2 className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            No matching East Bay items
          </h2>
          <p className="mt-2">Try changing your search or filters.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-emerald-100/80 bg-white/90 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-emerald-900/30 dark:bg-zinc-900/85 dark:hover:shadow-[0_14px_36px_rgba(16,185,129,0.10)]"
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  className="mb-4 h-44 w-full rounded-xl object-cover"
                />
              ) : (
                <div className="mb-4 flex h-44 w-full items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-100 text-sm font-bold tracking-[0.3em] text-zinc-600 dark:from-sky-500/10 dark:via-emerald-500/10 dark:to-amber-400/10 dark:text-zinc-300">
                  {getFallbackVisual(item.item_type)}
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </h2>

                <span
                  className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${getTypePillClass(
                    item.item_type
                  )}`}
                >
                  {item.item_type}
                </span>
              </div>

              <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {item.category}
              </p>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {item.location}
              </p>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {getAreaLabel(item)} • {formatDate(item.event_date)}
              </p>

              <p className="mt-4 line-clamp-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {item.ai_summary || item.description}
              </p>

              <div className="mt-5 flex items-center justify-between">
                <span
                  className={`rounded-md px-2.5 py-1 text-xs ${getStatusPillClass(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>

                <Link
                  href={`/items/${item.id}`}
                  className="text-sm font-semibold text-sky-600 transition hover:text-emerald-700 dark:text-sky-400 dark:hover:text-emerald-300"
                >
                  View details →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}