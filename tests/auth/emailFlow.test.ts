import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { completeEmailSignIn, confirmUrl, showConfirm, startEmailSignIn } from '@/lib/auth/emailFlow';
import { hashIp } from '@/lib/auth/emailLink';
import { EMAIL_LINK_WORDS } from '@/lib/auth/emailLinkWords';
import { inviteEmail, linkIdentity, openIdentityStore, resolveSession } from '@/lib/auth/store';
import type { OutgoingEmail, SendResult } from '@/lib/email/ses';

const temporaryDirs: string[] = [];
function temporaryStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-emailflow-'));
  temporaryDirs.push(dir);
  return openIdentityStore(path.join(dir, 'identity.db'));
}
afterEach(() => {
  while (temporaryDirs.length) {
    const dir = temporaryDirs.pop();
    try {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

const NOW = new Date('2026-10-17T12:00:00Z');
const ORIGIN = 'https://tmitrader.com';

function outbox(result: SendResult = { ok: true, messageId: 'm' }) {
  const sent: OutgoingEmail[] = [];
  return { sent, send: async (email: OutgoingEmail) => (sent.push(email), result) };
}

function tokenFrom(email: OutgoingEmail): string {
  const match = /\/auth\/email\/confirm\?t=([A-Za-z0-9_-]+)/.exec(email.text);
  if (!match) throw new Error('no link in the email');
  return decodeURIComponent(match[1]);
}

async function start(db: ReturnType<typeof temporaryStore>, rawEmail: string, box = outbox(), ip = '203.0.113.7') {
  const result = await startEmailSignIn({ db, rawEmail, ipHash: hashIp(ip, 'k'), origin: ORIGIN, send: box.send, now: NOW, log: () => {} });
  return { result, box };
}

describe('email flow: requesting a link', () => {
  it('sends the link from signin@ with Reply-To desk@, pointing at the deployment origin', async () => {
    const db = temporaryStore();
    const { result, box } = await start(db, 'Someone@Example.com');
    expect(result.status).toBe(200);
    expect(box.sent).toHaveLength(1);
    expect(box.sent[0]).toMatchObject({ from: 'signin@tmitrader.com', to: 'someone@example.com', replyTo: 'desk@tmitrader.com' });
    expect(box.sent[0].text).toContain(`${ORIGIN}/auth/email/confirm?t=`);
  });

  it('gives a known address and an unknown address byte-identical pages', async () => {
    const db = temporaryStore();
    inviteEmail(db, 'known@example.com');
    linkIdentity(db, { provider: 'google', subject: 'g1', email: 'known@example.com', emailVerified: true });
    const known = (await start(db, 'known@example.com')).result;
    const unknown = (await start(db, 'nobody@example.com', outbox(), '198.51.100.2')).result;
    expect(unknown.status).toBe(known.status);
    expect(unknown.html).toBe(known.html);
  });

  it('gives the same send-failed page for any address, and logs only the reason', async () => {
    const db = temporaryStore();
    const lines: string[] = [];
    const failing = outbox({ ok: false, reason: 'ses answered 500' });
    const a = await startEmailSignIn({ db, rawEmail: 'a@example.com', ipHash: hashIp('1.1.1.1', 'k'), origin: ORIGIN, send: failing.send, now: NOW, log: (l) => lines.push(l) });
    const b = await startEmailSignIn({ db, rawEmail: 'b@example.com', ipHash: hashIp('1.1.1.2', 'k'), origin: ORIGIN, send: failing.send, now: NOW, log: () => {} });
    expect(a.status).toBe(503);
    expect(a.html).toBe(b.html);
    expect(a.html).toContain('We couldn’t send the email');
    expect(lines).toEqual(['[auth/email] send failed: ses answered 500']);
  });

  it('refuses something that is not an address without sending', async () => {
    const db = temporaryStore();
    const { result, box } = await start(db, 'not an address');
    expect(result.status).toBe(400);
    expect(box.sent).toHaveLength(0);
  });

  it('shows the settled rate-limit line with the wait in minutes', async () => {
    const db = temporaryStore();
    for (let i = 0; i < 3; i += 1) await start(db, 'a@example.com');
    const { result, box } = await start(db, 'a@example.com');
    expect(result.status).toBe(429);
    expect(box.sent).toHaveLength(0);
    expect(result.html).toContain('There have been too many link requests. You can ask again in 15 minutes.');
  });

  it('builds the confirm URL without a doubled slash', () => {
    expect(confirmUrl('https://tmitrader.com/', 'abc')).toBe('https://tmitrader.com/auth/email/confirm?t=abc');
  });
});

describe('email flow: the confirm page and the button', () => {
  it('GET shows one button and the terms line, and does not use the link', async () => {
    const db = temporaryStore();
    const { box } = await start(db, 'a@example.com');
    const token = tokenFrom(box.sent[0]);
    const first = showConfirm({ db, token, now: NOW });
    const second = showConfirm({ db, token, now: NOW });
    expect(first.status).toBe(200);
    expect(first.html).toContain('<form method="post" action="/auth/email/confirm">');
    expect(first.html).toContain('<a href="/terms">terms</a>');
    expect(first.html).toContain('<a href="/privacy">privacy policy</a>');
    expect(second.status).toBe(200);
    expect(completeEmailSignIn({ db, token, now: NOW, secure: true }).status).toBe(303);
  });

  it('POST signs in once: a session cookie and /desk, then the link is spent', async () => {
    const db = temporaryStore();
    const { box } = await start(db, 'a@example.com');
    const token = tokenFrom(box.sent[0]);
    const done = completeEmailSignIn({ db, token, now: NOW, secure: true });
    expect(done.status).toBe(303);
    expect(done.location).toBe('/desk');
    expect(done.setCookies).toHaveLength(1);
    const cookie = done.setCookies[0];
    expect(cookie.startsWith(`${SESSION_COOKIE}=`)).toBe(true);
    const sessionId = cookie.slice(SESSION_COOKIE.length + 1).split(';')[0];
    expect(resolveSession(db, sessionId, NOW)).not.toBeNull();

    const again = completeEmailSignIn({ db, token, now: NOW, secure: true });
    expect(again.status).toBe(400);
    expect(again.setCookies).toHaveLength(0);
  });

  it('says "use the newest link" for a replaced link', async () => {
    const db = temporaryStore();
    const first = await start(db, 'a@example.com');
    await start(db, 'a@example.com');
    const result = showConfirm({ db, token: tokenFrom(first.box.sent[0]), now: NOW });
    expect(result.status).toBe(400);
    expect(result.html).toContain('A newer link was sent to this address.');
  });

  it('escapes the token in the form', () => {
    const db = temporaryStore();
    const result = showConfirm({ db, token: '"><script>x</script>', now: NOW });
    expect(result.html).not.toContain('<script>x');
  });

  it('carries no em dash in any word', () => {
    expect(JSON.stringify(EMAIL_LINK_WORDS)).not.toContain(String.fromCharCode(0x2014));
  });
});
