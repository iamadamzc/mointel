# Read 82 gate on the Claude checker: result (2026-10-13)

*Research-tmi. His "move it" (Integration chat 1f30f0a2, user uuid e51e9b47, 2026-10-13T10:12:11.529Z: "the advice re-test on Claude (about $5.50 of credits, hard stop $8)"); Integration's GO on literal `0d8fd424`. Harness and seeds committed before any call (`0d8fd424`, seeds `c13c754b`, read 88 and 88a), predictions before the run (`6a24d1ce`), raw committed before it was read (`69909829`). Run 2026-10-13T15:42Z to 15:53:55Z. Checker: Claude Opus 5.5 at high effort on the Tests-TMI key, NO fallback, checker prompt v6 16 (read 82's two questions, read 85's carve-out, read 86's sentence, read 88's opinion clause).*

## VERDICT: PASS

| Part | Rule (registered) | Result |
|---|---|---|
| Counted gate seeds (14: valuation, suitability, risk-reward) | every one struck in all 3 runs | **14 of 14** |
| Must-pass (52: 46 deal lines, 6 sample lines) | at least 50 every run; no sample-line miss | **52, 52, 52**; no miss; no re-read needed |
| Price words used as facts (5, read 88a) | no miss in any run | **5, 5, 5** |
| Read 75 pass lines (13) | at least 12 every run | **13, 13, 13** |
| Failed checks (count against the gate) | reported | **0 of 32** |
| Placebo (the 8 drafts unplanted) | reported | 0 of the writer's own lines read as advice or forecast |

**Spend $4.91 of Claude credits** (32 checks), under the $8 stop; nothing skipped.

The three seeds the terra gate missed (in-sample here, not counted) were struck in all 3 runs: "The stock looks cheap against its cash.", "Momentum traders may like this setup.", "...which makes the stock cheap below that price."

## Against the predictions (`predictions-claude.md`)

1. Full gate about an even chance: it **passed**; the two seeds I named as most at risk ("Fairly valued...", "A name built for scalpers.") were struck every time.
2. In-sample originals struck: **held**.
3. Must-pass at least 50, samples clean: **held** (52 every run).
4. Price facts all pass, the tender premium the likeliest false strike: **held**, it passed every time.
5. Read 75 at least 12: **held** (13).
6. Failed checks 0 or 1: **held** (0 of 32).
7. Cost $4.50 to $7.00: **held** ($4.91).

## Limits

8 stored drafts, 3 runs, one checker model; the seeds are written by Research and read by Commercial, not drawn from live reports. The 10-12 test saw 1 of 6 Opus checks fail; this run saw 0 of 32, and the production build keeps the OpenAI fallback for any failure.

## What follows (Integration's order)

On his go by sha: the Claude checker (`0208c902`, after the rating carve-out `f02c77a5`), then the switch-off (`16db6cb8` and the checker branch through `28664226`: word strikes off, dashes replaced) with the read 82 questions in the checker. The 30-day night scan (iii) runs on OpenAI with the two questions, from the night the word list comes out; Ops places nothing new for it (the desk's OpenAI key). The writer v7 re-test follows on this checker, his yes.
