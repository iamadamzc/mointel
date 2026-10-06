import type { Metadata } from 'next';

import { ExplainerPage } from '@/components/ExplainerPage';
import { loadExplainer } from '@/lib/public/explainer';

// The file is read on every request: a change to
// docs/public/are-float-quotes-real.md is a change to this page, with no build
// in between. The board's float cell links here; the link and this page ship
// in ONE release, and not before Research's validation sample has run.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Are float quotes real? | The Momentum Intelligence Trading Desk',
  // The page's own first two sentences (approved text), not new copy.
  description:
    'Float is the number of shares actually available to trade. You will see a float number quoted for many stocks, and no SEC filing we know of requires a count of floating shares.',
};

export default function AreFloatQuotesRealPage() {
  return <ExplainerPage document={loadExplainer('are-float-quotes-real')} />;
}
