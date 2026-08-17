/**
 * Worker environment bootstrap.
 *
 * Next.js loads .env.local automatically; a standalone worker does not, so
 * every worker entry point imports this first. Nothing here prints or persists
 * a value — only variable names are ever surfaced.
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

let loaded = false;

export function loadWorkerEnv(rootDir: string = process.cwd()): void {
  if (loaded) return;
  loaded = true;

  for (const file of ['.env.local', '.env']) {
    const full = path.join(rootDir, file);
    if (fs.existsSync(full)) dotenv.config({ path: full, override: false, quiet: true });
  }
}
