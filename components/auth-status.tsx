'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase/client';
import { isAdminUser } from '../lib/auth';

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
      <path d="M14.7 6.3a4 4 0 0 0 4.9 4.9l-8.8 8.8a2 2 0 1 1-2.8-2.8l8.8-8.8a4 4 0 0 0-4.9-4.9l2.2-2.2a4 4 0 0 1 .6 5Z" />
    </svg>
  );
}

export default function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
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

  const emailInitial = useMemo(() => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  }, [user]);

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
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(`Sign out failed: ${error.message}`, { duration: 6000 });
      return;
    }

    toast.success('Signed out.');
  };

  if (!ready) {
    return <div className="h-11 w-64" />;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-300/80 bg-white/85 px-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/85 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <img
          src="https://www.google.com/favicon.ico"
          alt="Google"
          className="h-4 w-4"
        />
        Sign in with Google
      </button>
    );
  }

  const isAdmin = isAdminUser(user.email);

  return (
    <div className="flex min-w-0 items-center gap-3 text-sm">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={user.email ?? 'Profile'}
          className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
          {emailInitial}
        </div>
      )}

      <span className="max-w-[220px] truncate font-medium text-zinc-700 dark:text-zinc-200">
        {user.email}
      </span>

      {isAdmin ? (
        <>
          <span className="h-5 w-px bg-zinc-300 dark:bg-zinc-700" />
          <span
            title="Admin account"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
          >
            <WrenchIcon />
          </span>
        </>
      ) : null}

      <span className="h-5 w-px bg-zinc-300 dark:bg-zinc-700" />

      <button
        type="button"
        onClick={handleSignOut}
        className="font-semibold uppercase tracking-wide text-red-500 transition-colors hover:text-red-600"
      >
        Sign Out
      </button>
    </div>
  );
}