/**
 * mointel-billing: the daily charge and the plan lapse, on a short loop.
 *
 * Its own unit, not mointel-web, because every deploy restarts web and a charge
 * must not share the fate of a deploy (Ops, daily-billing-infra item 3). The
 * sign-in writes PENDING rows; this charges them within one pass, so the band
 * appears within seconds of a decline.
 *
 * Refuses to start without STRIPE_SECRET_KEY, and refuses a live key unless
 * BILLING_LIVE_APPROVED=yes (lib/billing/stripeClient.ts). Logs counts and Stripe
 * object ids only: never a key, a card or an address.
 */

import { openIdentityStore } from '../lib/auth/store';
import { cachedTradingDays, tradingDayChecker } from '../lib/billing/calendar';
import { fillTrialEnds, runChargePass } from '../lib/billing/charge';
import { lapseExpiredPlans } from '../lib/billing/lapse';
import { reconcileClean, reconcileDailyCharges } from '../lib/billing/reconcile';
import { pruneTrialRefusals } from '../lib/billing/store';
import { stripeFromEnv } from '../lib/billing/stripeClient';
import { findAlpacaCredentials } from '../lib/market/credentials';
import { AlpacaRestClient } from '../lib/market/alpaca/rest';
import { loadWorkerEnv } from './env';
import { CALENDAR_DEADLINE_MS, withDeadline } from '../lib/auth/expiry';

const PASS_MS = Number(process.env.BILLING_PASS_MS ?? 15_000);

function log(line: string) {
  console.log(`${new Date().toISOString()} ${line}`);
}

async function main() {
  loadWorkerEnv();
  const stripe = stripeFromEnv();
  const db = openIdentityStore(process.env.IDENTITY_DB_PATH);
  const credentials = findAlpacaCredentials().credentials;
  if (!credentials) throw new Error('no Alpaca credentials: the trading calendar is required to charge');
  const alpaca = new AlpacaRestClient(credentials, { concurrency: 1, maxRetries: 2 });
  // A deadline on every calendar read: the client has none, and a hung read would
  // stall the charge pass that a signed-in buyer is waiting on. A timeout leaves
  // the row PENDING for the next pass, as any calendar failure does.
  const fetchMonth = (start: string, end: string) =>
    withDeadline(alpaca.getCalendar(start, end), CALENDAR_DEADLINE_MS, `calendar ${start}`);
  const isTradingDay = tradingDayChecker(fetchMonth);
  const loadCalendar = cachedTradingDays(fetchMonth);

  log(`[billing] started, pass every ${PASS_MS} ms`);
  // The reconcile read runs once per UTC day over the last three days, and logs
  // only counts and Stripe/desk ids (lib/billing/reconcile.ts).
  let reconciledOn = '';
  let stopping = false;
  process.on('SIGTERM', () => {
    stopping = true;
  });

  while (!stopping) {
    try {
      const summary = await runChargePass({ db, stripe, isTradingDay });
      if (summary.succeeded + summary.declined + summary.indeterminate + summary.notCharged > 0) {
        log(`[billing] pass ${JSON.stringify(summary)}`);
      }
      const trialEnds = await fillTrialEnds({ db, loadCalendar });
      if (trialEnds) log(`[billing] trial ends computed: ${trialEnds}`);
      const lapsed = await lapseExpiredPlans({ db, stripe, loadCalendar });
      if (lapsed.length) log(`[billing] lapsed to daily: ${lapsed.join(', ')}`);
      const todayUtc = new Date().toISOString().slice(0, 10);
      if (reconciledOn !== todayUtc) {
        const report = await reconcileDailyCharges({ db, stripe }, new Date(Date.now() - 3 * 24 * 3600 * 1000));
        reconciledOn = todayUtc;
        const pruned = pruneTrialRefusals(db);
        if (pruned) log(`[billing] refused-trial records deleted (30 days): ${pruned}`);
        log(
          reconcileClean(report)
            ? `[billing] reconcile clean: ${report.checkedIntents} intents, ${report.checkedRows} rows, ${report.refunded.length} refunded`
            : `[billing] RECONCILE MISMATCH ${JSON.stringify(report)}`,
        );
      }
    } catch (error) {
      log(`[billing] pass failed: ${(error as Error).name}: ${(error as Error).message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, PASS_MS));
  }
  db.close();
  log('[billing] stopped');
}

main().catch((error) => {
  log(`[billing] fatal: ${(error as Error).message}`);
  process.exit(1);
});
