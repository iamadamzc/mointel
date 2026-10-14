/**
 * Proof of readNamedKey on FAKE files only (no real key file is opened here). Prints pass/fail per case,
 * never a key. Run: node --import tsx scripts/readNamedKey.proof.ts <scratch-dir>
 */
import fs from 'node:fs';
import path from 'node:path';

import { readNamedKey } from './readNamedKey';

const dir = process.argv[2];
if (!dir) throw new Error('usage: readNamedKey.proof.ts <scratch-dir>');
fs.mkdirSync(dir, { recursive: true });

const WANT = 'sk-ant-fake-TESTS-0000000000';
const cases: Array<{ name: string; body: string; expect: 'key' | 'throw' }> = [
  // The real file's known shape: names with blank lines between, four keys.
  { name: 'blank lines, CRLF, four names', body: ['Research', '', 'sk-ant-fake-RESEARCH-1', '', 'Reports', 'sk-ant-fake-REPORTS-2', '', '', 'Themes/Tags', '', 'sk-ant-fake-THEMES-3', '', 'Tests-TMI', '', '', WANT, ''].join('\r\n'), expect: 'key' },
  { name: 'name with a colon, LF', body: ['tests-tmi:', WANT].join('\n'), expect: 'key' },
  { name: 'name absent', body: ['Research', 'sk-ant-fake-RESEARCH-1'].join('\n'), expect: 'throw' },
  { name: 'name twice', body: ['tests-tmi', WANT, 'tests-tmi', WANT].join('\n'), expect: 'throw' },
  { name: 'name is the last line', body: ['Research', 'sk-ant-fake-RESEARCH-1', 'tests-tmi', '', ''].join('\n'), expect: 'throw' },
  { name: 'next non-blank line is another name', body: ['tests-tmi', '', 'Research', 'sk-ant-fake-RESEARCH-1'].join('\n'), expect: 'throw' },
  { name: 'a key line mentioning the name does not match', body: ['sk-ant-fake-tests-tmi', 'tests-tmi', WANT].join('\n'), expect: 'key' },
];

let failed = 0;
for (const c of cases) {
  const file = path.join(dir, 'fake-keys.txt');
  fs.writeFileSync(file, c.body);
  let outcome: string;
  try {
    const key = readNamedKey(file, 'tests-tmi');
    outcome = c.expect === 'key' && key === WANT ? 'PASS (returned the expected fake key)' : 'FAIL (returned a different value)';
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // A thrown message is printed: it is built from counts and rules only, and the files are fake.
    outcome = c.expect === 'throw' ? `PASS (threw: ${message})` : `FAIL (threw: ${message})`;
  }
  if (outcome.startsWith('FAIL')) failed++;
  console.log(`${c.name}: ${outcome}`);
}
fs.rmSync(path.join(dir, 'fake-keys.txt'));
console.log(failed === 0 ? `ALL ${cases.length} CASES PASS` : `${failed} OF ${cases.length} CASES FAIL`);
process.exit(failed === 0 ? 0 : 1);
