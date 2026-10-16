import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SnapshotTicker } from '@/components/AssessmentHistory';

/*
 * L19, his ask 2026-10-16T07:53:36.559Z: "i should be able to click on these tickers in the recap and see the deeper
 * detail." A recap snapshot's ticker opens the same dossier the board and the reports open.
 */

describe('a recap snapshot ticker', () => {
  it('is a button that opens that row ticker', () => {
    const opened: string[] = [];
    const html = renderToStaticMarkup(createElement(SnapshotTicker, { ticker: 'DRMA', onSelectTicker: (t: string) => opened.push(t) }));
    expect(html).toBe('<button type="button" class="text-[13px] font-bold text-ink hover:text-accent">DRMA</button>');
    // Call the rendered element's own click handler.
    const element = SnapshotTicker({ ticker: 'DRMA', onSelectTicker: (t: string) => opened.push(t) }) as ReactElement<{ onClick: () => void }>;
    element.props.onClick();
    expect(opened).toEqual(['DRMA']);
  });

  it('control: with no handler it stays plain text, as before L19', () => {
    expect(renderToStaticMarkup(createElement(SnapshotTicker, { ticker: 'DRMA' }))).toBe('<span class="text-[13px] font-bold text-ink">DRMA</span>');
  });

  it('adds no visible words: the button shows only the ticker', () => {
    const html = renderToStaticMarkup(createElement(SnapshotTicker, { ticker: 'XLAB', onSelectTicker: () => {} }));
    expect(html.replace(/<[^>]+>/g, '')).toBe('XLAB');
    expect(html).not.toMatch(/title=|aria-label=/);
  });

  it('the snapshot table uses it, and the shell passes the same handler the board and reports use', () => {
    const history = readFileSync(join(process.cwd(), 'components/AssessmentHistory.tsx'), 'utf8');
    expect(history).toContain('<SnapshotTicker ticker={row.ticker} onSelectTicker={onSelectTicker} />');
    const shell = readFileSync(join(process.cwd(), 'components/DashboardShell.tsx'), 'utf8');
    expect(shell).toContain('<AssessmentSnapshotBoard key={selectedAssessment} id={selectedAssessment} onSelectTicker={setSelectedTicker} />');
    // Control: the report window and the other surfaces open tickers through the same setter (two before L19).
    expect(shell.match(/onSelectTicker=\{setSelectedTicker\}/g)?.length).toBe(3);
  });

  it('the open ticker is requested from the market feed, so a name off the board (DRMA under $1) still opens', () => {
    const shell = readFileSync(join(process.cwd(), 'components/DashboardShell.tsx'), 'utf8').replace(/\r\n/g, '\n');
    const start = shell.indexOf('const sheetSymbols = useMemo(');
    const block = shell.slice(start, shell.indexOf('const market = useMarket(sheetSymbols', start));
    expect(block).toContain('...(selectedTicker ? [selectedTicker] : [])');
    expect(block).toContain('[data, focus.tickers, selectedTicker]');
    // Control: the market hook reads this list.
    expect(shell).toContain('const market = useMarket(sheetSymbols, boardRange);');
  });
});
