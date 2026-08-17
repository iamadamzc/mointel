'use client';

import { useSyncExternalStore } from 'react';

/**
 * Second-resolution wall clock.
 *
 * Implemented as an external store so the server snapshot is deterministic
 * (0 = "not yet mounted"), which keeps the rendered clock out of hydration
 * mismatches without a mount-flag effect.
 */
function subscribe(onChange: () => void): () => void {
  const interval = setInterval(onChange, 1000);
  return () => clearInterval(interval);
}

function getSnapshot(): number {
  // Truncated to whole seconds so repeated reads inside one render agree.
  return Math.floor(Date.now() / 1000) * 1000;
}

function getServerSnapshot(): number {
  return 0;
}

export interface ClockState {
  /** Epoch milliseconds, truncated to the second. 0 before hydration. */
  now: number;
  mounted: boolean;
}

export function useClock(): ClockState {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { now, mounted: now !== 0 };
}
