'use client';

import { useEffect, useState } from 'react';

import { applyTheme, readTheme, saveTheme, type Theme } from '@/lib/theme';

/*
 * The desk header's light/dark switch (lib/theme.ts). The button names the mode it switches TO. It renders nothing
 * until mounted, because the server cannot know the stored choice and a wrong first label is a hydration mismatch;
 * the page itself is already in the right theme from THEME_BOOT.
 */
export const THEME_TOGGLE_WORDS = {
  toLight: 'Light',
  toDark: 'Dark',
  titleToLight: 'Switch to light mode',
  titleToDark: 'Switch to dark mode',
} as const;

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Read once on mount; THEME_BOOT has already applied it before paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readTheme());
  }, []);

  if (theme === null) return null;

  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const toggle = () => {
    applyTheme(next);
    saveTheme(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={next === 'light' ? THEME_TOGGLE_WORDS.titleToLight : THEME_TOGGLE_WORDS.titleToDark}
      className="min-h-[24px] rounded-sm border border-line-2 bg-panel-2 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-ink-2 uppercase transition-colors hover:border-accent/50 hover:text-ink"
    >
      {next === 'light' ? THEME_TOGGLE_WORDS.toLight : THEME_TOGGLE_WORDS.toDark}
    </button>
  );
}
