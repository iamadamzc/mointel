'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { FeedBanner } from '@/lib/dashboard/feedBanner';

/**
 * The "not updating" state, for every surface that would otherwise say live.
 *
 * One context so the header chip, the price-source tooltips and the drawer title
 * read the SAME object the banner prints, and all of them revert on the same
 * render the banner clears. Null (the default, and the state of anything
 * rendered outside the shell) means current: today's words.
 */
const FeedBannerContext = createContext<FeedBanner | null>(null);

export function FeedBannerProvider({ banner, children }: { banner: FeedBanner | null; children: ReactNode }) {
  return <FeedBannerContext.Provider value={banner}>{children}</FeedBannerContext.Provider>;
}

export function useFeedBanner(): FeedBanner | null {
  return useContext(FeedBannerContext);
}
