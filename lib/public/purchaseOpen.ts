/**
 * THE ONE SWITCH for Web's purchase surface: /pricing, /checkout, /trial, /welcome,
 * /terms-of-sale, and the refusal screen's purchase words.
 *
 * Closed unless PURCHASE_PAGES is exactly "open". Closed, every purchase route answers
 * 404 and the refusal screen keeps the words it has today, so the build can ship before
 * his go without a stranger reaching any of it. His rule: nothing reachable or linked
 * from the live site until the in-desk billing page with one-step cancel exists and he
 * gives the go, and the legal text is adopted as one motion. Opening is Ops's change to
 * the box's env, made at that go; the code does not change.
 *
 * Read per request, never at import, so the env as the process sees it decides.
 */

export const PURCHASE_ENV = 'PURCHASE_PAGES';

export function purchaseOpen(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env[PURCHASE_ENV] === 'open';
}
