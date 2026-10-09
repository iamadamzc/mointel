/**
 * The price selector's words as passed (Marketing 1950a73f / 644a67e0, Commercial read 60): P2's hover and the
 * second refusal are built from the control's own bounds with rangeLabel, never typed; the Discovery caption
 * ends "top N of M ranked".
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { rangeLabel } from '@/lib/dashboard/boardRange';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

describe('the price selector words', () => {
  it('P2: the hover names the bounds through rangeLabel', () => {
    expect(read('components/PriceRangeControl.tsx')).toContain(
      'title={`Choose the price range this board ranks in, within ${rangeLabel(bounds)}.`}',
    );
  });

  it('P2 and P5: no bound is typed as a literal', () => {
    // Code only: a doc comment may name an example amount.
    const code = (path: string) =>
      read(path)
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');
    for (const path of ['components/PriceRangeControl.tsx', 'lib/dashboard/boardRange.ts']) {
      expect(code(path)).not.toMatch(/\$0\.25|\$50\b/);
    }
    expect(read('lib/dashboard/boardRange.ts')).toContain('within ${rangeLabel(bounds)}.');
    expect(rangeLabel({ min: 0.25, max: 50 })).toBe('$0.25–$50');
  });

  it('P6: the caption ends "top N of M ranked"', () => {
    expect(read('components/DiscoveryBoard.tsx')).toContain(
      '· top ${Math.min(size, discovery.rankedCount)} of ${discovery.rankedCount.toLocaleString()} ranked`',
    );
  });
});
