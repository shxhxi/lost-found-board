'use client';

import { useEffect, useState } from 'react';

function SunIcon() {
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </svg>
  );
}

function MoonIcon() {
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
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const saved = window.localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const nextDark = saved ? saved === 'dark' : prefersDark;

    root.classList.toggle('dark', nextDark);
    setDark(nextDark);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextDark = !dark;
    const root = document.documentElement;

    root.classList.toggle('dark', nextDark);
    window.localStorage.setItem('theme', nextDark ? 'dark' : 'light');
    setDark(nextDark);
  };

  if (!mounted) {
    return <div className="h-11 w-11" />;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-300/80 bg-white/90 text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/85 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}