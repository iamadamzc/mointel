import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TickerCell } from '@/components/DecisionCells';
import { SetupGradeBadge } from '@/components/SetupGradeBadge';
import type { SetupGrade } from '@/lib/dashboard/setupGrade';

const GRADE: SetupGrade = {
  grade: 'AVOID',
  basis: { structure: 'LIMITED', catalyst: 'STRONG', volume: 'STRONG', liquidity: 'RISK', supply: 'UNKNOWN' },
  rule: 'rubric-2026-10-05',
  checkpointCompletedAt: '2026-10-05T19:42:00.000Z',
};

const html = (grade: SetupGrade | null | undefined) => renderToStaticMarkup(createElement(SetupGradeBadge, { grade }));

describe('SetupGradeBadge, server-rendered', () => {
  it('prints D for stored AVOID, with an accessible name and a button, and no stored word', () => {
    const out = html(GRADE);
    expect(out).toContain('aria-label="Setup grade D"');
    expect(out).toContain('<button');
    expect(out).toContain('>D<');
    expect(out).not.toMatch(/avoid/i);
  });

  it('carries only the trigger on the server: the tooltip is built when it opens', () => {
    expect(html(GRADE)).not.toContain('Risk outweighs the setup');
    expect(html(GRADE)).not.toContain('role="dialog"');
  });

  it('reads Not graded for UNKNOWN and a dash for NOT_YET and for no grade', () => {
    expect(html({ ...GRADE, grade: 'UNKNOWN' })).toContain('>Not graded<');
    for (const none of [{ ...GRADE, grade: 'NOT_YET' as const }, null, undefined]) {
      const out = html(none);
      expect(out).toContain('No setup grade');
      expect(out).not.toContain('Not graded');
    }
  });
});

describe('TickerCell and the badge', () => {
  const cell = (setupGrade: SetupGrade | null | undefined) =>
    renderToStaticMarkup(
      createElement(TickerCell, { ticker: 'MGLD', focused: false, onToggleFocus: () => {}, setupGrade }),
    );

  it('shows the badge after the ticker when the board passes a grade, or null for the dash', () => {
    expect(cell(GRADE)).toMatch(/MGLD<\/span><button[^>]*aria-label="Setup grade D"/);
    expect(cell(null)).toContain('No setup grade');
  });

  it('shows no badge at all when the caller does not pass the prop (the Sheet table, until it is removed)', () => {
    expect(cell(undefined)).not.toContain('setup grade');
  });

  it('the first row wraps rather than overflows, and the retained label has its own line', () => {
    const out = renderToStaticMarkup(
      createElement(TickerCell, { ticker: 'PFSA', focused: false, onToggleFocus: () => {}, retention: 'retained > $20', setupGrade: GRADE }),
    );
    expect(out).toContain('flex-wrap');
    expect(out).toMatch(/<\/span><span class="text-\[9px\][^"]*">retained &gt; \$20<\/span><\/span>$/);
  });
});
