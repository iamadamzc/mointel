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
  // The page's own first two sentences, verbatim from the file (v25, his yes
  // 2026-10-07T00:58:05.615Z), not new copy. tests/web/explainerPage.test.ts
  // fails if the file's opening sentences and this string part.
  description:
    "Float is the number of a company's shares available for public trading. It is usually computed as shares outstanding less the shares held by insiders and other closely held or restricted shares.",
};

export default function AreFloatQuotesRealPage() {
  return <ExplainerPage document={loadExplainer('are-float-quotes-real')} />;
}
