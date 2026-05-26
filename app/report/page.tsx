'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase/client';
import {
  ALLOWED_IMAGE_TYPES,
  EAST_BAY_CITIES,
  FIELD_CLASS,
  getZipOptionsForCity,
  ITEM_CATEGORIES,
  MAX_IMAGE_SIZE,
} from '../../lib/constants';
import type { ReportFormData } from '../../lib/types';

const EMPTY_FORM: ReportFormData = {
  title: '',
  description: '',
  item_type: 'lost',
  category: ITEM_CATEGORIES[0],
  location: '',
  city: '',
  zip_code: '',
  event_date: '',
  ai_summary: '',
};

function normalizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ReportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<ReportFormData>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      setUser(user ?? null);
      setReady(true);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const zipOptions = useMemo(() => getZipOptionsForCity(form.city), [form.city]);

  const signIn = async () => {
    const next = pathname || '/report';
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

  const handleImageChange = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setPreview(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, and WEBP images are allowed.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image must be under 2MB.');
      return;
    }

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleGenerateSummary = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Fill in the title and description first.');
      return;
    }

    setGeneratingSummary(true);

    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Summary generation failed.');
      }

      setForm((prev) => ({
        ...prev,
        ai_summary: data.summary,
      }));

      toast.success('AI summary generated.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Summary generation failed.';
      toast.error(message, { duration: 6000 });
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be signed in to report an item.');
      return;
    }

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.location.trim() ||
      !form.city ||
      !form.zip_code ||
      !form.event_date
    ) {
      toast.error('Title, description, location, city, zip code, and date are required.');
      return;
    }

    setSubmitting(true);

    try {
      let imageUrl: string | null = null;
      let imagePath: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const safeTitle = normalizeFileName(form.title) || 'item';
        imagePath = `${user.id}/${Date.now()}-${safeTitle}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('item-photos')
          .upload(imagePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: imageFile.type,
          });

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        const { data } = supabase.storage
          .from('item-photos')
          .getPublicUrl(imagePath);

        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from('items').insert([
        {
          user_id: user.id,
          title: form.title.trim(),
          description: form.description.trim(),
          item_type: form.item_type,
          category: form.category,
          location: form.location.trim(),
          city: form.city,
          zip_code: form.zip_code,
          event_date: form.event_date,
          image_url: imageUrl,
          image_path: imagePath,
          status: 'open',
          ai_summary: form.ai_summary.trim() || null,
        },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      toast.success('East Bay item reported successfully.');
      router.push('/');
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to report item.';
      toast.error(message, { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6 py-12 sm:px-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-zinc-300 border-t-sky-500 dark:border-zinc-700 dark:border-t-sky-400" />
          <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-8">
        <div className="rounded-2xl border border-black/5 bg-white/85 p-10 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900/85">
          <div className="text-5xl">🔐</div>
          <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Sign in to report an East Bay item
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Reporting is limited to the East Bay service area so people can manage local posts cleanly.
          </p>

          <button
            type="button"
            onClick={signIn}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="h-4 w-4"
            />
            Sign in with Google
          </button>

          <div className="mt-6">
            <Link
              href="/"
              className="text-sm font-semibold text-sky-600 hover:underline dark:text-sky-400"
            >
              ← Back to Board
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:px-8">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Back to Board
        </Link>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Report an East Bay Item
        </h1>

        <p className="mt-2 text-zinc-600 dark:text-zinc-300">
          Post a lost or found item for the East Bay service area only.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-black/5 bg-white/85 p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900/85"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Title *
            </label>
            <input
              className={FIELD_CLASS}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Black backpack with laptop"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Type *
            </label>
            <select
              className={FIELD_CLASS}
              value={form.item_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  item_type: e.target.value as 'lost' | 'found',
                })
              }
            >
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Category *
            </label>
            <select
              className={FIELD_CLASS}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {ITEM_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Date Lost / Found *
            </label>
            <input
              type="date"
              max={today}
              className={FIELD_CLASS}
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              City *
            </label>
            <select
              className={FIELD_CLASS}
              value={form.city}
              onChange={(e) => {
                const nextCity = e.target.value;
                const nextZips = getZipOptionsForCity(nextCity);

                setForm({
                  ...form,
                  city: nextCity,
                  zip_code: nextZips[0] ?? '',
                });
              }}
            >
              <option value="">Select a city</option>
              {EAST_BAY_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              ZIP Code *
            </label>
            <select
              className={FIELD_CLASS}
              value={form.zip_code}
              disabled={!form.city}
              onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
            >
              <option value="">{form.city ? 'Select a ZIP code' : 'Choose city first'}</option>
              {zipOptions.map((zip) => (
                <option key={zip} value={zip}>
                  {zip}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Specific Location *
            </label>
            <input
              className={FIELD_CLASS}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Downtown Martinez Safeway parking lot"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Description *
            </label>
            <textarea
              className={`${FIELD_CLASS} min-h-[140px] resize-y`}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the item, any unique marks, and anything useful for identifying it."
            />
          </div>

          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                AI Summary
              </label>

              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={
                  generatingSummary ||
                  !form.title.trim() ||
                  !form.description.trim()
                }
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingSummary ? 'Generating...' : 'Generate Summary'}
              </button>
            </div>

            <textarea
              className={`${FIELD_CLASS} min-h-[110px] resize-y`}
              value={form.ai_summary}
              onChange={(e) => setForm({ ...form, ai_summary: e.target.value })}
              placeholder="Optional short summary for listing cards and search."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Photo
              <span className="ml-1 font-normal normal-case tracking-normal text-zinc-400 dark:text-zinc-500">
                (optional, JPG/PNG/WEBP, max 2MB)
              </span>
            </label>

            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="mb-3 h-28 w-28 rounded-xl object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
              />
            ) : null}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-zinc-500 file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href="/"
            className="rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Post Item'}
          </button>
        </div>
      </form>
    </main>
  );
}