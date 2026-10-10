'use client';

import type { FeedFailure } from '@/lib/dashboard/feedFailure';
import { StatusBadge } from '@/components/StatusBadge';
import type { DataSourceMeta } from '@/lib/data/types';

interface DataFreshnessProps {
  meta: DataSourceMeta;
  /** Millisecond clock supplied by the parent so every element ticks together. */
  now: number;
  /** False during server render, when no wall clock is available. */
  mounted: boolean;
  failure: FeedFailure | null;
}

export function DataFreshness({ meta }: DataFreshnessProps) {
  /*
   * NO SHEET LIGHT AND NO "Sheet sync" TIME (Sheet switch-off step 3e, Integration 36th). A reader does not
   * know the Sheet from the desk, so the header stops naming it. Only the development mock keeps its warning,
   * which no production board shows.
   */
  if (meta.provider !== 'mock') return null;
  return (
    <div className="flex items-center gap-3">
      <StatusBadge
        label="Research: Mock Data"
        tone="warn"
        title="No Google credentials configured. Showing the built-in mock dataset."
      />
    </div>
  );
}
