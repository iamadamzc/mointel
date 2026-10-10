/**
 * The sorted `Now` head on one line plus its lag (Design's found defect, 2026-09-29; Integration 36th: in
 * this weekend if under an hour). The caret was appended after the head's children, and the lag line was a
 * block child, so the sorted head read NOW / -1m / caret on three lines and grew to 55 px. The lag is now
 * the header's `sub`, rendered after the caret.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('components/DiscoveryBoard.tsx', 'utf8').replace(/\r\n/g, '\n');
const th = source.slice(source.indexOf('function Th({'), source.indexOf('function DiscoveryRow('));

describe('the sorted Now head', () => {
  it('the header renders the caret before the sub-line, in the cell and in its measure', () => {
    const caret = th.indexOf('{sorted && !srOnly ? <span aria-hidden="true"> ▼</span> : null}');
    const sub = th.indexOf('{sub && !srOnly ? <span className={SUB_LINE_CLASS}>{sub}</span> : null}');
    expect(caret).toBeGreaterThan(-1);
    expect(sub).toBeGreaterThan(caret);
    const measureCaret = th.indexOf('<span> ▼</span>');
    const measureSub = th.indexOf('{sub ? <span className={SUB_LINE_CLASS}>{sub}</span> : null}');
    expect(measureSub).toBeGreaterThan(measureCaret);
  });

  it('the Now head passes its lag as sub, not as a block child', () => {
    const now = source.slice(source.indexOf('name={`${nowLabel}, ${nowCopy.sub}`}'));
    const head = now.slice(0, now.indexOf('</Th>'));
    expect(head).toContain('sub={nowCopy.sub}');
    expect(head).not.toContain('<span className="block');
  });
});
