/**
 * The precomputed resistance-levels store: a directory of JSON files, no
 * schema change.
 *
 *   <dir>/<tradingDate>/<SYMBOL>.json    one section 2 row (it carries computedAt)
 *   <dir>/<tradingDate>/requested.txt    symbols the route was asked for and
 *                                        did not have, one per line
 *
 * A worker writes rows (`levelsRefresh.ts`); the web route only reads rows and
 * appends to `requested.txt`. Every row write is atomic: a temp file in the
 * same directory, then a rename over the target, so a reader sees the old row
 * or the new one and never a torn one. Retention: the current trading date and
 * the most recent earlier one; older date directories are removed.
 *
 * The directory is `LEVELS_DIR`, else `levels/` beside the market store.
 */

import fs from 'node:fs';
import path from 'node:path';

import type { ResistanceLevels } from './levels';

export const LEVELS_DIR_ENV = 'LEVELS_DIR';
export const REQUESTED_FILE = 'requested.txt';
/** A ceiling on requested symbols per date, so a caller cannot grow the file without bound. */
export const MAX_REQUESTED = 200;

/** Symbols become file names, so only characters that cannot leave the directory. */
const SAFE_SYMBOL = /^[A-Z0-9][A-Z0-9.-]{0,15}$/;
const DATE_DIR = /^\d{4}-\d{2}-\d{2}$/;

export function isSafeSymbol(symbol: string): boolean {
  return SAFE_SYMBOL.test(symbol);
}

/** The levels directory: `LEVELS_DIR`, else `levels/` beside the market store at `dbPath`. */
export function levelsDirectory(
  dbPath: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env[LEVELS_DIR_ENV]?.trim();
  return configured ? path.resolve(configured) : path.join(path.dirname(dbPath), 'levels');
}

function dateDir(dir: string, tradingDate: string): string {
  if (!DATE_DIR.test(tradingDate)) throw new Error(`not a trading date: ${tradingDate}`);
  return path.join(dir, tradingDate);
}

function rowPath(dir: string, tradingDate: string, symbol: string): string {
  if (!isSafeSymbol(symbol)) throw new Error(`not a storable symbol: ${symbol}`);
  return path.join(dateDir(dir, tradingDate), `${symbol}.json`);
}

/** Writes one row atomically (temp file, then rename) under its own trading date. */
export function writeLevelsRow(dir: string, row: ResistanceLevels): string {
  const target = rowPath(dir, row.tradingDate, row.symbol);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify(row));
    fs.renameSync(temp, target);
  } catch (error) {
    try {
      fs.rmSync(temp, { force: true });
    } catch {
      /* the temp file may never have been created */
    }
    throw error;
  }
  return target;
}

/** One precomputed row, or null when none has been written (or it cannot be read as a row). */
export function readLevelsRow(dir: string, tradingDate: string, symbol: string): ResistanceLevels | null {
  if (!isSafeSymbol(symbol) || !DATE_DIR.test(tradingDate)) return null;
  let text: string;
  try {
    text = fs.readFileSync(rowPath(dir, tradingDate, symbol), 'utf8');
  } catch {
    return null;
  }
  try {
    const row = JSON.parse(text) as ResistanceLevels;
    if (row?.symbol !== symbol || row.tradingDate !== tradingDate || !Array.isArray(row.levels)) return null;
    return row;
  } catch {
    return null;
  }
}

/** The symbols requested for a trading date, de-duplicated, in first-request order. */
export function readRequested(dir: string, tradingDate: string): string[] {
  let text: string;
  try {
    text = fs.readFileSync(path.join(dateDir(dir, tradingDate), REQUESTED_FILE), 'utf8');
  } catch {
    return [];
  }
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const symbol = line.trim();
    if (isSafeSymbol(symbol)) seen.add(symbol);
  }
  return [...seen];
}

/**
 * Asks the next refresh to compute `symbol`. Appends one line unless it is
 * already listed or the date's list is full. Returns whether it appended.
 */
export function appendRequested(dir: string, tradingDate: string, symbol: string): boolean {
  if (!isSafeSymbol(symbol)) return false;
  const listed = readRequested(dir, tradingDate);
  if (listed.includes(symbol) || listed.length >= MAX_REQUESTED) return false;
  const target = dateDir(dir, tradingDate);
  fs.mkdirSync(target, { recursive: true });
  fs.appendFileSync(path.join(target, REQUESTED_FILE), `${symbol}\n`);
  return true;
}

/**
 * Keeps `tradingDate` and the most recent earlier date directory; removes
 * every older date directory. Dates after `tradingDate` are left alone.
 * Returns the removed dates.
 */
export function pruneLevelsDates(dir: string, tradingDate: string): string[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const earlier = entries.filter((name) => DATE_DIR.test(name) && name < tradingDate).sort();
  const remove = earlier.slice(0, -1);
  for (const date of remove) fs.rmSync(path.join(dir, date), { recursive: true, force: true });
  return remove;
}
