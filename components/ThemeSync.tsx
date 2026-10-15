'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { applyTheme, readTheme, themeForPath } from '@/lib/theme';

/*
 * THEME_BOOT runs once per full page load. A client-side navigation keeps the same <html>, so leaving the desk by a
 * <Link> (the review refusal's link home; Web's finding on 78b07b00) carried light onto the public site, and entering
 * the desk by one would stay dark. This re-applies the rule on every path change: the stored choice on /desk and
 * /review, dark everywhere else.
 */
export function ThemeSync() {
  const pathname = usePathname();
  useEffect(() => {
    applyTheme(themeForPath(pathname ?? '', readTheme()));
  }, [pathname]);
  return null;
}
