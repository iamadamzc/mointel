/**
 * THE BOARD RENDERS TO OUTSIDERS, SO WHAT IT READS IS A DISCLOSURE DECISION.
 *
 * `app/page.tsx` and `app/review/[token]/page.tsx` mount the SAME
 * `DashboardShell`. That is deliberate and good — a reviewer sees what he sees,
 * so nobody has to keep two boards in step. It also means every component
 * reachable from the shell renders to whoever holds a review token, and he is
 * about to hand those to test users.
 *
 * SO THIS GUARD EXISTS BEFORE THE THING IT GUARDS. There is no leak today.
 * The session-report panel is the first feature that would plausibly want his
 * execution, and the shape of the mistake is already known:
 *
 *     his fills live at ~/.mointel-fills/fills.db, on HIS machine
 *     a DERIVED BOOLEAN LEAKS THE NUMBER IT CAME FROM -- "red stop: touched"
 *     is a boolean that says his P&L reached -$20
 *
 * The rule a schema can carry is "no persisted column holds a fill-derived
 * value". That protects the ARTEFACT. A review link is a live render of the same
 * surface to a stranger, so the rule the SCREEN needs is one level up: does any
 * value the board renders derive from his fills or his balance, in any session
 * type, including a review token.
 */
import { describe, expect, it } from 'vitest';

describe('nothing the board renders can reach his execution', () => {
  it('no board-reachable file imports the fills store', async () => {
    /*
     * Import-level rather than value-level, deliberately. A value-level check
     * would have to know which fields are fill-derived, and the whole lesson of
     * the derived boolean is that the list is longer than it looks. An import is
     * the narrow waist: his execution cannot reach the screen without one.
     */
    const fs = await import('node:fs');
    const path = await import('node:path');

    const walk = (dir: string): string[] => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return /\.tsx?$/.test(entry.name) ? [full] : [];
      });
    };

    const files = [...walk('components'), ...walk('app'), ...walk('lib/hooks')];
    expect(files.length).toBeGreaterThan(20);

    const offenders = files.filter((file) =>
      /from\s+['"][^'"]*coaching\/fills/.test(fs.readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('proves the scan can see an offender, or it certifies everything', async () => {
    // A guard that cannot fail is the defect this desk keeps finding. The
    // pattern, against the import a violation would actually write.
    const PATTERN = /from\s+['"][^'"]*coaching\/fills/;
    expect(PATTERN.test("import { openFills } from '@/lib/coaching/fills/store';")).toBe(true);
    expect(PATTERN.test("import { x } from '../../lib/coaching/fills/store';")).toBe(true);
    expect(PATTERN.test("import { resolveRisk } from '@/lib/dashboard/risk';")).toBe(false);
  });

  it('states the premise it rests on: one shell, two mounts', async () => {
    /*
     * If review ever gets its own shell, this guard's REASON changes even though
     * its result would not. Asserting the premise means the next reader finds
     * out here rather than concluding the rule was always about hygiene.
     */
    const fs = await import('node:fs');
    const desk = fs.existsSync('app/desk/page.tsx') ? 'app/desk/page.tsx' : 'app/page.tsx';
    const review = 'app/review/[token]/page.tsx';

    expect(fs.readFileSync(desk, 'utf8')).toContain('DashboardShell');
    expect(fs.readFileSync(review, 'utf8')).toContain('DashboardShell');
  });
});
