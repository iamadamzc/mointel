/**
 * `npm run desk` — the whole Trading Desk, as one application.
 *
 * Three processes make a working desk: the dashboard, the Alpaca SIP worker and
 * the automatic research worker. They used to be started by hand, in any order,
 * and left running afterwards. This makes them behave like one windowed
 * program: opening it starts everything, closing the window stops everything,
 * and opening it twice does not start a second copy.
 *
 * Two things make that reliable on Windows rather than merely likely:
 *
 *   1. A lock file recording this supervisor's pid and its children's. If the
 *      supervisor is killed in a way it cannot handle — Task Manager, a power
 *      cut — the next launch finds the stale lock, kills the orphans it names,
 *      and starts clean. Without that, an orphaned market worker would hold the
 *      one Alpaca SIP connection the account is allowed and quietly block every
 *      future start.
 *
 *   2. Shutdown on every signal Windows actually delivers, including SIGHUP,
 *      which is what closing a console window sends.
 *
 * Alpaca permits ONE concurrent SIP connection per account, so a second market
 * worker does not fail loudly — it silently kills the live one. Every guard
 * here exists for that.
 */

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const lockPath = path.join(root, 'data', 'desk.lock');

const PORT = Number(process.env.PORT ?? 3000);
const URL = `http://localhost:${PORT}`;
/** Restart backoff, so a service failing on startup cannot spin. */
const RESTART_DELAY_MS = 5_000;
/** How long to wait for the dashboard before opening the browser anyway. */
const BROWSER_TIMEOUT_MS = 90_000;

const isWindows = process.platform === 'win32';

/* --------------------------------------------------------------- utilities */

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

/** Signal 0 tests for existence without touching the process. */
function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means it exists but belongs to somebody else, which still counts.
    return error.code === 'EPERM';
  }
}

/** Kills a process and everything it spawned. */
function killTree(pid) {
  if (!pid || !isAlive(pid)) return;
  try {
    if (isWindows) {
      // Windows has no process groups to signal, so the tree goes by pid.
      spawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGTERM');
    }
  } catch {
    /* already gone */
  }
}

function readLock() {
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch {
    return null;
  }
}

function writeLock(children) {
  try {
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    fs.writeFileSync(
      lockPath,
      JSON.stringify(
        { supervisor: process.pid, children, startedAt: new Date().toISOString() },
        null,
        2,
      ),
    );
  } catch {
    // A desk that cannot write its lock still runs; it just cannot clean up
    // after an unclean exit, which the liveness checks below still cover.
  }
}

function removeLock() {
  try {
    // Only remove a lock this process owns, so a second launcher racing us
    // cannot delete the running desk's lock on its way out.
    const lock = readLock();
    if (!lock || lock.supervisor === process.pid) fs.rmSync(lockPath, { force: true });
  } catch {
    /* nothing to remove */
  }
}

function openBrowser() {
  try {
    if (isWindows) spawn('cmd', ['/c', 'start', '', URL], { detached: true, stdio: 'ignore' }).unref();
    else if (process.platform === 'darwin') spawn('open', [URL], { detached: true, stdio: 'ignore' }).unref();
    else spawn('xdg-open', [URL], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    console.log(`Open ${URL} in your browser.`);
  }
}

/* ---------------------------------------------------------------- services */

/*
 * Each service is launched as node directly, not through `npm run`.
 *
 * Going through npm put two extra processes in front of the real one — a shell
 * and the npm cli — so the pid this supervisor recorded was a wrapper that dies
 * on its own the moment the pipe breaks, while the node process behind it
 * survived. Cleanup then had nothing live to kill and orphans held the Alpaca
 * SIP connection. Spawning node directly means the recorded pid IS the process
 * that matters, and killing its tree actually ends the service.
 */
const SERVICES = [
  {
    name: 'dashboard',
    colour: '[36m',
    args: ['node_modules/next/dist/bin/next', 'dev'],
  },
  {
    name: 'market',
    colour: '[33m',
    args: ['node_modules/tsx/dist/cli.mjs', 'worker/alpaca.ts'],
  },
  {
    name: 'research',
    colour: '[35m',
    // The research worker needs the server condition to load server-only code.
    args: ['node_modules/tsx/dist/cli.mjs', '--conditions=react-server', 'worker/research.ts'],
  },
  {
    name: 'assess',
    colour: '[32m',
    // The scheduled desk assessments: 06:10, 06:25, 06:45, 07:00, 09:25, every
    // 30 minutes through RTH, the close, and the 22:00 recap. Supervised like
    // the others so nobody has to remember which process owns which checkpoint,
    // and so a stopped scheduler shows up as a light rather than as silence.
    args: [
      'node_modules/tsx/dist/cli.mjs',
      '--conditions=react-server',
      'worker/desk-assessments.ts',
    ],
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

function recordChildren() {
  writeLock([...children.values()].map((child) => child.pid).filter(Boolean));
}

function start(service) {
  const child = spawn(process.execPath, service.args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    // A process group elsewhere means one signal reaches the whole tree.
    detached: !isWindows,
  });

  children.set(service.name, child);
  recordChildren();

  pipe(service, child.stdout);
  pipe(service, child.stderr);

  child.on('exit', (code, signal) => {
    children.delete(service.name);
    if (stopping) return;

    console.log(
      prefix(service, `exited (${signal ?? code}) — restarting in ${RESTART_DELAY_MS / 1000}s`),
    );
    setTimeout(() => {
      if (!stopping) start(service);
    }, RESTART_DELAY_MS);
  });

  console.log(prefix(service, `started (pid ${child.pid})`));
}

/* ---------------------------------------------------------------- lifecycle */

/**
 * Clears anything left behind by a supervisor that died without cleaning up.
 *
 * Returns true when a desk is genuinely already running, in which case this
 * launch should hand over to it rather than start a competing one.
 */
function reconcilePreviousRun() {
  const lock = readLock();
  if (!lock) return false;

  if (isAlive(lock.supervisor) && lock.supervisor !== process.pid) {
    return true;
  }

  const orphans = (lock.children ?? []).filter(isAlive);
  if (orphans.length > 0) {
    console.log(`Cleaning up ${orphans.length} process(es) left by a previous run...`);
    for (const pid of orphans) killTree(pid);
  }

  removeLock();
  return false;
}

async function main() {
  console.log('Momentum Intelligence Trading Desk\n');

  if (reconcilePreviousRun()) {
    console.log('The desk is already running in another window. Opening the dashboard.');
    openBrowser();
    return;
  }

  /*
   * A last check against processes this supervisor does not know about — one
   * started by hand, say. The market worker is the one that matters: starting a
   * second would take down the live SIP connection.
   */
  if (await portInUse(PORT)) {
    console.log(
      `Something is already listening on :${PORT}. Close the other desk window first,\n` +
        'or stop whatever is using the port, then run this again.',
    );
    openBrowser();
    return;
  }

  for (const service of SERVICES) start(service);

  console.log('\nClose this window to stop the desk.\n');

  // Open the browser once the dashboard answers, so the window never lands on
  // a connection-refused page.
  const deadline = Date.now() + BROWSER_TIMEOUT_MS;
  while (Date.now() < deadline && !stopping) {
    if (await portInUse(PORT)) {
      openBrowser();
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
}

function shutdown(reason) {
  if (stopping) return;
  stopping = true;
  console.log(`\nStopping the desk (${reason})...`);

  for (const [name, child] of children) {
    try {
      killTree(child.pid);
    } catch {
      console.log(`could not stop ${name}`);
    }
  }

  removeLock();
  process.exit(0);
}

// Every way this window can close. SIGHUP is what Windows sends when the
// console window itself is closed, which is the ordinary way to quit an app.
process.on('SIGINT', () => shutdown('interrupted'));
process.on('SIGTERM', () => shutdown('terminated'));
process.on('SIGHUP', () => shutdown('window closed'));
process.on('SIGBREAK', () => shutdown('break'));

// Last resort: whatever happens, do not leave children holding the SIP
// connection. This runs synchronously, which is why killTree uses spawnSync.
process.on('exit', () => {
  if (stopping) return;
  for (const child of children.values()) killTree(child.pid);
  removeLock();
});

process.on('uncaughtException', (error) => {
  console.error(`Supervisor error: ${error.message}`);
  shutdown('supervisor error');
});

await main();
