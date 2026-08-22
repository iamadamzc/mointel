/**
 * Why a model provider refused, in a form that is safe to store.
 *
 * The failure paths deliberately recorded only `HTTP 429`, because a provider's
 * error body can quote the request back and the request carries evidence. That
 * was the right instinct and the wrong outcome: on 19 August the desk logged 47
 * identical `HTTP 429`s that read exactly like SEC throttling, and the actual
 * cause — an exhausted OpenAI balance — was invisible until someone probed the
 * API by hand. A rate limit and an empty account need opposite responses, and
 * one of them is not fixed by waiting.
 *
 * So the code and type are kept and nothing else. Both are enum-like values
 * chosen by the provider from a fixed vocabulary; neither can carry a prompt.
 * They are additionally length-capped and character-filtered, because "it
 * should be an enum" is not the same as "it is".
 */

/** Codes that mean money rather than pace. Worth naming: the response differs. */
export const BILLING_ERROR_CODES = new Set([
  'insufficient_quota',
  'credit_balance_exhausted',
  'billing_hard_limit_reached',
  'account_deactivated',
]);

const SAFE = /^[a-z0-9_.-]{1,64}$/i;

function safeToken(value: unknown): string | null {
  return typeof value === 'string' && SAFE.test(value) ? value : null;
}

export interface ProviderFailure {
  status: number;
  code: string | null;
  type: string | null;
  /** True when the provider said this is a balance or quota problem. */
  billing: boolean;
}

/**
 * Reads a failed provider response without letting its body escape.
 *
 * Consumes the body, so call it once and only on a non-ok response.
 */
export async function readProviderFailure(response: Response): Promise<ProviderFailure> {
  const failure: ProviderFailure = {
    status: response.status,
    code: null,
    type: null,
    billing: false,
  };

  try {
    const body = (await response.json()) as { error?: { code?: unknown; type?: unknown } };
    failure.code = safeToken(body?.error?.code);
    failure.type = safeToken(body?.error?.type);
  } catch {
    // A body that is not JSON tells us nothing we are willing to quote.
  }

  failure.billing =
    (failure.code !== null && BILLING_ERROR_CODES.has(failure.code)) ||
    failure.type === 'insufficient_quota';

  return failure;
}

/**
 * A one-line description safe for logs, job errors and diagnostics.
 *
 * `HTTP 429 (insufficient_quota)` and a bare `HTTP 429` are the same length of
 * effort to produce and a completely different morning.
 */
export function describeFailure(failure: ProviderFailure): string {
  const detail = failure.code ?? failure.type;
  return detail ? `HTTP ${failure.status} (${detail})` : `HTTP ${failure.status}`;
}

/**
 * Recognises a billing failure from an error string this module produced.
 *
 * The retry policy runs from `research_retry_state.last_error`, which is what
 * survives a worker restart — the `ProviderFailure` itself is long gone by
 * then. Reading the marker back out of the recorded line keeps one vocabulary
 * (`BILLING_ERROR_CODES`) in one place, rather than adding a column that says
 * again what the line already says.
 *
 * This reads a string THIS module wrote, in a format it controls, over a fixed
 * and character-filtered vocabulary. It is not parsing a provider's prose.
 */
export function isBillingError(message: string | null | undefined): boolean {
  if (!message) return false;
  for (const code of BILLING_ERROR_CODES) {
    if (message.includes(code)) return true;
  }
  return false;
}
