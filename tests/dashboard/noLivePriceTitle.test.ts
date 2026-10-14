import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { NO_LIVE_PRICE_TITLE } from '@/lib/dashboard/feedBanner';

/*
 * The price-source tooltip for a name with no live price said "Google Sheet value. No live market data for this
 * ticker." on three surfaces after the Sheet left (A5 rest). One constant now, his approved words (Marketing
 * 5e896276, Commercial read 125).
 */
const SITES = ['components/DeskRead.tsx', 'components/FocusStrip.tsx', 'components/TickerDrawer.tsx'];
const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('the no-live-price tooltip', () => {
  it('is the approved sentence', () => {
    expect(NO_LIVE_PRICE_TITLE).toBe('No live market data for this ticker.');
  });

  it('every surface that showed the Sheet sentence uses the one constant and never names the Sheet', () => {
    for (const file of SITES) {
      const source = read(file);
      // Control: the file is the one that renders the price-source title.
      expect(source, file).toContain('priceSourceTitle(feedBanner)');
      expect(source, file).toContain(': NO_LIVE_PRICE_TITLE');
      expect(source, file).not.toContain('Google Sheet value');
    }
  });
});
