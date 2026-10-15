import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';

import { THEME_BOOT, THEME_STORAGE_KEY, isThemedPath, parseTheme, themeForPath } from '@/lib/theme';

/*
 * Light / dark mode (his ask 2026-10-14). Dark is the default; light is per viewer, desk and review only.
 */

/** Runs THEME_BOOT against a fake document and storage; returns the data-theme it set, or null. */
function boot(pathname: string, stored: string | null, throws = false): string | null {
  const attrs: Record<string, string> = {};
  const sandbox = {
    location: { pathname },
    localStorage: {
      getItem: (key: string) => {
        if (throws) throw new Error('blocked');
        return key === THEME_STORAGE_KEY ? stored : null;
      },
    },
    document: { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } } },
  };
  runInNewContext(THEME_BOOT, sandbox);
  return attrs['data-theme'] ?? null;
}

describe('the theme rules', () => {
  it('only the exact "light" is light; anything else is dark', () => {
    expect(parseTheme('light')).toBe('light');
    for (const raw of ['dark', 'LIGHT', '', null, undefined, 1]) expect(parseTheme(raw)).toBe('dark');
  });

  it('applies on the desk and review pages only', () => {
    for (const p of ['/desk', '/review/abc', '/review/abc/diagnostics']) expect(isThemedPath(p)).toBe(true);
    for (const p of ['/', '/signin', '/terms', '/desktop', '/reviewer']) expect(isThemedPath(p)).toBe(false);
  });
});

describe('client-side navigation (Web on 78b07b00)', () => {
  it('a path change re-applies the rule: the stored choice on the desk, dark on the public site', () => {
    expect(themeForPath('/desk', 'light')).toBe('light');
    expect(themeForPath('/review/tok', 'light')).toBe('light');
    expect(themeForPath('/', 'light')).toBe('dark');
    expect(themeForPath('/signin', 'light')).toBe('dark');
    expect(themeForPath('/desk', 'dark')).toBe('dark');
  });

  it('the root layout mounts the watcher, which applies themeForPath on every path change', () => {
    const layout = readFileSync(join(process.cwd(), 'app/layout.tsx'), 'utf8');
    expect(layout).toContain('<ThemeSync />');
    const sync = readFileSync(join(process.cwd(), 'components/ThemeSync.tsx'), 'utf8');
    expect(sync).toContain('applyTheme(themeForPath(');
    expect(sync).toContain('[pathname]');
  });
});

describe('the boot script, before first paint', () => {
  it('sets light on a desk page when the viewer chose light', () => {
    expect(boot('/desk', 'light')).toBe('light');
    expect(boot('/review/tok', 'light')).toBe('light');
  });

  it('leaves dark (no attribute) by default, off the desk, and when storage throws', () => {
    expect(boot('/desk', null)).toBeNull();
    expect(boot('/desk', 'dark')).toBeNull();
    expect(boot('/', 'light')).toBeNull();
    expect(boot('/signin', 'light')).toBeNull();
    expect(boot('/desk', 'light', true)).toBeNull();
  });
});

describe('the light palette', () => {
  const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8').replace(/\r\n/g, '\n');
  const block = (selector: string) => {
    const start = css.indexOf(selector);
    expect(start, selector).toBeGreaterThanOrEqual(0);
    return css.slice(start, css.indexOf('\n}', start));
  };
  const colours = (text: string) => [...text.matchAll(/(--color-[a-z0-9-]+)\s*:/g)].map((m) => m[1]);

  it('overrides every colour token the dark theme defines, so a new token cannot stay dark in light mode', () => {
    const dark = colours(block('@theme {'));
    const light = colours(block('html[data-theme="light"] {'));
    // Control: the dark theme has the tokens this desk paints with.
    expect(dark).toContain('--color-desk');
    expect(dark).toContain('--color-ink-3');
    expect([...light].sort()).toEqual([...dark].sort());
  });
});
