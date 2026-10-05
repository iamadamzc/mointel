/**
 * How the desk describes its own state.
 *
 * One compact component in the header answers three questions at a glance:
 * which session is this, what did the desk last conclude, and when does it
 * conclude next. Those are exactly the questions a board full of numbers
 * cannot answer on its own — at 16:30 the numbers look like a normal board
 * unless something says the session changed underneath them.
 */

import { assessmentLabel, type AssessmentType, type ScheduledAssessment } from './schedule';
import type { SessionPhase } from '../market/types';

export interface AssessmentSummary {
  id: number;
  type: string;
  label: string;
  /** 'HH:MM' ET of the scheduled slot. */
  clock: string;
  scheduledFor: string;
  completedAt: string | null;
  generatedLate: boolean;
  board: string;
  rankingDefinition: string;
  tickerCount: number;
  status: string;
  notes: string;
  tradingDate: string;
  targetTradingDate: string | null;
  /** Set for the 09:25 assessment, whose ordering is explicitly unvalidated. */
  experimental: boolean;
}

export interface AssessmentPanel {
  tradingDate: string;
  /** Big line: what the user is looking at. */
  headline: string;
  /** Small line: last checkpoint, next checkpoint. */
  subline: string;
  last: AssessmentSummary | null;
  next: { type: AssessmentType; label: string; clock: string; scheduledFor: string } | null;
  /** Completed assessments for this trading date, oldest first. */
  today: AssessmentSummary[];
  /**
   * The newest completed assessment from an EARLIER trading date, present only
   * when `today` is empty.
   *
   * THE 22:00 RECAP IS FILED UNDER THE DAY IT CLOSES OUT, but the desk's trading
   * date rolls forward at 22:00 and over every weekend and holiday, so `today`
   * (read for the rolled date) is empty in exactly the window the recap is the
   * only thing worth opening: 22:00 to 04:00 ET and non-trading days. This is
   * that recap (or the 20:00 after-hours checkpoint before it has run), read
   * across dates, so the main area can open on it instead of an empty board.
   * Absent, or null, means there is no earlier checkpoint to show.
   * Optional: payloads and fixtures that predate it stay valid.
   */
  carried?: AssessmentSummary | null;
  scheduler: {
    state: 'OFFLINE' | 'IDLE' | 'WORKING' | 'ERROR' | 'UNKNOWN';
    label: string;
    detail: string;
    tone: 'pos' | 'warn' | 'neg' | 'dim';
    running: boolean;
  };
}

/**
 * A scheduler heartbeat older than this means nobody is keeping the
 * checkpoints. Generous compared with the market feed's threshold: this worker
 * ticks slowly by design, and a false alarm here would train the desk to
 * ignore the one light that says a checkpoint will be missed.
 */
export const SCHEDULER_STALE_MS = 3 * 60_000;

export function projectSchedulerHealth(options: {
  health: { state: string; updatedAt: string; lastError: string | null } | null;
  now: number;
}): AssessmentPanel['scheduler'] {
  const { health, now } = options;

  if (!health) {
    return {
      state: 'OFFLINE',
      label: 'Assessments: scheduler offline',
      detail:
        'No desk assessment worker has reported. Scheduled checkpoints are not being taken. ' +
        'Start the desk with npm run desk, or the worker alone with npm run assessments.',
      tone: 'neg',
      running: false,
    };
  }

  const age = now - Date.parse(health.updatedAt);
  if (!Number.isFinite(age) || age > SCHEDULER_STALE_MS) {
    return {
      state: 'OFFLINE',
      label: 'Assessments: scheduler offline',
      detail: `Last heartbeat ${Number.isFinite(age) ? `${Math.round(age / 1000)}s` : 'never'} ago. Checkpoints will be missed.`,
      tone: 'neg',
      running: false,
    };
  }

  if (health.state === 'ERROR') {
    return {
      state: 'ERROR',
      label: 'Assessments: error',
      detail: health.lastError ?? 'The scheduler reported an error',
      tone: 'neg',
      running: true,
    };
  }

  if (health.state === 'WORKING') {
    return {
      state: 'WORKING',
      label: 'Assessments: running',
      detail: 'Taking a scheduled desk assessment',
      tone: 'pos',
      running: true,
    };
  }

  return {
    state: 'IDLE',
    label: 'Assessments: scheduled',
    detail: 'Scheduler is running and waiting for the next checkpoint',
    tone: 'dim',
    running: true,
  };
}

function clockOf(scheduledFor: string, fallback: string): string {
  return fallback || scheduledFor;
}

/**
 * The header's two lines.
 *
 * Deliberately literal. "AFTER HOURS — LIVE DISCOVERY" is not decoration: at
 * 16:30 it is the difference between reading the board as today's leaders and
 * reading it as what is happening now.
 */
export function describeSession(options: {
  phase: SessionPhase;
  board: string;
  rthClose: string;
  earlyClose: boolean;
  last: AssessmentSummary | null;
  next: AssessmentPanel['next'];
  tradingDate: string;
  targetTradingDate: string | null;
}): { headline: string; subline: string } {
  const { phase, last, next } = options;

  const nextPart = next ? `Next: ${next.label.toUpperCase()} ${next.clock} ET` : null;
  const lastPart = last
    ? `Last: ${last.label.toUpperCase()} ${clockOf(last.scheduledFor, last.clock)}${
        last.generatedLate ? ' (late)' : ''
      }`
    : null;

  const joined = [lastPart, nextPart].filter(Boolean).join(' · ');

  switch (phase) {
    case 'PREMARKET':
      return {
        headline: 'PREMARKET',
        subline: joined || 'Discovery ranked on Daily RVOL',
      };

    case 'RTH':
      return {
        headline: options.earlyClose ? `RTH · EARLY CLOSE ${options.rthClose} ET` : 'RTH',
        subline: joined || 'Discovery ranked on Daily RVOL',
      };

    case 'AFTER_HOURS':
      return {
        headline: 'AFTER HOURS · LIVE DISCOVERY',
        subline:
          `AH session since ${options.rthClose} ET` +
          (nextPart ? ` · ${nextPart}` : '') +
          (lastPart ? ` · ${lastPart}` : ''),
      };

    case 'POST_MARKET':
      return {
        headline: 'AFTER HOURS CLOSED',
        subline:
          'Final AH state frozen at 20:00 ET' + (nextPart ? ` · ${nextPart}` : ''),
      };

    case 'NEXT_DAY_PREP':
      return {
        headline: 'NEXT-DAY PREP',
        subline:
          (last?.type === 'NEXT_DAY_RECAP'
            ? '22:00 recap complete'
            : (lastPart ?? 'Preparing the next session')) +
          (options.targetTradingDate ? ` · Target session ${options.targetTradingDate}` : '') +
          (nextPart ? ` · ${nextPart}` : ''),
      };

    default:
      return {
        headline: 'MARKET CLOSED',
        subline: options.tradingDate
          ? `Next session ${options.tradingDate}`
          : 'No session scheduled',
      };
  }
}

/**
 * The newest checkpoint from a date other than `tradingDate`, from a newest-first
 * list. Null when there is none, so callers never invent one.
 */
export function latestEarlierCheckpoint(
  recentNewestFirst: readonly AssessmentSummary[],
  tradingDate: string,
): AssessmentSummary | null {
  return recentNewestFirst.find((summary) => summary.tradingDate !== tradingDate) ?? null;
}

/**
 * The panel before anything is known.
 *
 * Reports the scheduler as OFFLINE rather than IDLE: no payload has arrived,
 * so nothing has said the checkpoints are being taken, and "unknown" must not
 * render as reassurance.
 */
export function emptyAssessmentPanel(detail?: string): AssessmentPanel {
  return {
    tradingDate: '',
    headline: 'MARKET CLOSED',
    subline: detail ?? 'No session scheduled',
    last: null,
    next: null,
    today: [],
    scheduler: projectSchedulerHealth({ health: null, now: 0 }),
  };
}

/** Turns a scheduled slot into the panel's `next`. */
export function toNext(scheduled: ScheduledAssessment | null): AssessmentPanel['next'] {
  if (!scheduled) return null;
  return {
    type: scheduled.type,
    label: assessmentLabel(scheduled.type),
    clock: scheduled.clock,
    scheduledFor: scheduled.scheduledFor,
  };
}
