import { cookies } from 'next/headers';
import { forbidden, redirect } from 'next/navigation';

import { DashboardShell } from '@/components/DashboardShell';
import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { admissionForSession, isOwnerAdmission } from '@/lib/auth/requestGate';
import { getDashboardState } from '@/lib/data';
import { DeskModeProvider } from '@/lib/hooks/useDeskMode';

// The desk always reflects the current sheet state, so nothing is prerendered
// at build time. Upstream read frequency is governed by the server cache.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  /*
   * THE GATE, before any desk data is read (step 4, wired 2026-10-03).
   * anonymous -> /signin, which is also how a person at the desk finds the
   *   Google button: nothing else on the desk links to it.
   * refused   -> forbidden(): a 403 rendering `app/forbidden.tsx`, the one
   *   NotAdmitted screen. Never a 200: a denial that rendered 200 has already
   *   happened on this desk once (README section 2).
   * unaccepted -> /enter, the entry gate (2026-10-05, Commercial 12b): no desk
   *   content before the current disclaimer is accepted.
   * A store that cannot open throws here and the page is a 500, never the board.
   */
  const admission = admissionForSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (admission.state === 'anonymous') redirect('/signin');
  if (admission.state === 'refused') forbidden();
  if (admission.state === 'unaccepted') redirect('/enter');

  // Server-rendered first paint; the client then polls /api/dashboard.
  const initialState = await getDashboardState();

  // Owner-only controls (retry research, his ruling 2026-10-05) are offered to
  // the owner alone. A boolean crosses to the client; the address never does.
  const canRetryResearch = isOwnerAdmission(admission);

  return (
    <DeskModeProvider mode={{ apiBase: '/api', readOnly: false, expiresAt: null, canRetryResearch }}>
      <DashboardShell initialState={initialState} />
    </DeskModeProvider>
  );
}
