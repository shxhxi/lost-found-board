'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase/client';
import {
  ALLOWED_IMAGE_TYPES,
  EAST_BAY_CITIES,
  FIELD_CLASS,
  getZipOptionsForCity,
  ITEM_CATEGORIES,
  MAX_IMAGE_SIZE,
} from '../lib/constants';
import type { ItemRow, ReportFormData } from '../lib/types';

type Props = {
  initialItems: ItemRow[];
  currentUserId: string;
};

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

function normalizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sortItems(items: ItemRow[]) {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
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

export default function MyItemsManager({
  initialItems,
  currentUserId,
}: Props) {
  const [items, setItems] = useState<ItemRow[]>(() => sortItems(initialItems));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ReportFormData>(EMPTY_FORM);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ItemRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const editingItem = useMemo(
    () => items.find((item) => item.id === editingId) ?? null,
    [items, editingId]
  );

  const editZipOptions = useMemo(
    () => getZipOptionsForCity(editForm.city),
    [editForm.city]
  );

  const openEditor = (item: ItemRow) => {
    setEditingId(item.id);
    setEditForm({
      title: item.title,
      description: item.description,
      item_type: item.item_type as 'lost' | 'found',
      category: item.category,
      location: item.location,
      city: item.city ?? '',
      zip_code: item.zip_code ?? '',
      event_date: item.event_date,
      ai_summary: item.ai_summary ?? '',
    });
    setNewImageFile(null);
    setNewImagePreview(item.image_url ?? null);
    setRemoveCurrentImage(false);
  };

  const closeEditor = () => {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
    setNewImageFile(null);
    setNewImagePreview(null);
    setRemoveCurrentImage(false);
  };

  const handleImageChange = (file: File | null) => {
    if (!file) {
      setNewImageFile(null);
      setNewImagePreview(editingItem?.image_url ?? null);
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

    setNewImageFile(file);
    setRemoveCurrentImage(false);
    setNewImagePreview(URL.createObjectURL(file));
  };

  const handleGenerateSummary = async (itemId: string) => {
    if (!editForm.title.trim() || !editForm.description.trim()) {
      toast.error('Fill in the title and description first.');
      return;
    }

    setGeneratingId(itemId);

    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Summary generation failed.');
      }

      setEditForm((prev) => ({
        ...prev,
        ai_summary: data.summary,
      }));

      toast.success('AI summary generated.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Summary generation failed.';
      toast.error(message, { duration: 6000 });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSave = async (itemId: string) => {
    const currentItem = items.find((item) => item.id === itemId);
    if (!currentItem) return;

    if (
      !editForm.title.trim() ||
      !editForm.description.trim() ||
      !editForm.location.trim() ||
      !editForm.city ||
      !editForm.zip_code ||
      !editForm.event_date
    ) {
      toast.error('Title, description, location, city, zip code, and date are required.');
      return;
    }

    setSavingId(itemId);

    try {
      let nextImageUrl = currentItem.image_url;
      let nextImagePath = currentItem.image_path;
      let oldPathToDelete: string | null = null;

      if (newImageFile) {
        const ext = newImageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const safeTitle = normalizeFileName(editForm.title) || 'item';
        const uploadedPath = `${currentUserId}/${Date.now()}-${safeTitle}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('item-photos')
          .upload(uploadedPath, newImageFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: newImageFile.type,
          });

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        const { data } = supabase.storage
          .from('item-photos')
          .getPublicUrl(uploadedPath);

        nextImageUrl = data.publicUrl;
        nextImagePath = uploadedPath;

        if (currentItem.image_path) {
          oldPathToDelete = currentItem.image_path;
        }
      } else if (removeCurrentImage && currentItem.image_path) {
        nextImageUrl = null;
        nextImagePath = null;
        oldPathToDelete = currentItem.image_path;
      }

      const { data, error } = await supabase
        .from('items')
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          item_type: editForm.item_type,
          category: editForm.category,
          location: editForm.location.trim(),
          city: editForm.city,
          zip_code: editForm.zip_code,
          event_date: editForm.event_date,
          ai_summary: editForm.ai_summary.trim() || null,
          image_url: nextImageUrl,
          image_path: nextImagePath,
        })
        .eq('id', itemId)
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
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Update failed.');
      }

      if (oldPathToDelete) {
        const { error: removeError } = await supabase.storage
          .from('item-photos')
          .remove([oldPathToDelete]);

        if (removeError) {
          console.warn('Old image cleanup failed:', removeError.message);
        }
      }

      setItems((prev) =>
        sortItems(prev.map((item) => (item.id === itemId ? (data as ItemRow) : item)))
      );

      toast.success('Item updated.');
      closeEditor();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update item.';
      toast.error(message, { duration: 6000 });
    } finally {
      setSavingId(null);
    }
  };

  const handleStatusChange = async (
    itemId: string,
    nextStatus: 'open' | 'matched' | 'closed'
  ) => {
    const previous = items;

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: nextStatus } : item
      )
    );

    const { error } = await supabase
      .from('items')
      .update({ status: nextStatus })
      .eq('id', itemId);

    if (error) {
      setItems(previous);
      toast.error(`Status update failed: ${error.message}`, { duration: 6000 });
      return;
    }

    toast.success(`Marked as ${nextStatus}.`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const target = deleteTarget;
    const previous = items;

    setDeleting(true);
    setDeleteTarget(null);
    setItems((prev) => prev.filter((item) => item.id !== target.id));

    const { error } = await supabase.from('items').delete().eq('id', target.id);

    if (error) {
      setItems(previous);
      setDeleting(false);
      toast.error(`Delete failed: ${error.message}`, { duration: 6000 });
      return;
    }

    if (target.image_path) {
      const { error: removeError } = await supabase.storage
        .from('item-photos')
        .remove([target.image_path]);

      if (removeError) {
        console.warn('Image cleanup failed:', removeError.message);
      }
    }

    setDeleting(false);
    toast.success('Item deleted.');
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
        <div className="text-4xl">🗂️</div>
        <h2 className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          No East Bay items posted yet
        </h2>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Create your first East Bay lost or found listing.
        </p>
        <Link
          href="/report"
          className="mt-5 inline-flex rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
        >
          Report an Item
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const isEditing = editingId === item.id;
          const isSaving = savingId === item.id;
          const isGenerating = generatingId === item.id;

          return (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-emerald-100/80 bg-white/90 p-5 shadow-sm dark:border-emerald-900/30 dark:bg-zinc-900/85"
            >
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Title *
                      </label>
                      <input
                        className={FIELD_CLASS}
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Type *
                      </label>
                      <select
                        className={FIELD_CLASS}
                        value={editForm.item_type}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            item_type: e.target.value as 'lost' | 'found',
                          }))
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
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, category: e.target.value }))
                        }
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
                        Date *
                      </label>
                      <input
                        type="date"
                        className={FIELD_CLASS}
                        value={editForm.event_date}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, event_date: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        City *
                      </label>
                      <select
                        className={FIELD_CLASS}
                        value={editForm.city}
                        onChange={(e) => {
                          const nextCity = e.target.value;
                          const nextZips = getZipOptionsForCity(nextCity);

                          setEditForm((prev) => ({
                            ...prev,
                            city: nextCity,
                            zip_code: nextZips.some((zip) => zip === prev.zip_code)
                              ? prev.zip_code
                              : nextZips[0] ?? '',
                          }));
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
                        value={editForm.zip_code}
                        disabled={!editForm.city}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, zip_code: e.target.value }))
                        }
                      >
                        <option value="">
                          {editForm.city ? 'Select a ZIP code' : 'Choose city first'}
                        </option>
                        {editZipOptions.map((zip) => (
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
                        value={editForm.location}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, location: e.target.value }))
                        }
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Description *
                      </label>
                      <textarea
                        className={`${FIELD_CLASS} min-h-[120px] resize-y`}
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          AI Summary
                        </label>

                        <button
                          type="button"
                          onClick={() => handleGenerateSummary(item.id)}
                          disabled={
                            isGenerating ||
                            !editForm.title.trim() ||
                            !editForm.description.trim()
                          }
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isGenerating ? 'Generating...' : 'Generate Summary'}
                        </button>
                      </div>

                      <textarea
                        className={`${FIELD_CLASS} min-h-[100px] resize-y`}
                        value={editForm.ai_summary}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            ai_summary: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Replace Photo
                      </label>

                      {newImagePreview ? (
                        <img
                          src={newImagePreview}
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

                      {item.image_url ? (
                        <label className="mt-3 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={removeCurrentImage}
                            onChange={(e) => {
                              setRemoveCurrentImage(e.target.checked);
                              if (e.target.checked && !newImageFile) {
                                setNewImagePreview(null);
                              } else if (!e.target.checked && !newImageFile) {
                                setNewImagePreview(item.image_url);
                              }
                            }}
                          />
                          Remove current image
                        </label>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeEditor}
                      className="rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave(item.id)}
                      disabled={isSaving}
                      className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="mb-4 h-52 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="mb-4 flex h-52 w-full items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-emerald-100 text-sm font-bold tracking-[0.3em] text-zinc-600 dark:from-sky-500/10 dark:to-emerald-500/10 dark:text-zinc-300">
                      {getFallbackVisual(item.item_type)}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {item.location}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {getAreaLabel(item)} • {formatDate(item.event_date)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        item.item_type === 'lost'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                      }`}
                    >
                      {item.item_type}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {item.category}
                  </p>

                  <p className="mt-4 line-clamp-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                    {item.ai_summary || item.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {(['open', 'matched', 'closed'] as const).map((status) => {
                      const active = item.status === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusChange(item.id, status)}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                            active
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {status}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <Link
                      href={`/items/${item.id}`}
                      className="text-sm font-semibold text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                      View details →
                    </Link>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditor(item)}
                        className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl dark:bg-zinc-900">
            <h3 className="mb-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Delete Item
            </h3>

            <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
              Are you sure you want to delete <strong>{deleteTarget.title}</strong>? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}