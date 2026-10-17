import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LegalPage } from '@/components/LegalPage';
import { loadLegalDocument } from '@/lib/legal/document';
import { purchaseOpen } from '@/lib/public/purchaseOpen';

/**
 * /terms-of-sale renders docs/legal/terms-of-sale.md at request time, exactly as /terms
 * renders terms.md (lib/legal/document.ts). Commercial's text; the DRAFT banner shows
 * until he sets `adopted`.
 *
 * Behind the purchase switch: closed, a 404, so the draft is not served before his go
 * (the file's own header: it goes live only on his word, as one motion with the checkout
 * link and the pointer sentence in terms.md).
 */

export const dynamic = 'force-dynamic';

// The document's own title in the pattern /terms uses. No description: none is approved.
export const metadata: Metadata = {
  title: 'Terms of sale | The Momentum Intelligence Trading Desk',
};

export default function TermsOfSalePage() {
  if (!purchaseOpen()) notFound();
  return <LegalPage document={loadLegalDocument('terms-of-sale')} />;
}
