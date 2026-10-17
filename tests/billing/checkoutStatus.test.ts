import type Stripe from 'stripe';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { inviteEmail } from '@/lib/auth/store';
import { checkoutStatus } from '@/lib/billing/checkoutStatus';
import { pruneTrialRefusals, recordTrial, recordTrialRefusal, trialRefusalFor } from '@/lib/billing/store';

import { MON_10_ET, cleanupStores, temporaryStore, verifiedUser } from './helpers';

afterEach(cleanupStores);

function stripeReturning(session: Record<string, unknown> | Error) {
  return {
    checkout: {
      sessions: {
        retrieve: vi.fn(async () => {
          if (session instanceof Error) throw session;
          return session;
        }),
      },
    },
  } as unknown as Pick<Stripe, 'checkout'>;
}

function session(userId: number, extra: Record<string, unknown> = {}) {
  return {
    id: 'cs_1',
    status: 'complete',
    client_reference_id: String(userId),
    setup_intent: 'seti_1',
    metadata: { app: 'mointel', purchase: 'daily' },
    ...extra,
  };
}

describe('refused-trial records', () => {
  it('are deleted 30 days after the refusal, and not before', () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const refusedAt = new Date('2026-10-17T12:00:00Z');
    recordTrialRefusal(db, 'seti_old', userId, 'card_used', refusedAt);
    recordTrialRefusal(db, 'seti_new', userId, 'account_used', new Date('2026-11-10T12:00:00Z'));

    // 29 days 23 h later: still kept.
    expect(pruneTrialRefusals(db, new Date('2026-11-16T11:00:00Z'))).toBe(0);
    expect(trialRefusalFor(db, 'seti_old')).toBe('card_used');

    // Just past 30 days: the old one goes, the newer one stays.
    expect(pruneTrialRefusals(db, new Date('2026-11-16T12:00:01Z'))).toBe(1);
    expect(trialRefusalFor(db, 'seti_old')).toBeNull();
    expect(trialRefusalFor(db, 'seti_new')).toBe('account_used');
  });

  it('pruning never touches the trial card codes in billing_trials', () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    recordTrial(db, userId, 'fp_kept', 'seti_t', new Date('2026-01-01T00:00:00Z'));
    pruneTrialRefusals(db, new Date('2027-01-01T00:00:00Z'));
    expect(db.prepare('SELECT card_fingerprint AS fp FROM billing_trials').get()).toEqual({ fp: 'fp_kept' });
  });
});

describe('checkoutStatus: what the page after Stripe shows', () => {
  it('paid, webhook not landed yet: recording (the "Reload" case); then complete once invited', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = stripeReturning(session(userId));
    expect(await checkoutStatus({ db, stripe }, userId, 'cs_1')).toEqual({ state: 'recording', purchase: 'daily' });
    inviteEmail(db, 'buyer@example.com', 'stripe', MON_10_ET);
    expect(await checkoutStatus({ db, stripe }, userId, 'cs_1')).toEqual({ state: 'complete', purchase: 'daily' });
  });

  it("refuses another person's session, another business's, and an unknown id", async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    expect(await checkoutStatus({ db, stripe: stripeReturning(session(999)) }, userId, 'cs_1')).toEqual({ state: 'not_yours' });
    expect(
      await checkoutStatus({ db, stripe: stripeReturning(session(userId, { metadata: { app: 'meo' } })) }, userId, 'cs_1'),
    ).toEqual({ state: 'not_yours' });
    expect(await checkoutStatus({ db, stripe: stripeReturning(new Error('no such session')) }, userId, 'cs_x')).toEqual({
      state: 'not_yours',
    });
  });

  it('open and expired sessions say so', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    expect(await checkoutStatus({ db, stripe: stripeReturning(session(userId, { status: 'open' })) }, userId, 'cs_1')).toEqual({
      state: 'open',
      purchase: 'daily',
    });
    expect(await checkoutStatus({ db, stripe: stripeReturning(session(userId, { status: 'expired' })) }, userId, 'cs_1')).toEqual({
      state: 'expired',
      purchase: 'daily',
    });
  });

  it('a trial: recording, then complete when started; or refused with the reason', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const trial = session(userId, { metadata: { app: 'mointel', purchase: 'trial' } });
    const stripe = stripeReturning(trial);
    expect(await checkoutStatus({ db, stripe }, userId, 'cs_1')).toEqual({ state: 'recording', purchase: 'trial' });

    recordTrialRefusal(db, 'seti_1', userId, 'card_used', MON_10_ET);
    expect(await checkoutStatus({ db, stripe }, userId, 'cs_1')).toEqual({ state: 'trial_refused', reason: 'card_used' });

    const other = verifiedUser(db, 'other@example.com', 'sub-o');
    recordTrial(db, other, 'fp_new', 'seti_2', MON_10_ET);
    inviteEmail(db, 'other@example.com', 'stripe-trial', MON_10_ET);
    const started = stripeReturning(session(other, { setup_intent: 'seti_2', metadata: { app: 'mointel', purchase: 'trial' } }));
    expect(await checkoutStatus({ db, stripe: started }, other, 'cs_2')).toEqual({ state: 'complete', purchase: 'trial' });
  });
});
