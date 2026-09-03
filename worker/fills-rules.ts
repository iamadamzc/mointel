/**
 * `npm run fills:rules`
 *
 * Shows or sets the trader's own session numbers: the green stop, the red
 * stop, and the winner size that triggers the five-minute hands-off ritual.
 *
 * Usage:
 *
 *   npm run fills:rules                                # show current values
 *   npm run fills:rules -- --green-stop 100
 *   npm run fills:rules -- --red-stop 80 --win-ritual 25
 *   npm run fills:rules -- --clear green-stop
 *
 * These are the only thresholds in the system the trader chooses himself, and
 * that is their entire value: every inherited number has failed to bind, and
 * the record shows him executing precisely when the target is one he owns.
 * There are no defaults here on purpose -- an unset rule reports as "not set"
 * rather than borrowing the booklet's answer.
 *
 * The values live in the fills database, not in code: they reveal account
 * scale, and the handling rule keeps results and the numbers around them
 * outside the repository.
 */

import { pathToFileURL } from 'node:url';

import {
  getPersonalRules,
  openFillsStore,
  resolveFillsPath,
  setPersonalRule,
  type PersonalRules,
} from '../lib/coaching/fills/store';

interface Options {
  db: string | null;
  /** Sets and clears in the order they were typed: last directive wins. */
  ops: { name: keyof PersonalRules; value: number | null }[];
}

const FLAG_TO_RULE: Record<string, keyof PersonalRules> = {
  'green-stop': 'greenStop',
  'red-stop': 'redStop',
  'win-ritual': 'winRitual',
};

function parseArgs(argv: readonly string[]): Options {
  const options: Options = { db: null, ops: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--db') {
      options.db = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === '--clear') {
      const name = FLAG_TO_RULE[argv[i + 1] ?? ''];
      if (!name) throw new Error(`--clear expects one of: ${Object.keys(FLAG_TO_RULE).join(', ')}`);
      options.ops.push({ name, value: null });
      i += 1;
      continue;
    }
    const rule = FLAG_TO_RULE[arg.replace(/^--/, '')];
    if (rule) {
      const value = Number(argv[i + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${arg} expects a positive dollar amount, got "${argv[i + 1]}"`);
      }
      options.ops.push({ name: rule, value });
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function show(rules: PersonalRules): void {
  const fmt = (value: number | null): string => (value === null ? 'not set' : `$${value}`);
  console.log(`  green stop   ${fmt(rules.greenStop)}   (flat and done when the day touches +this)`);
  console.log(`  red stop     ${fmt(rules.redStop)}   (flat and done when the day touches -this)`);
  console.log(`  win ritual   ${fmt(rules.winRitual)}   (a winner this size starts the 5-minute hands-off)`);
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const db = openFillsStore(options.db);

  try {
    // Applied in the order typed, so a trailing --clear or a later value wins
    // exactly as the command line reads.
    for (const op of options.ops) setPersonalRule(db, op.name, op.value);

    if (options.ops.length > 0) {
      console.log(`updated ${resolveFillsPath(options.db)}`);
    }
    show(getPersonalRules(db));
  } finally {
    db.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
