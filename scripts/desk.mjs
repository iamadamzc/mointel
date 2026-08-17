/**
 * `npm run desk` — the whole Trading Desk, supervised.
 *
 * Three processes make a working desk, and only two of them were ever started
 * by the launcher. The automatic research worker had to be remembered and run
 * by hand, so the normal way to use this application left the research engine
 * off — and because the header only reported Google Sheet health, nothing said
 * so. Top-12 names sat at NOT YET ANALYZED for hours.
 *
 * This starts all three and restarts any that die. It deliberately does NOT
 * start something that is already running: Alpaca permits one concurrent SIP
 * connection per account, so a second market worker would kill the live one.
 * Liveness is judged from the same signals the dashboard uses rather than by
 * scanning the process table, which does not port between shells.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dbPath = process.env.MARKET_DB_PATH
  ? path.resolve(process.env.MARKET_DB_PATH)
  : path.join(root, 'data', 'market.db');

const PORT = Number(process.env.PORT ?? 3000);
/** A heartbeat older than this means the process behind it is gone. */
const HEARTBEAT_STALE_MS = 60_000;
/** Restart backoff, so a process failing on startup cannot spin. */
const RESTART_DELAY_MS = 5_000;

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(700);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
    socket.connect(port, '127.0.0.1');
  });
}

/** Reads a heartbeat out of the shared store without disturbing the writers. */
function heartbeatAge(read) {
  if (!fs.existsSync(dbPath)) return Infinity;

  let db;
  try {
    db = new Database(dbPath, { readonly: true });
    const at = read(db);
    if (!at) return Infinity;
    const parsed = Date.parse(at);
    return Number.isFinite(parsed) ? Date.now() - parsed : Infinity;
  } catch {
    return Infinity;
  } finally {
    db?.close();
  }
}

function marketWorkerAlive() {
  return (
    heartbeatAge((db) => {
      const row = db.prepare('SELECT payload FROM feed_health WHERE id = 1').get();
      return row ? JSON.parse(row.payload).heartbeatAt : null;
    }) < HEARTBEAT_STALE_MS
  );
}

function researchWorkerAlive() {
  return (
    heartbeatAge((db) => {
      const row = db.prepare('SELECT payload FROM research_health WHERE id = 1').get();
      return row ? JSON.parse(row.payload).updatedAt : null;
    }) < HEARTBEAT_STALE_MS
  );
}

const SERVICES = [
  {
    name: 'dashboard',
    script: 'dev',
    colour: '[36m',
    // Something is already serving the port; leave it alone.
    alreadyRunning: () => portInUse(PORT),
    skipNote: `something is already listening on :${PORT}`,
  },
  {
    name: 'market',
    script: 'market:alpaca',
    colour: '[33m',
    alreadyRunning: async () => marketWorkerAlive(),
    // Alpaca allows one SIP connection: a second worker would kill the first.
    skipNote: 'a market worker is already streaming (one SIP connection allowed)',
  },
  {
    name: 'research',
    script: 'research',
    colour: '[35m',
    alreadyRunning: async () => researchWorkerAlive(),
    skipNote: 'a research worker is already running',
  },
];

const RESET = '[0m';
const children = new Map();
let stopping = false;

function prefix(service, line) {
  return `${service.colour}[${service.name}]${RESET} ${line}`;
}

function pipe(service, stream) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) console.log(prefix(service, line));
    }
  });
}

function start(service) {
  const child = spawn(npm, ['run', service.script], {
    cwd: root,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  children.set(service.name, child);
  pipe(service, child.stdout);
  pipe(service, child.stderr);

  child.on('exit', (code, signal) => {
    children.delete(service.name);
    if (stopping) return;

    console.log(prefix(service, `exited (${signal ?? code}) — restarting in ${RESTART_DELAY_MS / 1000}s`));
    setTimeout(() => {
      if (!stopping) start(service);
    }, RESTART_DELAY_MS);
  });

  console.log(prefix(service, `started (npm run ${service.script})`));
}

async function main() {
  console.log('Momentum Intelligence Trading Desk — dashboard, market feed, research engine\n');

  for (const service of SERVICES) {
    if (await service.alreadyRunning()) {
      console.log(prefix(service, `not started: ${service.skipNote}`));
      continue;
    }
    start(service);
  }

  if (children.size === 0) {
    console.log('\nEverything is already running. Nothing to do.');
    return;
  }

  console.log('\nCtrl+C stops the desk.\n');
}

function shutdown() {
  if (stopping) return;
  stopping = true;
  console.log('\nStopping the desk...');

  for (const [name, child] of children) {
    try {
      // Windows has no process groups to signal, so the tree is taken down by
      // pid; elsewhere a plain terminate lets each worker flush and close.
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      } else {
        child.kill('SIGTERM');
      }
    } catch {
      console.log(`could not stop ${name}`);
    }
  }

  setTimeout(() => process.exit(0), 1500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await main();
