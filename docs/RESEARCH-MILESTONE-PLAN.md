# Automatic Public Intelligence Research — build plan

Working plan for the milestone specified in `prompt3.md`. Kept in the repo so an
interrupted session can resume without re-deriving the sequence.

Spec is authoritative. Where this plan and `prompt3.md` disagree, the spec wins.

---

## Ground rules carried from the spec

- Do not redesign the Demand Engine, change the Daily RVOL definition, replace
  Alpaca, or remove Google Sheets.
- One persistence system. Extend `lib/market/store/db.ts`; do not add a database.
- Facts come from deterministic parsing; AI only interprets. Never fabricate a
  classification to fill a gap — `UNKNOWN`/`PARTIAL` with provenance instead.
- Shares outstanding is not float. Market cap is not float. Unknown float stays
  unknown.
- Credentials stay worker-side. `tests/security.test.ts` already enforces the
  equivalent rule for Alpaca; extend it to cover the SEC and model keys.

## Phase gates

Each phase ends green (`npm test`, `npm run lint`, `npm run typecheck`) before the
next begins. Phases 1–4 need no model key.

| # | Phase | Depends on model key | DoD items |
|---|-------|----------------------|-----------|
| 1 | SQLite schema v3 + repo layer | no | 17 |
| 2 | SEC collector: CIK map, submissions, rate limiter, cache | no | 4–7 |
| 3 | Research queue + worker + job states + health | no | 1–3, 23 |
| 4 | Supply ledger + deterministic extraction | no | 8 |
| 5 | Interpreter abstraction + structured outputs | yes | 10–15 |
| 6 | State merge (SHEET/AUTO/CONFLICT) + UI + drawer evidence | partial | 16, 20–22 |
| 7 | Diagnostics, docs, full test sweep, security audit | no | 24–29 |

### Phase 1 — schema
`research_jobs`, `issuer_registry`, `research_sources`, `research_dossiers`,
`research_analysis_versions`. Bump `SCHEMA_VERSION` 2 → 3 with a migration that
leaves existing market tables untouched. Source rows dedupe on content hash;
dossiers version rather than overwrite (`supersedes` chain), because the eventual
goal is `ticker → structure → live behavior → outcome`.

### Phase 2 — SEC
Global limiter shared across jobs, default 5 req/s, well under SEC's published 10.
Missing `SEC_USER_AGENT` disables fetching with a diagnostic — never an anonymous
request. Bounded exponential backoff on 403/429. Fetch only what an active job
needs; no indiscriminate EDGAR crawl.

Verified working 2026-08-17 against `company_tickers_exchange.json` (10,398 rows)
and the submissions API.

**Implementation note.** A bare email in the User-Agent is rejected by .NET's
header validator (`Invoke-WebRequest` needs `-SkipHeaderValidation`). Node's
fetch/undici accepts it, but pin this with a test so the header format is not
"fixed" later by someone hitting the PowerShell error.

**Foreign issuers are not the edge case.** KMDA → CIK 0001567529, country `L3`,
latest filing a 6-K. Form selection must handle 6-K/20-F/40-F from the start, not
as a follow-up.

### Phase 3 — queue
Soft priority score, never a hard filter: every eligible Top-`RESEARCH_AUTO_RANK`
name is queued, ordering only decides who goes first. Bounded concurrency
(default 2). A ticker dropping out of the Top 12 must not cancel useful in-flight
work. Worker survives dashboard reloads; research is never initiated from React.

### Phase 5 — interpreter
`ResearchInterpreter` interface with `OpenAIResearchInterpreter` and
`NoopResearchInterpreter`. Strict JSON Schema; no prose parsing. Model name comes
from `OPENAI_RESEARCH_MODEL`, referenced in exactly one place. Material
conclusions carry source IDs or get downgraded. Evidence fingerprint gates every
model call, so a dashboard refresh never triggers reanalysis.

**Preflight verified 2026-08-17** against the configured account. Responses API,
the built-in `web_search` tool, strict `json_schema` output, and both combined all
return `completed` with `store: false`. Given no sources, the model returned
`catalystStatus: UNKNOWN` with an empty evidence array rather than inventing one —
the behavior the spec requires, though the code must still enforce it rather than
trust it.

**Cost shape measured, not estimated.** A bare web-search call cost ~18.4k input
tokens; the same call constrained by a schema cost ~4.5k. Schema-constrained
prompts are materially cheaper here, which supports the spec's instruction to send
compact deterministic evidence bundles rather than raw filings. Budget
`CATALYST_REFRESH_MINUTES` against this: 12 active names refreshing every 10
minutes is ~72 web-search calls/hour.

**Model tiering.** Default is `gpt-5.6-terra`, set 2026-08-17. All three tiers were
verified against the account with `web_search` + strict schema before being
written into config.

| Tier | Env var | Role |
|------|---------|------|
| Terra | `OPENAI_RESEARCH_MODEL` | default full research / interpretation |
| Sol | `OPENAI_ESCALATION_MODEL` | selective: difficult or SHEET/AUTO-conflicting dossiers |
| Luna | `OPENAI_CHANGE_DETECT_MODEL` | low-cost evidence-change detection only |

Only the interpreter factory reads these. No model string appears anywhere else,
and the tier overrides fall back to `OPENAI_RESEARCH_MODEL` when unset, so Sol and
Luna are an optimisation the system never depends on. `ResearchInterpreter` stays
model-agnostic: selecting a tier is a call-site decision, not a new interface.

### Catalyst refresh must be cheap-first

`CATALYST_REFRESH_MINUTES` drives a refresh cycle that is **evidence-gated, not
time-gated**. The order is fixed and each step may exit before the next:

1. Deterministic, zero-cost: has the SEC accession set, source content-hash set, or
   issuer-release set changed? This is plain comparison — no model, no web search.
2. Only if step 1 is inconclusive, the Luna tier may run a bounded change check.
3. Only if evidence actually changed does interpretation run, on Terra or Sol.

A refresh interval elapsing is **not** grounds for a web-search or model call. If
the evidence fingerprint is unchanged, the cycle exits at step 1 having spent
nothing, and the existing dossier stands. This is the same analyze-once rule the
spec applies to dashboard refreshes, extended to the timer.

Tests must cover the negative case directly: an elapsed refresh interval with
unchanged evidence performs zero model calls and zero web searches.

### Phase 6 — merge
Sheet stays the human-reviewed baseline and is never written to. Provenance is
explicit: `SHEET`, `AUTO`, `SHEET + AUTO`, `CONFLICT`. Material new evidence shows
`REASSESSMENT PENDING` rather than silently replacing a Sheet verdict.

## Live acceptance

Run against the live premarket/RTH session with the Alpaca worker and Sheet
provider active. For each name record: discovered → queued → collection start →
SEC match → filings found → catalyst sources → interpretation start → complete,
plus total latency and the three classifications.

Names like GRNQ (wide spread, low absolute volume) must still be researched, and
their market-quality weakness must survive into the output — abnormal RVOL is not
trade quality. The acceptance tickers in the spec are examples; nothing about them
gets hardcoded.

## Not in this milestone

Overhang absorption, effective float turnover, dirty→clean transition, live chop
and flush models, any buy/sell advice, execution, broker, billing, accounts.
