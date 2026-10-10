/**
 * Rank once, the client (Integration 37th with Research, 2026-10-10): a pending range is never shown as the
 * viewer's, the hold is bounded, and the control hides when Ops switches ranges off.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { MAX_PENDING_HOLDS, acceptPayload, isRangePending } from '@/lib/dashboard/rangePending';
import type { MarketSnapshot } from '@/lib/market/types';

const payload = (rangePending?: boolean) => ({ discovery: { rangePending } }) as unknown as MarketSnapshot;
const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

describe('a pending range payload', () => {
  it('is held back, so band rows never replace the board under the chosen range', () => {
    expect(acceptPayload(payload(true), 0)).toEqual({ accept: false, heldInARow: 1 });
  });

  it('is taken after the bound, so a cold list cannot freeze the board', () => {
    let held = 0;
    for (let i = 0; i < MAX_PENDING_HOLDS; i += 1) {
      const step = acceptPayload(payload(true), held);
      expect(step.accept).toBe(false);
      held = step.heldInARow;
    }
    expect(acceptPayload(payload(true), held)).toEqual({ accept: true, heldInARow: 0 });
  });

  it('a served payload is taken at once and resets the count; an older payload without the field is served', () => {
    expect(acceptPayload(payload(false), 3)).toEqual({ accept: true, heldInARow: 0 });
    expect(acceptPayload(payload(undefined), 3)).toEqual({ accept: true, heldInARow: 0 });
    expect(isRangePending(null)).toBe(false);
  });
});

describe('wired', () => {
  it('the market hook holds a pending payload back and reports it', () => {
    const hook = read('lib/hooks/useMarket.ts');
    expect(hook).toContain('const decision = acceptPayload(payload, heldRef.current);');
    expect(hook).toContain('if (!decision.accept) return;');
    expect(hook.indexOf('if (!decision.accept) return;')).toBeLessThan(hook.indexOf('setSnapshot(payload);'));
    expect(hook).toContain('return { snapshot, failure, loading, rangePending };');
  });

  it('the control hides on the kill switch and shows the chosen range with a mark while pending', () => {
    const board = read('components/DiscoveryBoard.tsx');
    expect(board).toContain("discovery.rangeEnabled !== false");
    expect(board).toContain('pending={rangePending && chosenRange ? chosenRange : null}');
    const control = read('components/PriceRangeControl.tsx');
    expect(control).toContain('const shown = pending ?? served;');
    expect(control).toContain('aria-busy={pending ? true : undefined}');
    expect(read('components/DashboardShell.tsx')).toContain('rangePending={market.rangePending}');
  });
});
