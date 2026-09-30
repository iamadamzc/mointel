import type { Metadata } from 'next';

import { LegalPage } from '@/components/LegalPage';
import { loadLegalDocument } from '@/lib/legal/document';

// Read on every request, exactly as /privacy is. See lib/legal/document.ts.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Terms of service | The Momentum Intelligence Trading Desk',
  description: 'The terms under which The Momentum Intelligence Trading Desk is offered.',
};

export default function TermsPage() {
  return <LegalPage document={loadLegalDocument('terms')} />;
}
