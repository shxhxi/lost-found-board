'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase/client';
import { isAdminUser } from '../lib/auth';

type ThemePreference = 'light' | 'dark' | 'system';

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 7.5a5.5 5.5 0 0 1-7.68 5.05l-7.47 7.48a1.75 1.75 0 1 1-2.48-2.48l7.48-7.47A5.5 5.5 0 0 1 16.5 3l-3 3 .75 2.25L16.5 9z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldUseDark =
    preference === 'dark' || (preference === 'system' && prefersDark);

  root.classList.toggle('dark', shouldUseDark);
}

function getInitialThemePreference(): ThemePreference {
  const saved = window.localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
}

export default function AccountMenu() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [themePreference, setThemePreference] =
    useState<ThemePreference>('system');

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

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

  useEffect(() => {
    const preference = getInitialThemePreference();
    setThemePreference(preference);
    applyTheme(preference);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const current = getInitialThemePreference();
      if (current === 'system') {
        applyTheme('system');
      }
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const avatarUrl = useMemo(() => {
    if (!user) return null;

    const avatar =
      typeof user.user_metadata?.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : typeof user.user_metadata?.picture === 'string'
          ? user.user_metadata.picture
          : null;

    return avatar;
  }, [user]);

  const displayName = useMemo(() => {
    if (!user) return 'Guest';

    const fullName =
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === 'string'
          ? user.user_metadata.name
          : '';

    return fullName.trim() || user.email || 'Account';
  }, [user]);

  const emailInitial = useMemo(() => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  }, [user]);

  const isAdmin = isAdminUser(user?.email ?? null);

  const handleSetTheme = (preference: ThemePreference) => {
    window.localStorage.setItem('theme', preference);
    applyTheme(preference);
    setThemePreference(preference);
  };

  const handleSignIn = async () => {
    const next = pathname || '/';
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      toast.error(`Sign in failed: ${error.message}`, { duration: 6000 });
      return;
    }

    setOpen(false);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(`Sign out failed: ${error.message}`, { duration: 6000 });
      return;
    }

    setOpen(false);
    toast.success('Signed out.');
  };

  if (!ready) {
    return <div className="h-11 w-28" />;
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-11 items-center gap-3 rounded-xl border border-zinc-300/80 bg-white/85 px-3 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/85 dark:hover:bg-zinc-800"
      >
        {user ? (
          <>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.email ?? 'Profile'}
                className="h-8 w-8 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                {emailInitial}
              </div>
            )}
          </>
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <UserIcon />
          </span>
        )}

        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400">
          <MenuIcon />
        </span>
      </button>

      <div
        id="account-menu"
        role="menu"
        aria-label="Account menu"
        className={`absolute right-0 top-full z-50 mt-3 w-72 origin-top-right rounded-xl border border-zinc-200 bg-white/95 p-2 shadow-xl backdrop-blur transition-all duration-150 dark:border-zinc-800 dark:bg-zinc-950/95 ${
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-1 opacity-0'
        }`}
      >
        <div className="rounded-lg px-3 py-3">
          <div className="flex items-start gap-3">
            {user ? (
              avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.email ?? 'Profile'}
                  className="h-10 w-10 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                  {emailInitial}
                </div>
              )
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <UserIcon />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {displayName}
              </p>
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                {user?.email ?? 'Not signed in'}
              </p>

              {isAdmin ? (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                  <WrenchIcon />
                  Admin
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="my-2 h-px bg-zinc-200 dark:bg-zinc-800" />

        <div className="px-3 pb-1 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
            Theme
          </p>
        </div>

        <div className="space-y-1">
          {(['light', 'dark', 'system'] as const).map((option) => {
            const active = themePreference === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSetTheme(option)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-emerald-50 text-zinc-900 dark:bg-emerald-900/20 dark:text-zinc-100'
                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900'
                }`}
              >
                <span className="capitalize">{option}</span>
                {active ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    <CheckIcon />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="my-2 h-px bg-zinc-200 dark:bg-zinc-800" />

        {user ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
          >
            Sign out
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSignIn}
            className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-semibold text-sky-600 transition hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/20 dark:text-sky-400 dark:hover:text-sky-300"
          >
            Sign in with Google
          </button>
        )}
      </div>
    </div>
  );
}