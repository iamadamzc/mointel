/**
 * The desk, as a set of read-only MCP tools.
 *
 * ChatGPT cannot fetch this application. Four transports failed before the
 * request reached Nginx — two of them with errors that had nothing to do with
 * the server — so the answer is not a fifth hostname. It is to stop asking
 * ChatGPT to browse and let it call the desk instead, over the protocol built
 * for exactly that.
 *
 * Every tool here reads the SAME view models the dashboard renders from. Not a
 * mirror, not an export, not a second normalisation of the same numbers: the
 * merge, the desk read, the level ladder, the intelligence status and the
 * frozen snapshots all come from the modules the browser uses, so a reviewer
 * asking "what does the desk say about XOS" gets the answer the screen would
 * give, or the discrepancy is a real bug rather than an artefact of this file.
 *
 * Read-only is structural, not declared. There is no write handler to reach:
 * the registry below is the complete surface, every entry is annotated
 * `readOnlyHint`, and a test walks the registry and fails if one is not. None
 * of these open an Alpaca connection, queue research, create an assessment or
 * call a model — they read state three long-running workers already maintain.
 */

import 'server-only';

import { getDashboardState } from '../data';
import { publishedDisplay, type TimePrecision } from '../research/time';
import type { AutoIntelligence } from '../research/view';
import { mergeDesk } from '../dashboard/merge';
import { buildDeskRead, buildStructureSummary } from '../dashboard/deskRead';
import { prioritizeEvents, relevantEvents } from '../dashboard/events';
import {
  getAssessmentSnapshot,
  getMarketSnapshot,
  listAssessments,
} from '../market/readModel';
import { buildDiagnostics } from '../review/diagnostics';
import { setupGradeForTools } from './sheetProjection';

/* --------------------------------------------------------------- registry */

export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * The annotations every tool carries.
 *
 * `readOnlyHint` is the one that matters to the client: ChatGPT treats a tool
 * WITHOUT it as a write action and asks the user to confirm each call. Stating
 * it truthfully is what makes an inspection session usable rather than a
 * sequence of permission prompts — and stating it falsely on something that
 * wrote would be the worst thing in this file.
 *
 * `idempotentHint` is true because reading twice changes nothing; `openWorldHint`
 * is false because every answer comes from one local store rather than an open
 * set of external things.
 */
export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const OBJECT = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  properties,
  ...(required.length ? { required } : {}),
  additionalProperties: true,
});

const NO_ARGS = { type: 'object', properties: {}, additionalProperties: false };

function limitOf(args: Record<string, unknown>, fallback: number, max: number): number {
  const raw = Number(args.limit);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(Math.trunc(raw), 1), max);
}

/** Narrow on purpose: this value reaches a store lookup and a label. */
function tickerOf(args: Record<string, unknown>): string | null {
  const raw = typeof args.ticker === 'string' ? args.ticker.trim().toUpperCase() : '';
  return /^[A-Z0-9.\-]{1,12}$/.test(raw) ? raw : null;
}

/** Everything the dashboard needs to answer a question about the board. */
async function deskContext() {
  const snapshot = getMarketSnapshot();
  const dashboard = await getDashboardState();
  return { snapshot, dashboard, merged: mergeDesk(dashboard, snapshot) };
}

export const TOOLS: McpTool[] = [
  {
    name: 'get_desk_status',
    title: 'Desk status',
    description:
      'Current ET time, trading session, trading date, which board Discovery is ranking by, ' +
      'and the health of the market feed, research engine, assessment scheduler and Google Sheet. ' +
      'Start here: it says what the desk is doing right now and whether anything is wrong.',
    inputSchema: NO_ARGS,
    outputSchema: OBJECT({
      nowEt: { type: 'string' },
      tradingDate: { type: 'string' },
      sessionPhase: { type: 'string' },
      board: { type: 'string' },
      market: { type: 'object' },
      research: { type: 'object' },
      assessments: { type: 'object' },
      sheet: { type: 'object' },
    }),
    async handler() {
      const { snapshot, dashboard } = await deskContext();
      const now = new Date();

      return {
        nowEt: new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          dateStyle: 'medium',
          timeStyle: 'medium',
        }).format(now),
        nowUtc: now.toISOString(),
        tradingDate: snapshot.discovery.tradingDate,
        sessionPhase: snapshot.discovery.sessionPhase,
        board: snapshot.discovery.board,
        rankingLabel: snapshot.discovery.rankingLabel,
        rthClose: snapshot.discovery.rthClose,
        earlyClose: snapshot.discovery.earlyClose,
        market: {
          state: snapshot.marketHealth.state,
          label: snapshot.marketHealth.label,
          live: snapshot.marketHealth.live,
          connection: snapshot.marketHealth.connection,
          freshness: snapshot.marketHealth.freshness,
          messageAgeSeconds: snapshot.marketHealth.messageAgeSeconds,
          heartbeatAgeSeconds: snapshot.marketHealth.heartbeatAgeSeconds,
          rankedCount: snapshot.discovery.rankedCount,
          trackedCount: snapshot.discovery.trackedCount,
          baselineCount: snapshot.discovery.baselineCount,
        },
        research: {
          state: snapshot.researchHealth.state,
          label: snapshot.researchHealth.label,
          running: snapshot.researchHealth.running,
          queuedJobs: snapshot.researchHealth.queuedJobs,
          activeCount: snapshot.researchHealth.activeCount,
          lastCompletedTicker: snapshot.researchHealth.lastCompletedTicker,
          lastCompletedAt: snapshot.researchHealth.lastCompletedAt,
        },
        assessments: {
          state: snapshot.assessments.scheduler.state,
          running: snapshot.assessments.scheduler.running,
          headline: snapshot.assessments.headline,
          subline: snapshot.assessments.subline,
          last: snapshot.assessments.last,
          next: snapshot.assessments.next,
        },
        sheet: {
          provider: dashboard.meta.provider,
          fetchedAt: dashboard.meta.fetchedAt,
          stale: dashboard.meta.stale,
          cacheAgeSeconds: Math.round(dashboard.meta.cacheAgeMs / 1000),
          rows: dashboard.tickers.length,
          error: dashboard.meta.error,
        },
      };
    },
  },

  {
    name: 'get_discovery',
    title: 'Discovery board',
    description:
      'The current session-aware Discovery board, ranked by whichever board is active — Daily RVOL ' +
      'during the session, AH Participation after the close. Returns the same merged rows the UI ' +
      'renders: telemetry, ranks, level ladder, cycle, catalyst, structure and intelligence status. ' +
      "setupGrade is the desk's own reading of the setup at its last checkpoint, as the board's " +
      'badge shows it; it is not a prediction and not a recommendation.',
    inputSchema: OBJECT({
      limit: {
        type: 'integer',
        description: 'How many ranked rows to return. Default 12, maximum 50.',
        minimum: 1,
        maximum: 50,
      },
    }),
    outputSchema: OBJECT({
      tradingDate: { type: 'string' },
      board: { type: 'string' },
      rows: { type: 'array' },
    }),
    async handler(args) {
      const { snapshot, merged } = await deskContext();
      const limit = limitOf(args, snapshot.discovery.discoveryRank || 12, 50);
      const nowIso = new Date().toISOString();

      return {
        tradingDate: snapshot.discovery.tradingDate,
        sessionPhase: snapshot.discovery.sessionPhase,
        // The board is whatever the session says it is. A caller cannot ask for
        // the Daily RVOL board at 21:00; the desk does not have one to give,
        // and inventing one would be the exact bug this board exists to avoid.
        board: snapshot.discovery.board,
        rankingLabel: snapshot.discovery.rankingLabel,
        rankedCount: snapshot.discovery.rankedCount,
        trackedCount: snapshot.discovery.trackedCount,
        calculatedAt: snapshot.discovery.calculatedAt,
        rows: merged.discovery.slice(0, limit).map((row) => ({
          ticker: row.ticker,
          telemetry: row.telemetry,
          cycleLevels: row.cycleLevels,
          levelMap: row.levelMap,
          displayedFloat: row.displayedFloat,
          displayedFloatTurnover: row.displayedFloatTurnover,
          intelligenceState: row.intelligenceState,
          provenance: row.provenance,
          deskRead: buildDeskRead(row),
          setupGrade: setupGradeForTools(row.setupGrade, nowIso),
          sheet: row.research,
        })),
      };
    },
  },

  {
    name: 'get_ticker',
    title: 'Ticker drawer',
    description:
      'Everything the ticker drawer shows for one name: Desk Read, live telemetry, the level ladder, ' +
      'catalyst, structure, supply ledger, cycle, Sheet/AUTO provenance, research state and evidence ' +
      'sources. This is the deep view. Use it after get_discovery identifies a name worth reading. ' +
      "setupGrade is the desk's own reading of the setup at its last checkpoint, with the five " +
      'criteria behind it; it is not a prediction and not a recommendation.',
    inputSchema: OBJECT(
      { ticker: { type: 'string', description: 'Ticker symbol, e.g. "XOS".' } },
      ['ticker'],
    ),
    outputSchema: OBJECT({ ticker: { type: 'string' }, found: { type: 'boolean' } }),
    async handler(args) {
      const ticker = tickerOf(args);
      if (!ticker) throw new Error('A valid ticker is required, e.g. "XOS".');

      const { dashboard, merged } = await deskContext();
      const row = merged.rows.get(ticker);

      if (!row) {
        return {
          ticker,
          found: false,
          detail:
            'The desk is not tracking this ticker in the current session. It may be outside the ' +
            '$1–$20 discovery range, not on the sheet, or simply not moving.',
        };
      }

      return {
        ticker,
        found: true,
        // buildDeskRead and buildStructureSummary are the drawer's own
        // functions, called here rather than reimplemented, so this cannot
        // drift from what the screen says.
        deskRead: buildDeskRead(row),
        structure: buildStructureSummary(row),
        telemetry: row.telemetry,
        levelMap: row.levelMap,
        cycleLevels: row.cycleLevels,
        displayedFloat: row.displayedFloat,
        displayedFloatSource: row.displayedFloatSource,
        displayedFloatTurnover: row.displayedFloatTurnover,
        intelligenceState: row.intelligenceState,
        provenance: row.provenance,
        comparison: row.comparison,
        setupGrade: setupGradeForTools(row.setupGrade, new Date().toISOString()),
        sheet: row.research,
        supplyLedger: row.researchRecord,
        intelligence: withHonestTimestamps(row.intelligence),
        researchStatus: dashboard.research[ticker] ? 'RESEARCH_RECORD_PRESENT' : 'NO_RESEARCH_RECORD',
      };
    },
  },

  {
    name: 'get_recent_events',
    title: 'Recent desk events',
    description:
      'The desk event feed — discovery qualifications, rank entries, halts and assessment markers — ' +
      'ranked by materiality the same way the UI ranks them.',
    inputSchema: OBJECT({
      limit: { type: 'integer', description: 'Default 30, maximum 200.', minimum: 1, maximum: 200 },
      relevantOnly: {
        type: 'boolean',
        description:
          'When true (the default) returns only events the desk considers material, which is what ' +
          'the UI feed shows. False includes background noise.',
      },
    }),
    outputSchema: OBJECT({ events: { type: 'array' }, total: { type: 'integer' } }),
    async handler(args) {
      const { snapshot, merged } = await deskContext();
      const limit = limitOf(args, 30, 200);
      const relevantOnly = args.relevantOnly === undefined ? true : Boolean(args.relevantOnly);

      const rank = snapshot.discovery.discoveryRank || 12;
      const ranked = prioritizeEvents(snapshot.events, {
        // NO PRIMARY TIER HERE, DELIBERATELY. A pin is cosmetic and lives in the
        // trader's browser -- "you only pin something that looks interesting and
        // it only looks interesting because it has research done already" -- so
        // the server cannot know one and must not invent one. The dashboard
        // still passes a real `primary` from the in-memory hook; this surface
        // orders on rank alone. Re-seeding it from the store would be the pin
        // changing what the system prioritises, which is what he ruled out.
        primary: new Set<string>(),
        topRanked: new Set(merged.discovery.slice(0, rank).map((row) => row.ticker)),
        tracked: new Set(merged.rows.keys()),
      });

      const selected = relevantOnly ? relevantEvents(ranked) : ranked;
      return {
        total: selected.length,
        relevantOnly,
        events: selected.slice(0, limit).map((item) => ({
          ...item.event,
          relevance: item.relevance,
        })),
      };
    },
  },

  {
    name: 'get_assessment_status',
    title: 'Assessment scheduler status',
    description:
      'Scheduler health, the last completed checkpoint, the next scheduled one, and whether anything ' +
      'ran late or failed.',
    inputSchema: NO_ARGS,
    outputSchema: OBJECT({ state: { type: 'string' }, last: { type: 'object' }, next: { type: 'object' } }),
    async handler() {
      const snapshot = getMarketSnapshot();
      const panel = snapshot.assessments;
      const recorded = listAssessments(60);

      return {
        state: panel.scheduler.state,
        label: panel.scheduler.label,
        detail: panel.scheduler.detail,
        running: panel.scheduler.running,
        tradingDate: panel.tradingDate,
        headline: panel.headline,
        subline: panel.subline,
        last: panel.last,
        next: panel.next,
        completedToday: panel.today,
        generatedLateToday: panel.today.filter((entry) => entry.generatedLate).length,
        failedRecorded: recorded.filter((entry) => entry.status !== 'COMPLETE').length,
        totalRecorded: recorded.length,
      };
    },
  },

  {
    name: 'get_assessment',
    title: 'Frozen assessment snapshot',
    description:
      'One recorded assessment, exactly as it was written at capture time. Pass an id, or a type such ' +
      'as NEXT_DAY_RECAP or RTH_CLOSE to get the most recent of that type. Nothing live is merged in: ' +
      'a snapshot is a record of a moment, and showing current prices beside old ranks would make it a lie.',
    inputSchema: OBJECT({
      id: { type: 'integer', description: 'Assessment id, as returned by get_assessment_status.' },
      type: {
        type: 'string',
        description:
          'Assessment type, e.g. NEXT_DAY_RECAP, STRUCTURAL_REFRESH, RTH_CLOSE, RTH_INTERVAL. ' +
          'The most recent of that type is returned. Ignored when id is given.',
      },
    }),
    outputSchema: OBJECT({ assessment: { type: 'object' }, tickers: { type: 'array' } }),
    async handler(args) {
      let id = Number.isInteger(args.id) ? Number(args.id) : null;

      if (id === null && typeof args.type === 'string') {
        const wanted = args.type.trim().toUpperCase();
        id = listAssessments(60).find((entry) => entry.type === wanted)?.id ?? null;
        if (id === null) {
          throw new Error(`No recorded assessment of type "${wanted}".`);
        }
      }

      if (id === null) throw new Error('Pass either an assessment id or a type.');

      const snapshot = getAssessmentSnapshot(id);
      if (!snapshot.assessment) throw new Error(`No assessment with id ${id}.`);

      return { frozen: true, ...snapshot };
    },
  },

  {
    name: 'get_diagnostics',
    title: 'Desk diagnostics',
    description:
      'Deployment SHA, market/research/assessment worker detail, database and storage state, ' +
      'deterministic consistency checks and a bounded sanitized error list. Use this to tell a quiet ' +
      'market from a broken one. Contains no keys, prompts, filing text or environment values.',
    inputSchema: NO_ARGS,
    outputSchema: OBJECT({
      deployment: { type: 'object' },
      market: { type: 'object' },
      research: { type: 'object' },
      assessments: { type: 'object' },
      database: { type: 'object' },
      consistency: { type: 'array' },
    }),
    async handler() {
      return buildDiagnostics();
    },
  },
];

export const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

/** The `tools/list` payload: schemas and annotations, without the handlers. */
export function describeTools() {
  return TOOLS.map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    annotations: { title: tool.title, ...READ_ONLY_ANNOTATIONS },
  }));
}

/**
 * Strips fabricated precision from evidence timestamps before publishing.
 *
 * Date-only sources are stored at noon UTC so they land on the right calendar
 * day; emitting that as `publishedAt` told readers Einride's own press page was
 * published at 12:00:00Z when it carries no time at all. The precision was
 * already recorded alongside — it just was not being honoured on the way out.
 */
function withHonestTimestamps(intelligence: AutoIntelligence | null): AutoIntelligence | null {
  if (!intelligence) return intelligence;
  return {
    ...intelligence,
    evidence: intelligence.evidence.map((link) => ({
      ...link,
      publishedAt: publishedDisplay(link.publishedAt, link.publishedPrecision as TimePrecision),
    })),
  };
}
