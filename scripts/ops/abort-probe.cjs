// Node half of the abort-path test (Integration, 2026-09-29). LOCAL ONLY.
// Question: request B is queued behind a synchronous build (A), and B's client
// aborts while queued. When B's handler is entered, is Next's request.signal
// already aborted? Uses Next 16.3.1's own signalFromNodeResponse.
// Conservative: a bare http server has FEWER awaits before the handler than
// Next's router, so fewer chances for the close to be processed first; the
// "afterHop" column shows one hop's difference.
// Run: node scripts/ops/abort-probe.cjs   (local; never on the box)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const http = require('http');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

if (process.argv[2] === 'client') {
  // Child process: its timers run while the server's loop is blocked.
  const port = Number(process.argv[3]);
  const r = http.get({ host: '127.0.0.1', port, path: '/?tag=B-queued', agent: false }, (res) => res.resume());
  r.on('error', () => {});
  setTimeout(() => { r.destroy(); process.exit(0); }, 300);
  return;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { signalFromNodeResponse } = require(
  path.join('A:/mointel/node_modules/next/dist/server/web/spec-extension/adapters/next-request.js'),
);
const BUILD_MS = 2000;
const results = [];
const busy = (ms) => { const end = Date.now() + ms; while (Date.now() < end) { /* sync build */ } };

const server = http.createServer(async (req, res) => {
  const tag = new URL(req.url, 'http://x').searchParams.get('tag');
  const signal = signalFromNodeResponse(res);
  const atEntry = signal.aborted;
  await new Promise((r) => setImmediate(r));
  const afterHop = signal.aborted;
  const built = !atEntry && !afterHop;
  if (built) busy(BUILD_MS);
  results.push({ tag, atEntry, afterHop, built, destroyedAtEnd: res.destroyed });
  if (!res.destroyed) res.end('ok');
});

server.listen(0, '127.0.0.1', async () => {
  const { port } = server.address();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { fork } = require('child_process');
  // A: a normal request whose build blocks the loop for 2 s.
  const a = new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port, path: '/?tag=A-build', agent: false }, (res) => {
      res.resume(); res.on('end', resolve);
    });
  });
  // Start B's client (in a child) 100 ms later, i.e. while A's build blocks us.
  setTimeout(() => fork(__filename, ['client', String(port)]), 50);
  await a;
  await new Promise((r) => setTimeout(r, 2500));
  console.log(JSON.stringify(results, null, 1));
  server.close();
  process.exit(0);
});
