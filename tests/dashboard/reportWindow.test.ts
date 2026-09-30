/**
 * The session report opens in a larger window. His ruling, 2026-09-29T23:51:49Z
 * (Research's session, read at his turn): "it needs to open up a larger window
 * like when you click on a specific ticker." The side panel beside the board is
 * gone; the briefing line stays as the link.
 *
 * Source-asserted, comments stripped: these are layout and wiring facts, and
 * the behaviour they produce (a ticker opened from the report stacks above it;
 * Escape closes the ticker first, then the report; focus returns to Read) was
 * exercised in a browser against a fixture, 2026-09-29.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const reports = source('components/SessionReports.tsx');
const drawer = source('components/TickerDrawer.tsx');
const shell = source('components/DashboardShell.tsx');
const hook = source('lib/hooks/useModalFocus.ts');

const zOf = (src: string, marker: string) => {
  const at = src.indexOf(marker);
  const open = src.lastIndexOf('className="', at);
  return Number(/\bz-(\d+)\b/.exec(src.slice(open, at))?.[1] ?? NaN);
};
const maxW = (src: string) =>
  Math.max(...[...src.matchAll(/role="dialog"[\s\S]*?max-w-\[(\d+)px\]/g)].map((m) => Number(m[1])));

describe('the report window', () => {
  it('is a modal window over a dimmed board, the ticker pattern', () => {
    expect(reports).toContain('role="dialog"');
    expect(reports).toContain('aria-modal="true"');
    expect(reports).toMatch(/fixed inset-0 z-\d+[^"]*" data-report-panel/);
    expect(reports).toContain('bg-black/60');
  });

  it('is wider than the ticker window, which is the point of his ruling', () => {
    expect(maxW(reports)).toBeGreaterThan(maxW(drawer));
  });

  it('stacks BELOW the ticker window, so a ticker opened from it lands on top', () => {
    const reportZ = zOf(reports, 'data-report-panel');
    const tickerZ = Number(/fixed inset-0 z-(\d+)/.exec(drawer)?.[1] ?? NaN);
    expect(reportZ).toBeLessThan(tickerZ);
  });

  it('holds the prose to a reading measure', () => {
    expect(reports).toMatch(/mx-auto w-full max-w-\[\d+px\]/);
  });

  it('prints as a page, not as a fixed overlay', () => {
    expect(reports).toMatch(/fixed inset-0[^"]*print:static/);
  });
});

describe('two windows, one keyboard', () => {
  it('gives up Escape and Tab while a ticker covers it', () => {
    // The key listener is gated on `covered`; the focus capture is not.
    expect(hook).toMatch(/if \(!open \|\| covered\) return;/);
    expect(hook).toMatch(/\}, \[open, covered, panel, heading, onClose\]\);/);
  });

  it('is told when a ticker is open above it', () => {
    expect(shell).toMatch(/covered=\{selectedTicker !== null\}/);
  });

  it('closes before a checkpoint opens, so the change is not hidden behind it', () => {
    expect(shell).toMatch(/onOpenCheckpoint=\{\(id\) => \{\s*closeReport\(\);\s*setSelectedAssessment\(id\);/);
  });
});
