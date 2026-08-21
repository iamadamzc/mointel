/**
 * Replays company-source resolution at a chosen hosted-search context size.
 *
 * An evaluation harness, not part of the desk. It exists because
 * `search_context_size: "low"` is a cheaper product, not a smaller one, and the
 * only honest way to know whether it still finds an issuer's newsroom is to ask
 * it about issuers whose newsroom is already known.
 *
 * What it does NOT do is decide anything by inspection. Every candidate the
 * model returns goes through `resolveCompanySources` — the same function
 * production calls, including the fetch-and-classify step that has the final
 * say — against a throwaway database. Nothing here can touch the live store,
 * and the medium-context side is never re-run: that result is already recorded
 * and re-buying it would cost money to learn what is written down.
 *
 *   npx tsx scripts/resolver-context-replay.ts <cases.json> <out.jsonl> [low|medium|high]
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { loadWorkerEnv } from '../worker/env';
loadWorkerEnv();

import { openDatabase, type MarketDatabase } from '../lib/market/store/db';
import { upsertIssuer } from '../lib/market/store/researchRepo';
import { readResearchConfig } from '../lib/research/config';
import { resolveCompanySources, hasUsableSource } from '../lib/research/catalyst/irRegistry';
import { OpenAiCompanySourceResolver } from '../lib/research/catalyst/openaiDiscovery';
import { EMPTY_COMPANY_SOURCES } from '../lib/research/types';

interface Case {
  ticker: string;
  companyName: string | null;
  mediumShape: string | null;
  feedUrl: string | null;
  indexUrl: string | null;
  newsroomUrl: string | null;
  note: string | null;
  mediumAvgInput: number | null;
}

/** Where medium context ended up, as production recorded it. */
function mediumUrl(entry: Case): string | null {
  return entry.feedUrl ?? entry.indexUrl ?? entry.newsroomUrl ?? null;
}

const [, , casesPath, outPath, sizeArg = 'low'] = process.argv;
if (!casesPath || !outPath) {
  console.error('usage: resolver-context-replay.ts <cases.json> <out.jsonl> [low|medium|high]');
  process.exit(2);
}
if (sizeArg !== 'low' && sizeArg !== 'medium' && sizeArg !== 'high') {
  console.error(`unknown search context size: ${sizeArg}`);
  process.exit(2);
}

const config = readResearchConfig();
if (config.model.apiKey === null) {
  console.error('OPENAI_API_KEY not set; nothing to replay');
  process.exit(2);
}

const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8')) as Case[];
const resolver = new OpenAiCompanySourceResolver({
  config: config.model,
  searchContextSize: sizeArg,
  timeoutMs: 120_000,
});

const CONCURRENCY = 4;
const out = fs.createWriteStream(outPath, { flags: 'a' });
let done = 0;

/** One throwaway store per case, so nothing accumulates between them. */
function scratchDb(): { db: MarketDatabase; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-replay-'));
  return { db: openDatabase(path.join(dir, 'market.db')), dir };
}

async function replay(entry: Case) {
  const { db, dir } = scratchDb();
  const startedAt = Date.now();
  try {
    upsertIssuer(db, {
      ticker: entry.ticker,
      companyName: entry.companyName,
      cik: null,
      exchange: null,
      country: null,
      foreignIssuer: null,
      cikConfidence: 'NONE',
      mappingSource: null,
      irUrl: null,
      lastVerifiedAt: null,
      // Empty on purpose: a stored source would short-circuit the resolver and
      // the run would measure the cache rather than the model.
      companySources: { ...EMPTY_COMPANY_SOURCES },
    } as never);

    const result = await resolveCompanySources(db, resolver, {
      ticker: entry.ticker,
      companyName: entry.companyName,
      userAgent: config.sec.userAgent,
      now: new Date(),
      force: true,
    });

    const registry = result.registry;
    const lowUrl = registry.feedUrl ?? registry.pressReleaseIndexUrl ?? registry.newsroomUrl ?? null;
    const before = mediumUrl(entry);

    out.write(
      `${JSON.stringify({
        ticker: entry.ticker,
        companyName: entry.companyName,
        context: sizeArg,
        mediumShape: entry.mediumShape,
        mediumUrl: before,
        mediumAvgInput: entry.mediumAvgInput,
        lowShape: registry.sourceShape ?? null,
        lowUrl,
        // The deterministic verdict, from the same predicate the collector uses
        // to decide whether a stored source is worth reading.
        validatorAccepts: hasUsableSource(registry),
        sameLocation: before !== null && lowUrl !== null && before === lowUrl,
        note: registry.note ?? null,
        detail: result.detail,
        modelCalls: result.modelCalls,
        inputTokens: result.usage?.inputTokens ?? null,
        cachedInputTokens: result.usage?.cachedInputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        toolConfig: result.toolConfig ?? null,
        latencyMs: Date.now() - startedAt,
        error: null,
      })}\n`,
    );
  } catch (error) {
    out.write(
      `${JSON.stringify({
        ticker: entry.ticker,
        context: sizeArg,
        error: error instanceof Error ? `${error.name}: ${error.message}` : 'error',
        latencyMs: Date.now() - startedAt,
      })}\n`,
    );
  } finally {
    db.close();
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* windows may hold the handle */
    }
    done += 1;
    if (done % 5 === 0) console.log(`  ${done}/${cases.length}`);
  }
}

async function main() {
  console.log(`replaying ${cases.length} cases at search_context_size=${sizeArg}`);
  const queue = [...cases];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const entry = queue.shift();
      if (!entry) return;
      await replay(entry);
    }
  });
  await Promise.all(workers);
  out.end();
  console.log(`wrote ${outPath}`);
}

void main();
