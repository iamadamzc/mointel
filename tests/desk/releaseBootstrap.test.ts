import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * A safety check that cannot be installed is not a safety check.
 *
 * `preflight.sh` and `push-release.sh` arrived in the same commit, and the
 * release script ran the gate from `/opt/mointel/current` — the DEPLOYED tree.
 * So the first release carrying the gate could never install it: every attempt
 * died on `No such file or directory` and refused to ship, including the one
 * that would have put the file there. Production sat on a release that predated
 * the gate and no deployment could move it.
 *
 * These run the real script with `ssh` and `git` replaced by recorders, so the
 * branch is exercised rather than asserted about.
 */

const ROOT = process.cwd();
const PUSH_RELEASE_SH = path.join(ROOT, 'deploy', 'aws', 'push-release.sh');

let sandbox: string;
let stubs: string;
let log: string;

/**
 * A fake `ssh` whose behaviour depends on whether the deployed release is
 * pretending to have a preflight, plus a `git` that answers the two questions
 * the script asks before it ships anything.
 */
function writeStubs(options: { deployedHasPreflight: boolean; preflightExit: number }) {
  fs.writeFileSync(
    path.join(stubs, 'ssh'),
    `#!/usr/bin/env bash
# Everything after the host is the remote command.
remote="\${@: -1}"
echo "SSH \${remote}" >> "${log.replace(/\\/g, '/')}"

case "\$remote" in
  *"test -f /opt/mointel/current/deploy/aws/preflight.sh"*)
    exit ${options.deployedHasPreflight ? 0 : 1}
    ;;
  *"bash -s"*)
    # The streamed gate: consume it so the pipe closes, then answer.
    piped="\$(cat)"
    echo "STREAMED \${#piped} bytes" >> "${log.replace(/\\/g, '/')}"
    exit ${options.preflightExit}
    ;;
  *preflight.sh*)
    exit ${options.preflightExit}
    ;;
  *"systemd-run"*)
    # The deploy now runs detached on the box; the stub accepts the launch.
    echo "Running as unit: stub.service"
    exit 0
    ;;
  *"systemctl show"*"ActiveState"*)
    echo "inactive"
    ;;
  *"systemctl show"*"Result"*)
    printf 'success
0
'
    ;;
  *journalctl*)
    echo "[deploy] deployed abc1234def (stub journal)"
    ;;
  *)
    # Real ssh reads stdin, and one of these calls is the receiving end of
    # \`git archive | ssh ... tar -x\`. A stub that exits without draining wins
    # the race under load: the pipe closes before git writes, git takes
    # SIGPIPE, and \`set -o pipefail\` hands push-release.sh a 141 that \`set -e\`
    # turns into a dead script — with no \`||\` on that pipeline to catch it.
    # That was the flake, and it was in the stub, not in the script.
    cat > /dev/null 2>&1 || true
    exit 0
    ;;
esac
`,
    { encoding: 'utf8', mode: 0o755 },
  );

  // `push-release.sh` asks the platform before it will ship an artefact.
  // Stubbed so the guard is exercised on whatever host runs the suite.
  fs.writeFileSync(
    path.join(stubs, 'uname'),
    `#!/usr/bin/env bash
echo "\${FAKE_UNAME:-Linux}"
`,
    { encoding: 'utf8', mode: 0o755 },
  );

  fs.writeFileSync(
    path.join(stubs, 'git'),
    `#!/usr/bin/env bash
echo "GIT \$*" >> "${log.replace(/\\/g, '/')}"
case "\$1" in
  rev-parse)
    if [ "\$2" = "--short" ]; then echo "abc1234"; else echo "abc1234def"; fi
    ;;
  diff) exit 0 ;;
  show) echo "#!/usr/bin/env bash"; echo "exit 0" ;;
  archive) printf 'TARBYTES' ;;
  *) exit 0 ;;
esac
`,
    { encoding: 'utf8', mode: 0o755 },
  );
}

function run(extraEnv: Record<string, string> = {}): { status: number; output: string } {
  // The script narrates to stderr as well as stdout, and the fallback notice is
  // one of the stderr lines — so both streams are captured together.
  const command = `"${PUSH_RELEASE_SH.replace(/\\/g, '/')}" 10.0.0.1 /dev/null 2>&1`;

  try {
    const output = execFileSync('bash', ['-c', command], {
      env: {
        ...process.env,
        // The detached deploy is followed by polling; against the stub it is
        // answered on the first poll, so no real waiting is wanted.
        DEPLOY_POLL_SECONDS: '0',
        DEPLOY_FOLLOW_SECONDS: '5',
        ...extraEnv,
        PATH: `${stubs}${path.delimiter}${process.env.PATH}`,
      },
      encoding: 'utf8',
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return { status: failure.status ?? 1, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

function transcript(): string {
  return fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
}

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-bootstrap-'));
  stubs = path.join(sandbox, 'bin');
  log = path.join(sandbox, 'transcript');
  fs.mkdirSync(stubs, { recursive: true });
});

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

describe('release bootstrap', () => {
  it('runs the shipped gate when the deployed release has none', () => {
    writeStubs({ deployedHasPreflight: false, preflightExit: 0 });

    const result = run();

    expect(result.status).toBe(0);
    expect(result.output).toContain('carries no preflight');
    // The gate still ran on the server — streamed in, not skipped.
    expect(transcript()).toContain('bash -s');
    expect(transcript()).toContain('STREAMED');
    // And it read the gate out of the commit being shipped.
    expect(transcript()).toMatch(/GIT show .*:deploy\/aws\/preflight\.sh/);
  });

  it('still ships after the fallback gate passes', () => {
    writeStubs({ deployedHasPreflight: false, preflightExit: 0 });

    const result = run();

    // Asserted before the output: when the transfer pipeline dies, this is a
    // signal number and saying so beats "expected output to contain ...".
    expect(result.status).toBe(0);
    expect(result.output).toContain('is live on');
    expect(transcript()).toContain('GIT archive');
  });

  it('refuses when the fallback gate blocks, and ships nothing', () => {
    writeStubs({ deployedHasPreflight: false, preflightExit: 3 });

    const result = run();

    expect(result.status).toBe(3);
    expect(result.output).toContain('nothing was shipped');
    // No release directory was created and no tree was sent.
    expect(transcript()).not.toContain('GIT archive');
    expect(transcript()).not.toContain('install -d');
  });

  it('prefers the deployed release’s own gate when it has one', () => {
    writeStubs({ deployedHasPreflight: true, preflightExit: 0 });

    const result = run();

    expect(result.status).toBe(0);
    expect(result.output).not.toContain('carries no preflight');
    expect(transcript()).toContain('/opt/mointel/current/deploy/aws/preflight.sh');
    expect(transcript()).not.toContain('bash -s');
  });

  it('refuses when the deployed gate blocks', () => {
    writeStubs({ deployedHasPreflight: true, preflightExit: 3 });

    const result = run();

    expect(result.status).toBe(3);
    expect(result.output).toContain('nothing was shipped');
    expect(transcript()).not.toContain('GIT archive');
  });

  /**
   * The deploy's own build took the production box down on 2026-08-27. A
   * release can now carry a `.next` built elsewhere so the server skips its
   * build — but a Windows-built artefact on a Linux server is an untested
   * path, and trading a known capacity problem for an unknown correctness one
   * is not an improvement. The guard refuses by default and says why.
   */
  it('refuses to ship an artefact built on a platform it cannot vouch for', () => {
    writeStubs({ deployedHasPreflight: true, preflightExit: 0 });
    const artefact = path.join(sandbox, '.next');
    fs.mkdirSync(artefact, { recursive: true });

    const result = run({ ARTIFACT_NEXT: artefact, FAKE_UNAME: 'Darwin' });

    expect(result.status).toBe(5);
    expect(result.output).toContain('REFUSING');
    // It names the way forward rather than only the refusal.
    expect(result.output).toContain('ARTIFACT_PLATFORM_OK');
    // Nothing was shipped: no tar of the artefact reached the server.
    expect(transcript()).not.toContain('.next');
  });

  it('ships the artefact once the platform equivalence is asserted', () => {
    writeStubs({ deployedHasPreflight: true, preflightExit: 0 });
    const artefact = path.join(sandbox, '.next');
    fs.mkdirSync(artefact, { recursive: true });

    const result = run({
      ARTIFACT_NEXT: artefact,
      ARTIFACT_PLATFORM_OK: 'yes',
      FAKE_UNAME: 'Darwin',
    });

    expect(result.status).toBe(0);
    expect(result.output).toContain('shipping prebuilt artefact');
    expect(transcript()).toContain('.next');
  });

  it('says plainly when no artefact is supplied, so the capped build is expected', () => {
    writeStubs({ deployedHasPreflight: true, preflightExit: 0 });

    const result = run();

    expect(result.status).toBe(0);
    expect(result.output).toContain('no prebuilt artefact');
  });

  it('refuses an ARTIFACT_NEXT that does not exist rather than shipping nothing quietly', () => {
    writeStubs({ deployedHasPreflight: true, preflightExit: 0 });

    const result = run({ ARTIFACT_NEXT: path.join(sandbox, 'absent'), ARTIFACT_PLATFORM_OK: 'yes' });

    expect(result.status).toBe(4);
    expect(result.output).toContain('is not a directory');
  });
});
