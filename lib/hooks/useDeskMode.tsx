'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * Which desk the client is looking at, and what it is allowed to do with it.
 *
 * The dashboard is rendered twice from the same components: once at `/` for the
 * owner, behind Basic Auth, and once under `/review/<token>/` for an outside
 * reviewer holding a temporary capability. The two differ in exactly two ways —
 * where the API lives, and whether anything may be written — so those two facts
 * travel in context rather than as props threaded through every component
 * between the shell and a Focus star.
 *
 * `readOnly` here is a UI concern only. It removes controls that would fail,
 * because offering a button that returns 403 is worse than not offering it. It
 * is NOT the security boundary: that is proxy.ts, plus the fact that the review
 * API namespace implements no mutating handler at all.
 */
export interface DeskMode {
  /** Prefix for every client fetch, e.g. `/api` or `/review/<token>/api`. */
  apiBase: string;
  /** True in a review session: hide controls that the server would refuse. */
  readOnly: boolean;
  /** When the review capability stops working. Null on the normal desk. */
  expiresAt: string | null;
}

const DEFAULT: DeskMode = { apiBase: '/api', readOnly: false, expiresAt: null };

const DeskModeContext = createContext<DeskMode>(DEFAULT);

export function DeskModeProvider({
  mode,
  children,
}: {
  mode: DeskMode;
  children: ReactNode;
}) {
  // Memoised on the three primitives rather than on the object, so a server
  // component re-render with an equivalent literal does not remount the desk.
  const value = useMemo(
    () => ({ apiBase: mode.apiBase, readOnly: mode.readOnly, expiresAt: mode.expiresAt }),
    [mode.apiBase, mode.readOnly, mode.expiresAt],
  );

  return <DeskModeContext.Provider value={value}>{children}</DeskModeContext.Provider>;
}

export function useDeskMode(): DeskMode {
  return useContext(DeskModeContext);
}
