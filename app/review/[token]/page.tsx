import { DashboardShell } from '@/components/DashboardShell';
import { DeskModeProvider } from '@/lib/hooks/useDeskMode';
import { ReviewBanner } from '@/components/ReviewBanner';
import { ReviewRefusal } from '@/components/ReviewRefusal';
import { getDashboardState } from '@/lib/data';
import { expiryClock } from '@/lib/review/access';
import { verifyReviewToken } from '@/lib/review/tokens';

/**
 * The desk, as an outside reviewer sees it.
 *
 * This is the real dashboard — the same shell, the same components, the same
 * view models — pointed at a review-scoped API and told it may not write. It is
 * deliberately not a second rendering of the desk built for inspection: a
 * reviewer looking for stale data, contradictory session state or a broken
 * drawer has to be looking at the thing itself, or the whole exercise reports
 * on a copy nobody uses.
 */
export const dynamic = 'force-dynamic';

export default async function ReviewDashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const check = verifyReviewToken(token);

  if (!check.ok) return <ReviewRefusal reason={check.reason} />;

  const initialState = await getDashboardState();

  return (
    <DeskModeProvider
      mode={{
        apiBase: `/review/${token}/api`,
        readOnly: true,
        expiresAt: check.token.expiresAt,
      }}
    >
      <div className="flex h-screen flex-col overflow-hidden bg-desk">
        <ReviewBanner expiresAtClock={expiryClock(check.token.expiresAt)} />
        <div className="min-h-0 flex-1">
          <DashboardShell initialState={initialState} />
        </div>
      </div>
    </DeskModeProvider>
  );
}
