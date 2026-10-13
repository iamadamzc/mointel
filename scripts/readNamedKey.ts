/**
 * Reads ONE API key from a key file laid out as a name line, then the key on the next non-blank line.
 *
 * Written after a 'names only' check printed two key values into a transcript (research.md error ledger,
 * 2026-10-12): that check assumed every other line was a name, and the file has blank lines. This reader
 * assumes nothing about the other lines. It returns the key into a variable and never prints, logs or
 * returns anything else from the file; its errors name the rule that failed, never a line's content or length.
 */
import fs from 'node:fs';

function normalise(line: string): string {
  return line.trim().toLowerCase().replace(/:$/, '').trim();
}

export function readNamedKey(filePath: string, name: string): string {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const wanted = normalise(name);
  const at = lines.flatMap((line, index) => (normalise(line) === wanted ? [index] : []));
  if (at.length !== 1) throw new Error(`key file: the name line matched ${at.length} times, expected exactly 1`);
  const next = lines.slice(at[0]! + 1).find((line) => line.trim() !== '');
  if (next === undefined) throw new Error('key file: no non-blank line after the name line');
  const key = next.trim();
  if (!key.startsWith('sk-ant-') || /\s/.test(key)) throw new Error('key file: the line after the name line is not shaped like a key');
  return key;
}
