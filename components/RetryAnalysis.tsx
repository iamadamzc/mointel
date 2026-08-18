'use client';

import { useState } from 'react';

import { useDeskMode } from '@/lib/hooks/useDeskMode';

/**
 * Manual override for the automatic retry ceiling.
 *
 * Shown only when a ticker has been left explicitly FAILED. The ceiling stops a
 * deterministic failure spending model calls all session; it is not a verdict
 * that the name can never be analysed, so there has to be a way to say "try it
 * again" after fixing whatever was wrong.
 *
 * It clears the block rather than queueing directly — reconciliation picks the
 * name up on its next pass, through the same path as everything else.
 */
export function RetryAnalysis({ ticker }: { ticker: string }) {
  const { apiBase, readOnly } = useDeskMode();
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function retry() {
    setState('working');
    setMessage(null);
    try {
      const response = await fetch(`${apiBase}/research/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setState('error');
        setMessage(payload.error ?? payload.message ?? 'Could not clear the failure.');
        return;
      }
      setState('done');
      setMessage(payload.message ?? 'Cleared.');
    } catch (error) {
      setState('error');
      setMessage((error as Error).message);
    }
  }

  // Retrying analysis spends model calls and queues real work. A reviewer is
  // here to observe the desk, not to make it do things.
  if (readOnly) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={retry}
        disabled={state === 'working' || state === 'done'}
        className="rounded-sm border border-accent/40 bg-accent/10 px-2 py-1 text-[10px] font-semibold tracking-wide text-accent uppercase transition-colors hover:border-accent hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === 'working' ? 'Clearing…' : state === 'done' ? 'Queued' : 'Retry analysis'}
      </button>

      {message ? (
        <span className={`text-[11px] ${state === 'error' ? 'text-neg' : 'text-ink-3'}`}>
          {message}
        </span>
      ) : null}
    </div>
  );
}
