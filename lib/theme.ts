/**
 * LIGHT / DARK MODE (his ask 2026-10-14: "can we setup a light/dark mode? default is dark.").
 *
 * Dark is the default and needs no attribute. Light is `data-theme="light"` on <html>, which swaps the colour
 * tokens in app/globals.css. The choice is per viewer, kept in this browser's localStorage, and applies only on the
 * desk and the review pages: the public site, sign-in and legal pages stay as they are.
 *
 * THEME_BOOT runs inline in <head> before the first paint (Next's "preventing flash before hydration" guide), so a
 * light-mode viewer never sees a dark flash. Storage can throw (private window, blocked site data): every read and
 * write is guarded and falls back to dark.
 */

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'tmi-theme';

/** The paths the choice applies to. */
export const THEMED_PATH_PREFIXES = ['/desk', '/review'] as const;

export function isThemedPath(pathname: string): boolean {
  return THEMED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

/** Anything but the exact string "light" is dark: a stale or tampered value never produces a third state. */
export function parseTheme(raw: unknown): Theme {
  return raw === 'light' ? 'light' : 'dark';
}

/** The theme a path shows: the stored choice on the desk and review pages, dark everywhere else. */
export function themeForPath(pathname: string, stored: Theme): Theme {
  return isThemedPath(pathname) ? stored : 'dark';
}

export function readTheme(): Theme {
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');
}

export function saveTheme(theme: Theme): void {
  try {
    if (theme === 'light') window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    else window.localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Storage blocked: the choice still applies to this page, it just is not remembered.
  }
}

/** The inline boot script: the same rules as isThemedPath and parseTheme, in plain ES5 for <head>. */
export const THEME_BOOT = `(function(){try{var p=location.pathname;var on=${JSON.stringify(THEMED_PATH_PREFIXES)}.some(function(x){return p===x||p.indexOf(x+'/')===0});if(on&&localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}})()`;
