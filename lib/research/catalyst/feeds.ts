/**
 * RSS/Atom and release-index parsing.
 *
 * A company feed is the cheapest catalyst source that exists: one request, a
 * dated list of the issuer's own announcements, no model involved. When an
 * issuer publishes one, it should always be preferred over web discovery.
 *
 * Parsing is deliberately tolerant. Small-cap IR feeds are frequently
 * malformed — unescaped ampersands, missing closing tags, mixed RSS and Atom
 * conventions. A feed that parses badly should yield fewer items, never throw.
 */

import { decodeEntities, htmlToText } from '../sec/documents';
import { normaliseTimestamp, type NormalisedTime } from '../time';

export interface FeedItem {
  title: string;
  url: string | null;
  published: NormalisedTime;
  /** Short summary when the feed supplies one; never the full article. */
  summary: string | null;
}

function firstMatch(block: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function cleanText(raw: string | null): string | null {
  if (!raw) return null;
  const withoutCdata = raw.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
  const text = decodeEntities(withoutCdata.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0 ? text : null;
}

/**
 * Parses RSS 2.0 and Atom.
 *
 * Both are handled in one pass because IR feeds mix conventions freely — Atom
 * entries carrying RSS pubDate elements are common enough that treating the
 * formats separately loses items.
 */
export function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];

  for (const block of blocks) {
    const title = cleanText(
      firstMatch(block, [/<title[^>]*>([\s\S]*?)<\/title>/i]),
    );
    if (!title) continue;

    // Atom uses <link href="...">, RSS uses <link>...</link>.
    let url = firstMatch(block, [
      /<link[^>]*\brel=["']alternate["'][^>]*\bhref=["']([^"']+)["']/i,
      /<link[^>]*\bhref=["']([^"']+)["']/i,
      /<link[^>]*>([\s\S]*?)<\/link>/i,
      /<guid[^>]*>([\s\S]*?)<\/guid>/i,
    ]);
    if (url) url = decodeEntities(url.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '')).trim();
    if (url && !/^https?:\/\//i.test(url)) url = null;

    const rawDate = firstMatch(block, [
      /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i,
      /<published[^>]*>([\s\S]*?)<\/published>/i,
      /<updated[^>]*>([\s\S]*?)<\/updated>/i,
      /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i,
    ]);

    const summaryRaw = firstMatch(block, [
      /<description[^>]*>([\s\S]*?)<\/description>/i,
      /<summary[^>]*>([\s\S]*?)<\/summary>/i,
    ]);
    const summary = cleanText(summaryRaw);

    items.push({
      title,
      url,
      // Feed dates are genuine publication timestamps, so EXACT unless the feed
      // supplied only a calendar date.
      published: normaliseTimestamp(rawDate),
      summary: summary ? summary.slice(0, 600) : null,
    });
  }

  return items;
}

export function looksLikeFeed(body: string): boolean {
  const head = body.slice(0, 2000).toLowerCase();
  return head.includes('<rss') || head.includes('<feed') || head.includes('<rdf:rdf');
}

/** Anchor text that marks navigation rather than a release. */
const NAV_TEXT =
  /^(home|news|press|media|investors?|contact|about|more|read more|view all|next|previous|archive|rss|subscribe|sign up|privacy|terms)$/i;

/**
 * Anchor text that is chrome rather than an announcement.
 *
 * Accessibility skip-links, cookie notices and bare URLs used as link text all
 * pass a naive length check and would otherwise be stored as releases — which
 * is worse than storing nothing, because they look like evidence.
 */
const CHROME_TEXT =
  /^(skip to|jump to|back to|return to|download|share|print|email this|cookie|accept|manage preferences|view (the )?(pdf|chart|attachment))/i;

/** Link text that is itself a URL, common in attachment lists. */
const URL_TEXT = /^(https?:\/\/|www\.)/i;

/** A trailing corporate suffix means the text is a company name, not news. */
const COMPANY_NAME_TAIL = /\b(inc|corp|corporation|ltd|limited|plc|llc|holdings|group)\.?$/i;

function looksLikeHeadline(title: string): boolean {
  if (URL_TEXT.test(title)) return false;
  if (CHROME_TEXT.test(title)) return false;
  if (NAV_TEXT.test(title)) return false;
  // "Super League Enterprise, Inc." is the issuer's name in a header, not an
  // announcement. Storing it as a release both fabricates evidence and, because
  // each page render can differ, keeps the fingerprint moving and re-triggers
  // paid discovery.
  if (COMPANY_NAME_TAIL.test(title.trim())) return false;

  // A press-release headline is a sentence, not a label.
  return title.split(/\s+/).filter((word) => word.length > 1).length >= 5;
}

const DATE_NEAR_LINK =
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i;

/**
 * Extracts release entries from an HTML press-release index page.
 *
 * This is a bounded reader for a known issuer page, not a crawler: it parses
 * one page the registry already points at and returns the links it lists. It
 * cannot see JavaScript-rendered lists, and says so by returning nothing rather
 * than pretending the page was empty.
 */
export function parseReleaseIndex(html: string, baseUrl: string): FeedItem[] {
  const items: FeedItem[] = [];
  const seen = new Set<string>();

  const anchors = html.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi) ?? [];

  for (const anchor of anchors) {
    const hrefMatch = anchor.match(/href=["']([^"']+)["']/i);
    const href = hrefMatch?.[1];
    if (!href) continue;

    const title = cleanText(anchor.replace(/<a\b[^>]*>/i, '').replace(/<\/a>/i, ''));
    // Release headlines are sentences; navigation and chrome are not.
    if (!title || title.length < 25 || !looksLikeHeadline(title)) continue;

    let absolute: string;
    try {
      absolute = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    if (!/^https?:/i.test(absolute) || seen.has(absolute)) continue;
    seen.add(absolute);

    // Index pages usually print a date beside each headline. It is a calendar
    // date, not a timestamp, and is recorded as such.
    const index = html.indexOf(anchor);
    const nearby = html.slice(Math.max(0, index - 400), index + anchor.length + 400);
    const dateText = htmlToText(nearby).match(DATE_NEAR_LINK)?.[1] ?? null;

    items.push({
      title,
      url: absolute,
      published: dateText ? normaliseTimestamp(dateText, 'DATE_ONLY') : normaliseTimestamp(null),
      summary: null,
    });
  }

  return items;
}
