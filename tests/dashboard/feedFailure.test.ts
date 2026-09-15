/**
 * A SIGNED-OUT SESSION IS NOT A NETWORK FAULT.
 *
 * Both polls threw on `!response.ok` and stored the message, so a `401` reached
 * the header as `Dashboard unavailable: API responded 401`. Reachable today with
 * Basic Auth alone, and reachable constantly once sessions expire on a clock.
 *
 * The two differ in what the stale numbers are worth: a transport blip ends and
 * the next poll replaces them; a refusal does not end, and no amount of waiting
 * at 07:40 will move a price he is about to trade against.
 */
import { describe, expect, it } from 'vitest';

import { classifyResponse, classifyThrown, feedFailureLine } from '@/lib/dashboard/feedFailure';

describe('classifying a response', () => {
  it('is silent on success', () => {
    expect(classifyResponse(200)).toBeNull();
    expect(classifyResponse(204)).toBeNull();
    expect(classifyResponse(299)).toBeNull();
  });

  it('calls a refusal a refusal', () => {
    expect(classifyResponse(401)).toEqual({ kind: 'UNAUTHORIZED' });
    expect(classifyResponse(403)).toEqual({ kind: 'UNAUTHORIZED' });
  });

  it('keeps a server fault as transport, because the next poll may work', () => {
    expect(classifyResponse(500)).toEqual({ kind: 'TRANSPORT', detail: 'API responded 500' });
    expect(classifyResponse(502)).toEqual({ kind: 'TRANSPORT', detail: 'API responded 502' });
    expect(classifyResponse(404)).toEqual({ kind: 'TRANSPORT', detail: 'API responded 404' });
  });

  it('carries NO detail on the refusal arm', () => {
    /*
     * `resolveSession` returns null for absent, expired and revoked alike,
     * because a caller that could tell them apart would eventually branch on the
     * difference. The client must not reintroduce downstream what the store
     * refused to emit -- so this arm has no status, no message, no cause.
     */
    const refusal = classifyResponse(401);
    expect(Object.keys(refusal ?? {})).toEqual(['kind']);
  });

  it('does not let 401 and 403 be told apart', () => {
    expect(classifyResponse(401)).toEqual(classifyResponse(403));
  });
});

describe('classifying a thrown failure', () => {
  it('is always transport, because a refusal arrives as a response', () => {
    expect(classifyThrown(new Error('Failed to fetch'))).toEqual({
      kind: 'TRANSPORT',
      detail: 'Failed to fetch',
    });
  });

  it('survives a non-Error throw', () => {
    expect(classifyThrown('boom')).toEqual({ kind: 'TRANSPORT', detail: 'boom' });
  });
});

describe('the line the reader sees', () => {
  it('says signed out, not unreachable', () => {
    const line = feedFailureLine({ kind: 'UNAUTHORIZED' }, 'The desk');
    expect(line.text.toLowerCase()).toContain('signed out');
    expect(line.text.toLowerCase()).not.toContain('unavailable');
    expect(line.text.toLowerCase()).not.toContain('unreachable');
  });

  it('never leaks the status code to the reader', () => {
    const line = feedFailureLine({ kind: 'UNAUTHORIZED' }, 'The desk');
    expect(line.text).not.toMatch(/40[13]/);
  });

  it('marks a refusal terminal, so nothing implies waiting will help', () => {
    expect(feedFailureLine({ kind: 'UNAUTHORIZED' }, 'The desk').terminal).toBe(true);
  });

  it('does not mark a transport fault terminal, because the next poll may work', () => {
    expect(
      feedFailureLine({ kind: 'TRANSPORT', detail: 'API responded 502' }, 'The desk').terminal,
    ).toBe(false);
  });

  it('keeps the detail on the transport arm, where it is diagnosable', () => {
    const line = feedFailureLine({ kind: 'TRANSPORT', detail: 'Failed to fetch' }, 'Research');
    expect(line.text).toContain('Failed to fetch');
    expect(line.text).toContain('Research');
  });
});

/* ------------------------------------------------------------------------- *
 * NEITHER POLL MAY HAND-ROLL THE CHECK
 * ------------------------------------------------------------------------- */

describe('both polls classify rather than throw', () => {
  it('neither hook folds a status into an Error message', async () => {
    /*
     * The defect was one line, identical in two files. A guard on one of them
     * would pass while the other still told him the feed was unreachable --
     * the same shape as the sort control and the column header disagreeing.
     */
    const fs = await import('node:fs');
    for (const file of ['lib/hooks/useMarket.ts', 'lib/hooks/useDashboard.ts']) {
      const src = fs
        .readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect(src, file).not.toMatch(/throw new Error\(`API responded/);
      expect(src, file).toContain('classifyResponse(response.status)');
      expect(src, file).toContain('classifyThrown(error)');
    }
  });
});
