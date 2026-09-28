import type { OriginatingWire } from './types';

/**
 * Recovers the originating wire from an intermediary's copy of a release.
 *
 * Reprints carry the wire in the byline or in the dateline at the head of the
 * body — `SAN DIEGO, Sept. 25, 2026 (GLOBE NEWSWIRE) --`. Only the head is read:
 * a body may mention another wire further down ("previously announced via PR
 * Newswire"), and that is not where this copy came from.
 */
const WIRE_PATTERNS: ReadonlyArray<[OriginatingWire, RegExp]> = [
  ['GLOBENEWSWIRE', /globe\s*newswire/i],
  ['PR_NEWSWIRE', /\bpr\s*newswire\b/i],
  ['BUSINESS_WIRE', /\bbusiness\s*wire\b/i],
  ['ACCESS_NEWSWIRE', /\baccess\s*newswire\b|\baccesswire\b/i],
  ['NEWSFILE', /\bnewsfile\b/i],
];

/** How much of the body counts as its head. A dateline sits well inside this. */
export const WIRE_HEAD_CHARS = 400;

function earliest(text: string): OriginatingWire | null {
  let best: { wire: OriginatingWire; at: number } | null = null;
  for (const [wire, pattern] of WIRE_PATTERNS) {
    const match = pattern.exec(text);
    if (match && (best === null || match.index < best.at)) best = { wire, at: match.index };
  }
  return best?.wire ?? null;
}

export function recoverOriginatingWire(input: {
  author: string | null;
  bodyText: string | null;
  summary: string | null;
}): OriginatingWire | null {
  if (input.author) {
    const fromAuthor = earliest(input.author);
    if (fromAuthor) return fromAuthor;
  }
  const head = (input.bodyText ?? input.summary ?? '').slice(0, WIRE_HEAD_CHARS);
  return head ? earliest(head) : null;
}
