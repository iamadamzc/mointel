import type { Metadata } from 'next';

import { LegalPage } from '@/components/LegalPage';
import { loadLegalDocument } from '@/lib/legal/document';

// The file is read on every request: a change to docs/legal/privacy-policy.md
// is a change to this page, with no build in between.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Privacy policy — The Momentum Intelligence Trading Desk',
  description: 'What The Momentum Intelligence Trading Desk learns about you, why it holds it, who else sees it, and how to make it delete it.',
};

export default function PrivacyPage() {
  return <LegalPage document={loadLegalDocument('privacy-policy')} />;
}
