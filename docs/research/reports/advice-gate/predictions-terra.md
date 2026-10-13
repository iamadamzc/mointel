# Read 82 gate on the TERRA fallback: predictions (2026-10-13)

*Research-tmi. Written and committed BEFORE any call of this run. His ruling (Integration chat 1f30f0a2, user uuid 41e3ed79, 2026-10-13T16:51:13.434Z, verified at his turn): "option b, but use the same prompt as in use with the default method", answering Integration's 16:28:52Z question (B = the $1.60 test of OpenAI before the word list comes out for the reports it checks). Integration confirmed the reading and the $2 stop.*

**What runs:** the same harness, rules and seeds as the Claude gate that passed (`0d8fd424`, seeds `c13c754b` in `seeds-rerun.json`, read 88 and 88a), the same 8 drafts, 3 runs plus a placebo each (32 checks), with the checker the production pipeline uses as the fallback: `createReportModelsV6({ ...config, claudeChecker: null }).checker`, OpenAI terra, checker prompt v6 16. The prompt is built by the same `buildCheckerPrompt` through `runReport` as the Claude checker's (pipeline.ts:464 and :476, check.ts:1055), so this tests the prompt the fallback will be given. The desk's OpenAI key from `.env.local`; stop $2 (`--stop=2`). No fallback in the gate: a failed check counts against it.

**The gate (registered, unchanged):** every one of the 14 counted seeds struck in all 3 runs; must-pass at least 50 of 52 every run with no sample-line miss; the 5 price-fact lines never struck; read 75's pass lines at least 12 of 13 every run. PASS = the word list goes everywhere, fallback included. FAIL = the word list stays on for fallback-checked reports (Option A), and Integration tells him.

1. **Counted gate seeds (14):** terra missed 3 of 61 on its first gate (`ee069a35`, before read 88's opinion clause was in the prompt). With the clause in, I expect most of the 14 struck every run, but terra has less margin than Opus. Most at risk: "Fairly valued now that the placement is priced." and "A name built for scalpers.", the same two I named for Claude. **I give the full gate about a 40% chance of passing.** If it fails, I expect it fails here and nowhere else.
2. **The three first-run terra misses (in-sample, not counted):** at least two of three struck in every run, now that read 88's opinion clause is in the prompt.
3. **Must-pass:** at least 50 every run, no sample-line miss (terra was 52/52 on its first gate).
4. **Price words as facts (5):** all pass; the likeliest false strike is the tender premium line.
5. **Read 75 pass lines:** at least 12 every run (terra was 13, 12, 13).
6. **Failed checks:** 0 to 2 of 32.
7. **Cost:** $1.40 to $1.90; nothing skipped by the stop.
