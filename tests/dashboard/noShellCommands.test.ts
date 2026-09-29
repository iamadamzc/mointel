/**
 * No shell command anywhere in the trader-facing UI -- §10 of the design audit,
 * which says it is automatable, and this is the automation.
 *
 * F-12 removed `npm run market:alpaca` from the Discovery board because a second
 * market worker silently displaces production's only SIP connection: the page
 * was telling the trader how to break the feed. Three copies survived the fix,
 * each reachable in exactly the moment a trader would act on it -- the market
 * light's tooltip when the feed is offline, the assessments light's tooltip
 * when the scheduler is, and the drawer for any name the feed is not tracking.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { projectSchedulerHealth } from '@/lib/desk/view';
import { projectMarketHealth } from '@/lib/market/health';
import type { MarketFeedHealth } from '@/lib/market/types';

const COMMAND = /\bnpm run\b|\bnpx\s|\bnode scripts\//;

describe('health tooltips state the condition, never a command', () => {
  it('the market light, offline with no recorded error', () => {
    const view = projectMarketHealth({
      health: {
        mode: 'OFFLINE',
        feed: 'sip',
        connectionState: 'DISCONNECTED',
        offline: true,
        lastError: null,
        lastMessageAt: null,
        heartbeatAt: null,
      } as unknown as MarketFeedHealth,
      sessionPhase: 'RTH',
      now: Date.parse('2026-09-29T14:00:00.000Z'),
      thresholds: { freshSeconds: 90, staleSeconds: 240, heartbeatStaleMs: 15_000 },
    });
    // The instrument: this is the branch that carried the command.
    expect(view.state).toBe('OFFLINE');
    expect(view.detail).not.toMatch(COMMAND);
    expect(view.detail).toMatch(/not connected/);
  });

  it('the assessments light, with no scheduler reporting', () => {
    const scheduler = projectSchedulerHealth({ health: null, now: 0 });
    expect(scheduler.state).toBe('OFFLINE');
    expect(scheduler.detail).not.toMatch(COMMAND);
    expect(scheduler.detail).toMatch(/checkpoints are not being taken/);
  });
});

describe('no UI source prints a command', () => {
  // Comments included, deliberately: a comment quoting the command is one
  // careless edit from rendering it, and the cost of rewording one is nothing.
  const sources = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sources(full);
      return /\.tsx$/.test(entry.name) ? [full] : [];
    });

  it('across components/ and app/', () => {
    const files = [...sources('components'), ...sources('app')];
    // The control: a scan that found no files would pass on nothing.
    expect(files.length).toBeGreaterThan(20);
    const offenders = files.filter((file) => COMMAND.test(fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
