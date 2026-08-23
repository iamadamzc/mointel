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

function run(): { status: number; output: string } {
  // The script narrates to stderr as well as stdout, and the fallback notice is
  // one of the stderr lines — so both streams are captured together.
  const command = `"${PUSH_RELEASE_SH.replace(/\\/g, '/')}" 10.0.0.1 /dev/null 2>&1`;

  try {
    const output = execFileSync('bash', ['-c', command], {
      env: { ...process.env, PATH: `${stubs}${path.delimiter}${process.env.PATH}` },
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
});
