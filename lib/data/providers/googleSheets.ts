/**
 * Google Sheets provider (server-only).
 *
 * Reads the TODAY and RESEARCH tabs with a single batched values request and
 * converts them into normalized application objects. The sheet is treated as
 * strictly read-only.
 */

import 'server-only';
import { JWT } from 'google-auth-library';

import {
  normalizeSheetRows,
  TODAY_COLUMNS,
  TODAY_TABLE_SIGNATURE,
  RESEARCH_COLUMNS,
  RESEARCH_TABLE_SIGNATURE,
} from '../rows';
import { locateTable } from '../sheetTable';
import type { DashboardDataProvider, DataSourceMeta } from '../types';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const DRIVE_METADATA_SCOPE = 'https://www.googleapis.com/auth/drive.metadata.readonly';

export const TODAY_RANGE = 'TODAY!A1:AA';
export const RESEARCH_RANGE = 'RESEARCH!A1:AK';

/**
 * Optional ceiling on a Sheets or Drive request.
 *
 * OPTIONAL, and unset by default, deliberately. This provider serves two
 * callers with opposite needs: the Next.js dashboard, where a slow response
 * should still arrive and blanking the board would be worse than waiting, and
 * the research worker, where `loadSheetPriors` runs at the top of every poll
 * before any job is claimed — so an unbounded fetch there is a silent hang with
 * no error, no crash, and no failed heartbeat.
 *
 * The worker passes one; the dashboard does not, and its behaviour is unchanged
 * by this. Whether the DASHBOARD wants a timeout is a separate question about a
 * different surface, and not one to settle by changing a default underneath it.
 */
export interface GoogleSheetsOptions {
  timeoutMs?: number;
}

export interface GoogleSheetsCredentials {
  sheetId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * `.env` files cannot hold real newlines comfortably, so private keys are
 * stored with escaped "\n" sequences. Some hosts also wrap the value in quotes.
 */
export function normalizePrivateKey(rawKey: string): string {
  let key = rawKey.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n').replace(/\r/g, '');
}

/** Returns credentials only when all three variables are present and usable. */
export function readCredentialsFromEnv(): GoogleSheetsCredentials | null {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!sheetId || !clientEmail || !rawKey) return null;

  const privateKey = normalizePrivateKey(rawKey);
  if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) return null;

  return { sheetId, clientEmail, privateKey };
}

interface BatchGetResponse {
  valueRanges?: Array<{ range?: string; values?: string[][] }>;
}

interface SpreadsheetMetaResponse {
  properties?: { title?: string };
}

export class GoogleSheetsProvider implements DashboardDataProvider {
  readonly kind = 'google-sheets' as const;

  private readonly credentials: GoogleSheetsCredentials;
  private client: JWT | null = null;
  private cachedTitle: string | null = null;
  /** Drive API is optional; once it fails we stop asking on every refresh. */
  private driveModifiedTimeAvailable = true;

  private readonly timeoutMs: number | null;

  constructor(credentials: GoogleSheetsCredentials, options: GoogleSheetsOptions = {}) {
    this.credentials = credentials;
    this.timeoutMs = options.timeoutMs ?? null;
  }

  /** Request options carrying the ceiling, when one was asked for. */
  private timed<T extends { url: string }>(request: T): T & { timeout?: number } {
    return this.timeoutMs === null ? request : { ...request, timeout: this.timeoutMs };
  }

  private getClient(): JWT {
    if (!this.client) {
      this.client = new JWT({
        email: this.credentials.clientEmail,
        key: this.credentials.privateKey,
        scopes: [SHEETS_SCOPE, DRIVE_METADATA_SCOPE],
      });
    }
    return this.client;
  }

  private async fetchTitle(): Promise<string | null> {
    if (this.cachedTitle) return this.cachedTitle;
    try {
      const response = await this.getClient().request<SpreadsheetMetaResponse>(
        this.timed({
          url: `https://sheets.googleapis.com/v4/spreadsheets/${this.credentials.sheetId}?fields=properties.title`,
        }),
      );
      this.cachedTitle = response.data.properties?.title ?? null;
    } catch {
      this.cachedTitle = null;
    }
    return this.cachedTitle;
  }

  /** Best-effort: requires the Drive API to be enabled on the Google Cloud project. */
  private async fetchSourceUpdatedAt(): Promise<string | null> {
    if (!this.driveModifiedTimeAvailable) return null;
    try {
      const response = await this.getClient().request<{ modifiedTime?: string }>(
        this.timed({
          url: `https://www.googleapis.com/drive/v3/files/${this.credentials.sheetId}?fields=modifiedTime`,
        }),
      );
      return response.data.modifiedTime ?? null;
    } catch {
      this.driveModifiedTimeAvailable = false;
      return null;
    }
  }

  async load() {
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${this.credentials.sheetId}/values:batchGet` +
      `?ranges=${encodeURIComponent(TODAY_RANGE)}` +
      `&ranges=${encodeURIComponent(RESEARCH_RANGE)}` +
      `&valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`;

    const response = await this.getClient().request<BatchGetResponse>(this.timed({ url }));
    const ranges = response.data.valueRanges ?? [];

    const todayValues = ranges[0]?.values ?? [];
    const researchValues = ranges[1]?.values ?? [];

    /*
     * Locate each table rather than assuming its header is row 1.
     *
     * A tab is a canvas. TODAY carries the watchlist and, below it, a second
     * block with its own TICKER header and a summary area of labels and
     * numbers. slice(1) read all of it as one table and turned `TICKER`,
     * `OBSERVED PM`, prices and percentages into pinned symbols.
     */
    const todayTable = locateTable(todayValues, {
      keyHeader: 'Ticker',
      requiredHeaders: TODAY_TABLE_SIGNATURE,
      boundaryHeaders: TODAY_COLUMNS,
    });
    const researchTable = locateTable(researchValues, {
      keyHeader: 'Ticker',
      requiredHeaders: RESEARCH_TABLE_SIGNATURE,
      boundaryHeaders: RESEARCH_COLUMNS,
    });

    /*
     * Fail closed on an unreadable tab.
     *
     * Returning nothing would blank the board and returning the raw grid is
     * what caused the incident, so an unlocatable table throws and the caller's
     * cache keeps serving the last good read.
     */
    if (todayValues.length > 0 && !todayTable) {
      throw new Error('TODAY tab: could not locate the ticker table; keeping the previous read');
    }
    if (researchValues.length > 0 && !researchTable) {
      throw new Error('RESEARCH tab: could not locate the ticker table; keeping the previous read');
    }

    const normalized = normalizeSheetRows(
      todayTable?.rows ?? [],
      researchTable?.rows ?? [],
      {
        todayTickerColumn: todayTable?.keyColumnIndex,
        researchTickerColumn: researchTable?.keyColumnIndex,
        todayFirstSheetRow: todayTable?.firstDataSheetRow,
        researchFirstSheetRow: researchTable?.firstDataSheetRow,
      },
    );

    const [sourceTitle, sourceUpdatedAt] = await Promise.all([
      this.fetchTitle(),
      this.fetchSourceUpdatedAt(),
    ]);

    const meta: Omit<DataSourceMeta, 'cacheAgeMs' | 'stale'> = {
      provider: this.kind,
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt,
      error: null,
      sourceTitle,
      warnings: normalized.warnings,
    };

    return {
      tickers: normalized.tickers,
      research: normalized.research,
      summary: normalized.summary,
      meta,
    };
  }
}
