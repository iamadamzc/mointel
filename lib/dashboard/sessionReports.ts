/**
 * The session reports, as the reading panel and the briefing line see them.
 *
 * Pure functions over the payload and the current instant. Every state here is
 * DERIVED from stored fields — scheduledFor, relevantUntil, publishedAt — never
 * read from a stored label, for the same reason the header phase is derived:
 * a stored word is whatever was true when it was written.
 *
 * Design: `docs/research/session-reports/design-seat.md`.
 */

import {
  reportKey,
  type MissedCause,
  type ReportCompany,
  type ReportKind,
  type ReportPath,
  type ReportRange,
  type ReportSlot,
  type SessionReport,
  type SessionReportsPayload,
} from '../desk/reports/contract';
import type { ReportTags } from '../desk/reports/tags';
import { NOTHING_LINE } from '../desk/reports/writer';
import { assessmentLabel } from '../desk/schedule';
import { formatEtDay, formatEtMinute, formatPrice } from '../format';
import { withoutCitations } from '../research/citations';

/**
 * What a section reads when it has no line: the checker struck every sentence
 * in it, or it arrived empty. Marketing's words (marketing.md, 8c76fe0).
 *
 * TRUE IN BOTH CASES, because it speaks about the REPORT, not about our
 * sources or the market. It is deliberately not the writer's NOTHING_LINE,
 * "Nothing in our sources for this section.": that is a checked claim about
 * the sources, and after a strike the sources DO hold the name whose sentence
 * failed, so printing it here would publish a false absence -- the one case a
 * hidden strike list gets wrong (design-seat.md, "WHAT MAKES HIDING IT SAFE").
 * The heading stays: the sections are a fixed shape, stated, never hidden.
 */
export const EMPTY_SECTION_LINE = 'No line for this section in this report.';

/**
 * The line's states. `late` is not a sixth member: it is a PUBLISHED report
 * carrying the qualifier, exactly as a late checkpoint is still a checkpoint.
 */
export type SlotState = 'DUE' | 'CHECKING' | 'PUBLISHED' | 'MISSED' | 'OVER';

export interface SlotView {
  slot: ReportSlot;
  state: SlotState;
  /** The newest checked report for this slot, or null. */
  report: SessionReport | null;
  /** Older reports for the same slot — a 07:00 update keeps the 22:00 original here. */
  superseded: SessionReport[];
  /** Only for MISSED, and only an observable cause. */
  missedReason: string | null;
}

export interface ReportTimeline {
  /** What the briefing line shows. Null only when there are no slots at all. */
  current: SlotView | null;
  /** Slots whose session is over, newest first. */
  earlier: SlotView[];
}

const TITLE: Record<ReportKind, string> = {
  PREMARKET: 'Premarket briefing',
  INTO_RTH: 'Into-the-open briefing',
  INTO_POWER_HOUR: 'Power-hour briefing',
  AFTER_HOURS: 'After-hours briefing',
  // The 8:30 pm report (his "b", 2026-10-07T02:33:24.356Z). Marketing 2e386dc7, Commercial 28.
  EVENING: 'Evening briefing',
};

export function reportTitle(kind: ReportKind): string {
  return TITLE[kind];
}

/** Where each report's watch list is headed. Marketing's words (marketing.md, 809e4c4). */
const WATCH_INTO: Record<ReportKind, string> = {
  PREMARKET: 'into the premarket',
  INTO_RTH: 'into the open',
  INTO_POWER_HOUR: 'into the last hour',
  AFTER_HOURS: 'into after-hours',
  // "next", not "tomorrow's": true on a Friday evening (Commercial 28).
  EVENING: 'into the next premarket',
};

/**
 * The report's opening sentence, his ruling: "we're watching N names into
 * premarket", N being the report's own list. Worded here from the payload's
 * count, so the words live where they are printed.
 *
 * N is the number of distinct names the report SHOWS -- counted after the
 * checker's strikes -- so the sentence can never disagree with the lines
 * under it. Zero is a quiet session, published as such and never as
 * "watching 0 names"; a report whose every name was struck does not publish
 * at all, so it never reaches this line. Anything that is not a whole,
 * non-negative count prints nothing rather than a guessed number.
 */
export function watchLine(kind: ReportKind, count: number): string | null {
  if (!Number.isInteger(count) || count < 0) return null;
  const into = WATCH_INTO[kind];
  if (count === 0) return `Nothing on watch ${into}.`;
  return `We're watching ${count} ${count === 1 ? 'name' : 'names'} ${into}.`;
}

/**
 * What leads a report: on the briefing line, and at the top of the window.
 *
 * A v5 report is one whose payload carries `watchCount` as a NUMBER. It is
 * computed after the strikes and cannot itself be struck, so it is on every v5
 * row, zero included, and it is the marker. Not `headline` null against
 * absent: those are one step of serialisation apart, and a v5 row that picked
 * up a null would read as "the checker struck it" (Design, 2026-09-30,
 * research design.md §8 question 2).
 *
 * v5 leads with the watch sentence and never reads `headline`, so the line
 * cannot go blank on a strike. v4 leads with its headline, null when struck.
 */
export function reportLead(report: Pick<SessionReport, 'kind' | 'headline' | 'watchCount'>): string | null {
  if (typeof report.watchCount === 'number') return watchLine(report.kind, report.watchCount);
  return report.headline;
}

/* --------------------------------------------------------------------- v6 */

/**
 * A v6 report carries the `narrative` KEY, null when struck or when the store
 * held nothing to say (`contract.ts`); v5 rows never carry it. Option B's
 * surface (`docs/Design/report-b-spec.md`) applies only to v6: a stored v5
 * report keeps (A)'s rendering, since its headings are model text and its
 * lines carry no tags.
 */
export function isV6(report: Pick<SessionReport, 'narrative'>): boolean {
  return report.narrative !== undefined;
}

/**
 * The float statement, once per report and never per name (`report-b-spec.md`): a verdict, never a
 * number. Commercial read 27 (a4fba766) added the first clause once the desk began computing an SEC
 * float bound elsewhere: it says why the report has none. Marketing confirmed it; Integration ruled.
 */
export const FLOAT_FOOTER = 'This report states no float, and the desk cannot independently verify a float for any name in it.';

/** A computed section's label, "LABEL · count" (names in it). The loose group's empty heading prints nothing. */
export function sectionLabel(heading: string, names: number): string | null {
  const label = heading.trim();
  if (label === '') return null;
  return `${label} · ${names}`;
}

/**
 * v6's opening block, "SUMMARY" (Design's option B, `docs/Design/report-b-spec.md`; his
 * "an opening with a general narrative of the session", 2026-10-01T01:44:16Z). WORDS:
 * Marketing 03a32b00, passed by Commercial (read 26, 19117fc3): the label and the line for a report with no narrative.
 *
 * THE NO-NARRATIVE LINE IS TRUE OF BOTH CAUSES. The payload's `narrative` is null when the checker
 * struck it AND when the store held nothing to say (`contract.ts`); the strike list lives in the
 * run's diagnostics, never in the payload, so the surface cannot tell the two apart and must not
 * word either one. It speaks about the report, as EMPTY_SECTION_LINE does, never about the market.
 */
export const OPENING_WORDS = {
  label: 'Summary',
  none: 'No summary in this report.',
} as const;

export type ReportOpening =
  /** A v6 report whose narrative survived its checker. */
  | { kind: 'NARRATIVE'; text: string }
  /** A v6 report with no narrative: the designed state, never a blank. */
  | { kind: 'NONE' }
  /** A v5 report (no `narrative` key): its `overall` line, where it has one, as before v6. */
  | { kind: 'V5_OVERALL'; text: string };

/**
 * Which opening a report shows. The marker for v6 is the `narrative` KEY: the pipeline writes it on
 * every v6 row, a string or null, and a stored payload is parsed as written (`api.ts` `parse`), so a
 * v5 row has no key at all. A v4 or v5 row without an `overall` line opens as it always has: with
 * nothing (null), because it never had a narrative to lose.
 */
export function reportOpening(report: Pick<SessionReport, 'narrative' | 'overall' | 'watchCount'>): ReportOpening | null {
  if (isV6(report)) {
    const text = typeof report.narrative === 'string' ? report.narrative.trim() : '';
    return text ? { kind: 'NARRATIVE', text } : { kind: 'NONE' };
  }
  if (typeof report.watchCount === 'number' && typeof report.overall === 'string' && report.overall.trim()) {
    return { kind: 'V5_OVERALL', text: report.overall };
  }
  return null;
}

/**
 * The recap's computed footnotes (v6 step 4), Marketing's words v5 at `65951e69` (Commercial's final
 * ruling), verbatim. ZEROS PRINT and NULL PRINTS AS UNKNOWN, so a report with no footnotes is one
 * from before step 4 or an intraday kind (the field is null or absent there), never "none left out".
 * A value that is not a whole, non-negative count is read as unknown, never as a guessed number.
 * Independent of the narrative's strike: they print under a struck narrative too.
 */
export function narrativeFootnoteLines(footnotes: SessionReport['narrativeFootnotes']): string[] {
  if (!footnotes || typeof footnotes !== 'object') return [];
  const count = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null);
  const noClose = count(footnotes.noClose);
  const split = count(footnotes.splitExcluded);
  return [
    noClose === null
      ? 'How many names had volume but no recorded regular-session close is unknown.'
      : noClose === 0
        ? 'No names had volume but no recorded regular-session close.'
        : noClose === 1
          ? '1 name had volume but no recorded regular-session close, so it is not in the move counts.'
          : `${noClose} names had volume but no recorded regular-session close, so they are not in the move counts.`,
    split === null
      ? 'How many rows were left out of the move counts and the named leaders by the split check is unknown.'
      : split === 0
        ? 'No rows were left out of the move counts and the named leaders by the split check.'
        : split === 1
          ? '1 row was left out of the move counts and the named leaders because the data suggested a stock split. The check can also leave out a real move of the same size.'
          : `${split} rows were left out of the move counts and the named leaders because the data suggested a stock split. The check can also leave out a real move of the same size.`,
  ];
}

/**
 * Whether a card prints its "Catalyst" grade. Only when there is a grade: the
 * board's Why cell holds the empty-cell glyph for a name with none (a column
 * needs a value in every row), but a card has no column, and "Catalyst" beside
 * that glyph reads as writing, which his no-em-dash rule forbids. The section
 * label already says why there is no grade (NOT RESEARCHED AT THIS CHECKPOINT, RESEARCH COULD NOT TELL), and
 * the board's marks (old, not the move) still print.
 */
export function cardShowsGrade(grade: string): boolean {
  const value = grade.trim();
  return value !== '' && value !== String.fromCharCode(0x2014);
}

/**
 * The company line: "{name}. {country}. {business}." with an absent part
 * dropped along with its full stop, never guessed (Marketing, d35e1bba). A
 * part that already ends a sentence ("Sangoma Technologies Corp.") takes no
 * second stop. Null when nothing is known.
 *
 * The business part is the interpreter's prose, which may carry a citation
 * token ("[Source 115982]"); it is removed here (`citations.ts`), so reports
 * already stored read clean without re-analysis. Done at DISPLAY, not in
 * `reportResearch`, which is part of the frozen checker's input.
 */
export function companyText(company: ReportCompany | null | undefined): string | null {
  if (!company) return null;
  const parts = [company.name, company.country, company.business]
    .map((part) => (typeof part === 'string' ? withoutCitations(part).trim() : ''))
    .filter((part) => part.length > 0)
    .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`));
  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * The price path, "$3.59 prior close → $6.01 high → $5.10 at 09:27 ET".
 *
 * EVERY POINT CARRIES ITS LABEL, and no label is relative to the moment of
 * reading. His complaint was "now 15% under what?"; a bare path asks the same
 * question three times. And a report is read after it is written, the
 * premarket one the next morning, so "today's close" and "now" would name the
 * wrong day and the wrong minute by then. The labels are Design's call
 * (research design.md §8 question 3), never his words: his example was bare.
 *
 * - The first point is the PRIOR CLOSE for both bases. Intraday it is the
 *   close before this session; on the premarket report it is the close of the
 *   day the report was written, which is the close before the session the
 *   report is FOR. Either way it is "prior" to the report's own session, so no
 *   date is needed and none can be stamped wrong.
 * - The after-hours arc says so: "AH high", "AH close" (the premarket report
 *   is built after the 20:00 close).
 * - The intraday last point is the price at the checkpoint the report was
 *   built from, labelled with that checkpoint's COMPLETED clock (the writer's
 *   own clock rule). The newest one, when a report read more than one.
 *
 * Null when the payload has no path (older rows, a point the store could not
 * state) or a basis this build does not know: no line, no placeholder.
 */
export function pathText(
  path: ReportPath | null | undefined,
  report: Pick<SessionReport, 'checkpoints'>,
): string | null {
  const view = pathView(path, report);
  if (!view) return null;
  return view.points.map((point) => `${point.price} ${point.label}`).join(' → ');
}

export interface PathPoint {
  /** "$3.59" */
  price: string;
  /** "prior close" / "high" / "at 09:27 ET"; the same words `pathText` prints. */
  label: string;
}

export interface PathView {
  /** Prior close, high, last: always three, in that order. */
  points: [PathPoint, PathPoint, PathPoint];
  /** Where the last point sits against the prior close. Colours the last point only. */
  direction: 'UP' | 'DOWN' | 'FLAT';
  /** "+85.5% vs prior close" */
  change: string;
  /** "18.9% under the high", or "at the high". */
  fromHigh: string;
}

/**
 * The path as three labelled points (row A, his pick "a now, then b"; the mock's
 * artboard "A"). The labels are `pathText`'s, so the card and the one-line form
 * can never disagree; see `pathText` for why no label is relative to the
 * moment of reading.
 *
 * The two figures beside it are COMPUTED from the three values printed, so they
 * cannot disagree with the points (his complaint: "now 15% under what?"). Both
 * are rounded to one decimal; a change that rounds to zero is "flat", never
 * "+0.0%". Null wherever `pathText` is null.
 */
export function pathView(
  path: ReportPath | null | undefined,
  report: Pick<SessionReport, 'checkpoints'>,
): PathView | null {
  if (!path) return null;
  const values = [path.from, path.high, path.now];
  if (!values.every((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)) return null;

  let highLabel: string;
  let lastLabel: string;
  if (path.fromBasis === 'TODAY_CLOSE') {
    highLabel = 'AH high';
    lastLabel = 'AH close';
  } else if (path.fromBasis === 'PRIOR_CLOSE') {
    const newest = report.checkpoints
      .map((checkpoint) => checkpoint.completedAt)
      .filter((at) => Number.isFinite(Date.parse(at)))
      .sort((a, b) => Date.parse(a) - Date.parse(b))
      .at(-1);
    const at = formatEtMinute(newest);
    highLabel = 'high';
    lastLabel = at ? `at ${at}` : 'at the checkpoint';
  } else {
    return null;
  }

  const money = (value: number) => `$${formatPrice(value)}`;
  const changePct = Math.round(((path.now - path.from) / path.from) * 1000) / 10;
  const underPct = Math.round(((path.high - path.now) / path.high) * 1000) / 10;
  const direction = changePct > 0 ? 'UP' : changePct < 0 ? 'DOWN' : 'FLAT';

  return {
    points: [
      { price: money(path.from), label: 'prior close' },
      { price: money(path.high), label: highLabel },
      { price: money(path.now), label: lastLabel },
    ],
    direction,
    change:
      direction === 'FLAT'
        ? 'flat vs prior close'
        : `${changePct > 0 ? '+' : '−'}${Math.abs(changePct).toFixed(1)}% vs prior close`,
    fromHigh: underPct > 0 ? `${underPct.toFixed(1)}% under the ${highLabel}` : `at the ${highLabel}`,
  };
}

/**
 * One block of the report body as row A prints it: a card per NAME, or a
 * sentence about no name.
 */
export type ReportBlock =
  | {
      kind: 'NAME';
      ticker: string;
      company: ReportCompany | null;
      path: ReportPath | null;
      /** The name's one feed state, the same answer the header counts (`feedByName`). */
      liveFeed: boolean | null;
      /** The name's sentences, in the writer's order. */
      texts: string[];
      /** v6: the board's own Why and Risk on the as-of research (`tags.ts`); null on v5 or when absent. */
      tags: ReportTags | null;
      /**
       * EVENING: the generated_at of a research version NEWER (by id) than the checkpoint's, when a line of
       * this name used one; null otherwise (contract.ts). Printed through `researchWrittenAgainNote`.
       */
      researchUpdatedAt: string | null;
    }
  | { kind: 'PROSE'; text: string };

/**
 * The report body with the model-written section HEADINGS HIDDEN.
 *
 * HIS RULING (Integration transcript 434df034, typed "b" 2026-10-01T02:24:33Z):
 * reports keep running and the display hides the section headings until
 * Research's v6 computes them from stored status and grade. The checker never
 * reads `section.heading`, and live names sat under false headings (GOW, stale
 * and dilutive, under "Fresh and material news"). So nothing here may stand in
 * for a heading: no group label, no inferred order.
 *
 * - One list in the writer's order, across sections.
 * - A CARD PER NAME (the mock): a name's later lines join its card at its
 *   first position, so its company line and path print once.
 * - An EMPTY section contributes nothing. Its neutral line would point at a
 *   heading the reader can no longer see.
 * - The writer's NOTHING_LINE is dropped too: whether "nothing in our sources
 *   for this section" is true is judged against that hidden, unchecked heading.
 * - Any other line with no ticker is a sentence in its place.
 *
 * Display only: the stored report, the writer and the checker are untouched.
 */
export function reportBlocks(report: Pick<SessionReport, 'sections'>): ReportBlock[] {
  const blocks: ReportBlock[] = [];
  const cards = new Map<string, Extract<ReportBlock, { kind: 'NAME' }>>();

  for (const section of report.sections) {
    for (const line of section.lines) {
      const text = line.text.trim();
      if (line.ticker === null) {
        if (text.length > 0 && text !== NOTHING_LINE) blocks.push({ kind: 'PROSE', text: line.text });
        continue;
      }
      let card = cards.get(line.ticker);
      if (!card) {
        card = { kind: 'NAME', ticker: line.ticker, company: null, path: null, liveFeed: null, texts: [], tags: null, researchUpdatedAt: null };
        cards.set(line.ticker, card);
        blocks.push(card);
      }
      if (text.length > 0) card.texts.push(line.text);
      card.company ??= line.company ?? null;
      card.path ??= line.path ?? null;
      card.tags ??= line.tags ?? null;
      card.researchUpdatedAt ??= typeof line.researchUpdatedAt === 'string' ? line.researchUpdatedAt : null;
    }
  }
  const feed = feedByName(report);
  for (const card of cards.values()) card.liveFeed = feed.get(card.ticker) ?? null;
  return blocks;
}

const etTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const etMonthDay = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });

/**
 * The EVENING card's note, Marketing 2e386dc7 passed by Commercial 28, verbatim: "Research written again
 * at {h:mm am/pm} ET, after this checkpoint.", and, when the reader's ET day is not the note's,
 * "Research written again {Oct 7}, {h:mm am/pm} ET, after this checkpoint." (a stored copy read the next
 * morning never shows a bare clock). Null when there is no newer version or the time does not parse.
 *
 * The PRINT CONDITION is Research's (a version newer BY ID than the checkpoint's, contract.ts), the form
 * Commercial 28a asked for. SETTLED (28a): `generated_at` is the END of interpretation,
 * so "written again at {time}" is true. Read at production 098b8005: `lib/research/interpret/pipeline.ts`
 * sets generatedAt at :383, after the awaited model calls (:245, :278, :340-348), and saves the version at
 * :501; `worker/research.ts` (:727) passes no `now`. Integration read it; Ops withdrew its "start" reading.
 *
 * Via Intl in the market zone, never offset arithmetic; ICU's narrow space before am/pm is normalised.
 */
export function researchWrittenAgainNote(iso: string | null | undefined, nowMs: number): string | null {
  const at = etStamp(iso, nowMs);
  if (!at) return null;
  return at.date
    ? `Research written again ${at.date}, ${at.time} ET, after this checkpoint.`
    : `Research written again at ${at.time} ET, after this checkpoint.`;
}

/**
 * An instant as the reports print it: "8:12 pm", with "Oct 7" beside it only when the reader's ET day is
 * not the instant's (the board's date rule; a stored copy read next morning never shows a bare clock).
 * Null when the time does not parse: the caller omits the clause.
 */
export function etStamp(iso: string | null | undefined, nowMs: number): { time: string; date: string | null } | null {
  if (typeof iso !== 'string') return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const time = etTime.format(at).replace(/\s+/g, ' ').replace(/\b(AM|PM)\b/, (m) => m.toLowerCase());
  const sameDay = formatEtDay(iso) === formatEtDay(new Date(nowMs).toISOString());
  return { time, date: sameDay ? null : etMonthDay.format(at) };
}

/** "10:02 pm" or "Oct 7, 10:02 pm": the stamp as one phrase. */
const stampText = (at: { time: string; date: string | null }) => (at.date ? `${at.date}, ${at.time}` : at.time);
/** "at 10:02 pm" or "Oct 7, 10:02 pm": "at" only before a bare clock. */
const atStamp = (at: { time: string; date: string | null }) => (at.date ? stampText(at) : `at ${at.time}`);

/**
 * The 10 pm edition's line (his "same report, just edited with new information"; Integration ruled it built,
 * placed under the title's time lines). Words: Marketing v2 at 98b22b36, passed by Commercial 30a. Every
 * string says what the REPORT did ("carried", "written for this edition"), never that the market, a name or a
 * filing did or did not change (Commercial 29: the carry test cannot see a filing the research has not read).
 * `changedTickers` includes a name new at 22:00, so nothing here says "again".
 *
 * Null when the payload carries no `revisionOf` (no 8:30 edition existed, or not a 10 pm edition) or an
 * edition's time does not parse. `namesOnReport` is the distinct names the report shows: when every one of
 * them is in `changedTickers`, the "others carry" clause is dropped.
 */
export function revisionLine(
  report: Pick<SessionReport, 'publishedAt' | 'revisionOf'>,
  namesOnReport: readonly string[],
  nowMs: number,
): string | null {
  const revision = report.revisionOf;
  if (!revision || typeof revision !== 'object') return null;
  const now = etStamp(report.publishedAt, nowMs);
  const before = etStamp(revision.publishedAt, nowMs);
  if (!now || !before) return null;
  const changed = changedSet(revision);
  const summary = revision.narrativeChanged === true;
  const others = namesOnReport.some((ticker) => !changed.has(ticker));
  if (changed.size === 0 && !summary) {
    return `Published again ${atStamp(now)} ET; every line and the summary are carried from the ${stampText(before)} edition.`;
  }
  const head = `Revised ${atStamp(now)} ET`;
  if (changed.size === 0) {
    return `${head}: the summary was written for this edition; every line is carried from the ${stampText(before)} edition.`;
  }
  const names = changed.size === 1 ? '1 name has' : `${changed.size} names have`;
  const carry = others ? ` and the others carry their ${stampText(before)} line` : '';
  return `${head}: ${names} a line written for this edition${carry}.${summary ? ' The summary was written for this edition.' : ''}`;
}

function changedSet(revision: { changedTickers?: unknown }): Set<string> {
  return new Set(Array.isArray(revision.changedTickers) ? revision.changedTickers.filter((t): t is string => typeof t === 'string') : []);
}

/** The card mark on a name whose line was written for the 10 pm edition (Marketing v2 section 3). */
export function cardRevisionMark(
  report: Pick<SessionReport, 'publishedAt' | 'revisionOf'>,
  ticker: string,
  nowMs: number,
): { label: string; title: string } | null {
  const revision = report.revisionOf;
  if (!revision || typeof revision !== 'object' || !changedSet(revision).has(ticker)) return null;
  const now = etStamp(report.publishedAt, nowMs);
  const before = etStamp(revision.publishedAt, nowMs);
  if (!now || !before) return null;
  return {
    label: 'Line written for this edition',
    title: `This line was written for the ${stampText(now)} ET edition, not carried from the ${stampText(before)} one.`,
  };
}

/**
 * The line for an older edition of the same slot, on the other kinds (and on an EVENING slot with no
 * `revisionOf`): Marketing v2 section 4, passed by Commercial 30a. "Replaces", and `publishedAt` is what it
 * prints. Null when there is no older edition or none of their times parse.
 */
export function replacesLine(superseded: readonly Pick<SessionReport, 'publishedAt'>[], nowMs: number): string | null {
  const stamps = superseded.map((older) => etStamp(older.publishedAt, nowMs)).filter((at): at is NonNullable<typeof at> => at !== null);
  if (stamps.length === 0) return null;
  const list = stamps.map((at) => `${stampText(at)} ET`).join(', ');
  const lead = stamps[0]!.date ? '' : 'at ';
  return stamps.length === 1
    ? `Replaces the edition published ${lead}${list}.`
    : `Replaces the editions published ${lead}${list}.`;
}

/**
 * v6's body: the COMPUTED sections (reports v6 fix (a), `sections.ts`), each
 * with its "LABEL · count" label and its cards, by the same card rules as
 * `reportBlocks` within the group. The headings are now computed from the
 * as-of catalyst status, not model text, so they show again (his "b" hid only
 * the model's). The loose group (empty heading) prints no label. A group left
 * with no block is dropped, so no label ever stands over nothing.
 */
export function reportGroups(
  report: Pick<SessionReport, 'sections'>,
): Array<{ label: string | null; blocks: ReportBlock[] }> {
  const groups: Array<{ label: string | null; blocks: ReportBlock[] }> = [];
  for (const section of report.sections) {
    const blocks = reportBlocks({ sections: [section] });
    if (blocks.length === 0) continue;
    const names = blocks.filter((block) => block.kind === 'NAME').length;
    groups.push({ label: names > 0 ? sectionLabel(section.heading, names) : null, blocks });
  }
  return groups;
}

/**
 * What the body says when it holds no block. A v5 report already leads with
 * "Nothing on watch ..." when its count is zero, which says it; anything else
 * (a v4 report, or a v5 count that disagrees with an empty body) gets one
 * neutral line about the REPORT, never about our sources or the market
 * (Marketing's section wording, `EMPTY_SECTION_LINE`, scoped to the report).
 */
export const EMPTY_REPORT_LINE = 'No line in this report.';

export function emptyReportLine(
  report: Pick<SessionReport, 'sections' | 'watchCount'>,
  blocks: ReportBlock[] = reportBlocks(report),
): string | null {
  if (blocks.length > 0) return null;
  if (report.watchCount === 0) return null;
  return EMPTY_REPORT_LINE;
}

/**
 * The prose split so its FIGURES can be set apart (the mock: figures in white
 * on lighter prose). A figure is a number that carries a unit or a separator:
 * a currency sign ("$1.50", "US$22.8 million"), a percent or a multiple
 * ("366.7%", "9.44x"), thousands commas ("57,401,944"), or a decimal point,
 * with an optional magnitude after it ("M", "million"). A bare whole number is
 * left alone, so dates, years, clock times and counts in words ("June 3, 2026",
 * "Week 4") read as prose. A number touching a letter is part of a name
 * ("8-K", "Q4", "424B5"), the checker's rule for the same tokens.
 *
 * Display only: the segments rejoin to exactly the input.
 */
export function figureSegments(text: string): Array<{ text: string; figure: boolean }> {
  const out: Array<{ text: string; figure: boolean }> = [];
  let last = 0;
  for (const match of text.matchAll(FIGURE)) {
    const start = match.index;
    const end = start + match[0].length;
    const before = text[start - 1] ?? '';
    const after = text[end] ?? '';
    // The sign is part of a match, so "F-3" starts at its hyphen and fails here too.
    if (/[A-Za-z0-9]/.test(before) || /[A-Za-z0-9]/.test(after)) continue;
    if (start > last) out.push({ text: text.slice(last, start), figure: false });
    out.push({ text: match[0], figure: true });
    last = end;
  }
  if (last < text.length) out.push({ text: text.slice(last), figure: false });
  return out;
}

const FIGURE =
  /(?:[+−-])?(?:(?:US|C|A)?\$)?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?:\s?(?:million|billion|thousand)|[MBK])?%?|(?:[+−-])?(?:(?:US|C|A)?\$)\d+(?:\.\d+)?(?:\s?(?:million|billion|thousand)|[MBK])?|(?:[+−-])?\d+\.\d+(?:\s?(?:million|billion|thousand)|[MBK]|%|x)?|(?:[+−-])?\d+(?:%|x)/g;

/**
 * Slot states for one report range.
 *
 * OVER IS SUPERSESSION BY THE NEXT SLOT, NOT AN AGE. A premarket report 90
 * minutes old at 08:30 is current and one from yesterday is not, and no age
 * threshold separates those two; "a later slot has become due" does.
 *
 * MISSED IS NEVER FILLED FROM ANOTHER SLOT. A slot with no report stays empty
 * and says so; the previous slot's report is not promoted into it.
 */
export function reportTimeline(
  payload: SessionReportsPayload,
  rangeId: string,
  nowMs: number,
): ReportTimeline {
  const slots = payload.slots
    .filter((slot) => slot.rangeId === rangeId)
    .sort((a, b) => Date.parse(a.scheduledFor) - Date.parse(b.scheduledFor));

  if (slots.length === 0) return { current: null, earlier: [] };

  const byKey = new Map<string, SessionReport[]>();
  for (const report of payload.reports) {
    if (report.rangeId !== rangeId) continue;
    const key = reportKey(report);
    const list = byKey.get(key) ?? [];
    list.push(report);
    byKey.set(key, list);
  }

  const due = slots.map((slot) => Date.parse(slot.scheduledFor) <= nowMs);
  const lastDue = due.lastIndexOf(true);

  const views = slots.map((slot, index): SlotView => {
    const reports = (byKey.get(reportKey(slot)) ?? [])
      .slice()
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    const report = reports[0] ?? null;
    const superseded = reports.slice(1);

    let state: SlotState;
    if (!due[index]) state = 'DUE';
    else if (index < lastDue) state = 'OVER';
    else if (report) state = 'PUBLISHED';
    else if (nowMs > Date.parse(slot.relevantUntil)) state = 'MISSED';
    else state = 'CHECKING';

    const cause =
      state === 'MISSED' || (state === 'OVER' && !report)
        ? payload.missedCauses[reportKey(slot)]
        : undefined;
    const missedReason = cause ? missedCauseText(cause) : null;

    return { slot, state, report, superseded, missedReason };
  });

  const current = lastDue >= 0 ? views[lastDue] : views[0];
  const earlier = views.filter((view) => view.state === 'OVER').reverse();

  return { current, earlier };
}

/**
 * The trader's words for a missed report (Design, 2026-09-29). Keyed on `kind`
 * only: status and evidence are diagnostics and are never printed.
 *
 * The time is the CHECKPOINT's scheduled time, carried on the cause -- "no
 * 09:25 assessment ran" names the assessment that did not run, not the slot.
 */
export function missedCauseText(cause: MissedCause): string {
  switch (cause.kind) {
    case 'CHECKPOINT_NOT_RUN':
      return `No ${formatEtMinute(cause.checkpoint.scheduledFor) ?? assessmentLabel(cause.checkpoint.type)} assessment ran.`;
    case 'CHECKPOINT_INCOMPLETE':
      return `The ${formatEtMinute(cause.checkpoint.scheduledFor) ?? assessmentLabel(cause.checkpoint.type)} assessment did not finish.`;
    case 'WRITER_FAILED':
      return 'The report could not be written.';
    case 'CHECKER_FAILED':
      return 'The report could not be checked, so it is not shown.';
    case 'ALL_STRUCK':
      return 'Every line failed its check, so nothing is shown.';
    case 'NOT_ATTEMPTED':
      return 'No report was attempted.';
  }
}

export type RangeChoice =
  | { kind: 'CHOSEN'; range: ReportRange; source: 'viewer' | 'board' | 'default' }
  | { kind: 'STRADDLE'; candidates: ReportRange[] };

export interface BoardRange {
  min: number;
  max: number;
}

/**
 * Which report range the panel opens on.
 *
 * Reports are written per SET range (his ruling, 2026-09-27: "set ranges"),
 * while the board's range is the viewer's own. So:
 *
 *   the viewer chose one before          -> that one
 *   the board range sits inside one      -> the narrowest that contains it
 *   the board range spans two or more    -> SAY SO, and let the viewer choose
 *   anything else                        -> the configured default
 *
 * A straddle is not resolved by guessing, because either guess hands the
 * reader a report about names half of which are not on their board, with
 * nothing saying which half.
 */
export function chooseReportRange(options: {
  ranges: ReportRange[];
  defaultRangeId: string;
  stored: string | null;
  board: BoardRange | null;
}): RangeChoice | null {
  const { ranges, defaultRangeId, stored, board } = options;
  if (ranges.length === 0) return null;

  const fallback = ranges.find((range) => range.id === defaultRangeId) ?? ranges[0];

  const remembered = stored ? ranges.find((range) => range.id === stored) : undefined;
  if (remembered) return { kind: 'CHOSEN', range: remembered, source: 'viewer' };

  if (!board) return { kind: 'CHOSEN', range: fallback, source: 'default' };

  const containing = ranges
    .filter((range) => range.min <= board.min && board.max <= range.max)
    .sort((a, b) => a.max - a.min - (b.max - b.min));
  if (containing.length > 0) return { kind: 'CHOSEN', range: containing[0], source: 'board' };

  // Touching at a shared boundary is not overlap: $1-$20 and $20-$50 meet at 20.
  const overlapping = ranges.filter((range) => range.min < board.max && board.min < range.max);
  if (overlapping.length >= 2) {
    return { kind: 'STRADDLE', candidates: overlapping.sort((a, b) => a.min - b.min) };
  }
  if (overlapping.length === 1) return { kind: 'CHOSEN', range: overlapping[0], source: 'board' };

  return { kind: 'CHOSEN', range: fallback, source: 'default' };
}

/**
 * Whether a named ticker carries `not in your range`.
 *
 * Only where the board range and the report range DIFFER, and only on a KNOWN
 * price. An unknown price gets no mark: absence of a price is not evidence the
 * name is outside anything.
 */
export function outsideBoardRange(
  price: number | null | undefined,
  board: BoardRange | null,
  /** The REPORT's own frozen range (`SessionReport.range`), never the config entry. */
  range: { min: number; max: number },
): boolean {
  if (!board) return false;
  if (board.min === range.min && board.max === range.max) return false;
  if (price === null || price === undefined || !Number.isFinite(price)) return false;
  return price < board.min || price > board.max;
}

export interface ReportCoverage {
  named: number;
  withLiveFeed: number;
  /** Names whose feed state the report could not establish. Never counted as without. */
  unknown: number;
}

/**
 * The report's live-data coverage, DERIVED FROM ITS OWN LINES.
 *
 * Not read from `report.coverage`. A separate count can disagree with the
 * per-line `minute data` marks directly beneath it, and it did on the first
 * look at this panel: the header said "2 of 3" over four marked tickers. Counting
 * the lines makes the header and the marks one fact, so there is nothing to
 * keep in step. A ticker named twice counts once, and counts as live if any
 * of its lines had the feed.
 */
export function reportCoverage(report: Pick<SessionReport, 'sections'>): ReportCoverage {
  const state = feedByName(report);
  let withLiveFeed = 0;
  let unknown = 0;
  for (const value of state.values()) {
    if (value === true) withLiveFeed += 1;
    else if (value === null) unknown += 1;
  }
  return { named: state.size, withLiveFeed, unknown };
}

/**
 * Each named ticker's feed state, ONE answer per name, read by the header count
 * (`reportCoverage`) and by each name's card (`reportBlocks`), so the two can
 * never disagree. Per name: live if ANY line says so; otherwise unknown if any
 * line could not say; otherwise without. A null is an absence of OBSERVATION
 * and must never be folded into "no live data", which is an observation.
 */
export function feedByName(report: Pick<SessionReport, 'sections'>): Map<string, boolean | null> {
  const state = new Map<string, boolean | null>();
  for (const section of report.sections) {
    for (const line of section.lines) {
      if (!line.ticker) continue;
      const prior = state.get(line.ticker);
      if (prior === true || line.liveFeed === true) state.set(line.ticker, true);
      else if (prior === null || line.liveFeed === null) state.set(line.ticker, null);
      else state.set(line.ticker, false);
    }
  }
  return state;
}

/**
 * Whether a card prints "feed not recorded" for a name with no recorded feed: only while some name in the
 * report HAS one (unknown < named). On an all-unknown report the mark would sit on every card and say
 * nothing (see `coverageText`).
 */
export function feedUnknownShown(coverage: ReportCoverage): boolean {
  return coverage.unknown < coverage.named;
}

/**
 * "5 of 7 names had live trade data" — over the report's own names.
 *
 * THREE OUTCOMES, NOT TWO: a count, a count with the unrecorded names said
 * aloud, and none when the report could establish none of it. Null when the
 * report names no ticker.
 *
 * ALL UNKNOWN READS AS ABSENT (Integration 35th; Commercial's condition): the
 * evening reports record no feed by construction (Research 347f167a,
 * pipeline.ts:194-201), so "not recorded" on every report says nothing; the
 * header drops it, and `feedUnknownShown` drops the per-card mark with it. A
 * report with any recorded feed keeps the counted forms in full.
 */
export function coverageText(coverage: ReportCoverage): string | null {
  if (coverage.named <= 0) return null;
  if (coverage.unknown === coverage.named) return null;
  const known = coverage.named - coverage.unknown;
  const noun = known === 1 ? 'name' : 'names';
  const base = `${coverage.withLiveFeed} of ${known} ${noun} had live trade data`;
  return coverage.unknown > 0 ? `${base}; not recorded for ${coverage.unknown} more` : base;
}

/**
 * "09:26 ET open spike assessment" — the checkpoint in trader words.
 *
 * The COMPLETED time, because that is the instant the data describes. The
 * schedule label loses its own clock prefix ("22:00 recap" -> "recap") so the
 * line never prints two times that disagree.
 */
export function checkpointText(
  ref: { type: Parameters<typeof assessmentLabel>[0]; completedAt: string },
  nowMs: number,
): string {
  const label = assessmentLabel(ref.type)
    .replace(/^\d{2}:\d{2}\s+/, '')
    .toLowerCase();
  const at = etClockText(ref.completedAt, nowMs);
  return at ? `${at} ${label}` : label;
}

/**
 * A report time in the report's own clock style: "8:31 pm ET", with "Oct 7, " before it when the reader's ET
 * day is not the time's (`etStamp`; Integration 35th: the briefing line and the window's "built on" and
 * "written" times match the v6 report lines). Null when the time does not parse.
 */
export function etClockText(iso: string | null | undefined, nowMs: number): string | null {
  const at = etStamp(iso, nowMs);
  return at ? `${at.date ? `${at.date}, ` : ''}${at.time} ET` : null;
}

const sessionDay = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

/**
 * "Mon, Sep 28" for a YYYY-MM-DD trading date.
 *
 * Formatted at noon UTC in UTC: a calendar date has no time zone, and noon is
 * the one instant that lands on the same day everywhere a reader might be.
 */
export function sessionText(tradingDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tradingDate)) return null;
  const date = new Date(`${tradingDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return sessionDay.format(date);
}

/** "2m ago" / "3h ago". Null when unparseable or in the future. */
export function agoText(iso: string, nowMs: number): string | null {
  const at = Date.parse(iso);
  if (!Number.isFinite(at) || at > nowMs) return null;
  const minutes = Math.round((nowMs - at) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * The briefing line's words, for every state. No state renders blank.
 */
export function briefingLineText(view: SlotView, nowMs: number): string {
  const title = reportTitle(view.slot.kind);
  switch (view.state) {
    case 'DUE': {
      const at = etClockText(view.slot.scheduledFor, nowMs);
      return at ? `${title} · due ${at}` : `${title} · not yet due`;
    }
    case 'CHECKING':
      return `${title} · being checked`;
    case 'MISSED':
      return `No ${title.toLowerCase()} for this session`;
    case 'PUBLISHED':
    case 'OVER': {
      const at = view.report ? etClockText(view.report.publishedAt, nowMs) : null;
      if (!view.report) return `No ${title.toLowerCase()} for this session`;
      return at ? `${title} · ${at}` : title;
    }
  }
}
