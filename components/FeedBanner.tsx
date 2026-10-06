import type { FeedBanner as FeedBannerState } from '@/lib/dashboard/feedBanner';

/**
 * One line above the board when it is not updating. Silent otherwise.
 *
 * Warn-toned, never red: the numbers on screen are real, they are only not
 * current. A status role, not an alert: it must not interrupt a screen reader
 * every poll. It does not wrap at 1,024 px in its longest case (a dated time and
 * a two-digit minute count); the page builds the state, this only prints it.
 */
export function FeedBanner({ banner }: { banner: FeedBannerState | null }) {
  if (!banner) return null;
  return (
    <p
      role="status"
      data-feed-banner={banner.cause}
      className="m-0 border-b border-warn/35 bg-warn/12 px-4 py-1 text-[12px] font-medium whitespace-nowrap text-warn"
    >
      {banner.text}
    </p>
  );
}
