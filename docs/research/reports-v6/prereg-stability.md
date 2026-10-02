# Reports v6 step 2: the checker's model-half stability probe (P2). PRE-REGISTERED before any model call

*Seat `local_5f4bfcf8`, 2026-10-02.*

**This is the probe ALREADY APPROVED as P2** in `docs/research/session-reports/design.md:92-98` (proposal `dae74ab4`). Approved by Integration's order calls on 2026-09-30, relayed in `77a4ba59` at 23:24:52Z:

- P2's probe comes first, then P1 as prompt v4 only if it reduces splits without admitting a defect.
- The probe's registration defines "reduces splits" and "admits a defect" BEFORE any call.
- Majority-of-3 at runtime: REJECTED.

**Spend:** inside his "3 yes", verified by the previous seat at his turn (`907420a6`, 2026-09-27T23:13:38.717Z, "3 yes" answering "3. Approve the build?" for session reports). **CAP $10 for the probe; this harness stops itself before any call that would start at or above $9.50.** Anything above goes to him.

*A first draft of this file (never committed, never run) measured the current prompt alone and offered majority-of-3. It was written without opening `dae74ab4`. Logged in the error ledger; replaced before any call.*

## Arms

- **CURRENT:** the production checker exactly (`lib/desk/reports/check.ts`, system text `CHECKER_SYSTEM_V5`, `REPORT_CHECKER_PROMPT_VERSION_V5 = 3`, last change `8c52506d`; identical on the production line `2a625a5b`).
- **P1:** the same call, with P1's two sentences, verbatim from `design.md:94`, appended to the system text by wrapping the model's `complete({ system, user })` (`check.ts:433`, `:476`). No production file changes.
  - (a) "A catalyst status is the desk's own verdict on freshness under its rules; do not re-judge freshness from the dates in the research. A line matching its status's supported wording is supported even when the research names an older dated event."
  - (b) "A null `sharesOutstanding` supports 'no share count is on file' (or 'no dated share count'); it never supports a number."
- **Same model, same inputs** (`readReportInputs` on `data/market-prod-2026-09-29.db`, range $1 to $20), a fresh model object per call, as the pass-bar harness does.

## Material

Both sets' sha256 are checked before any call:

| Set | sha256 | Day | Controls | Class-4 drafts |
|---|---|---|---|---|
| `defect-set-v5r3.md` | `42818555...` | 2026-09-23 | 480-C, 490-C, 493-C, 494-C | 494-04 ("dropped off the board" while #6 and present) |
| `defect-set-v5r4b.md` | `240e2f3a...` | 2026-09-21 | 442-C, 452-C, 455-C, 456-C | 456-04 ("dropped off the board" while ranked #5) |

**The two named split lines:** 480-C S1L1 (WHLR "no fresh catalyst" under SECONDARY_STALE) and 493-C S1L1 (ARTL "no share count is on file" with `sharesOutstanding` null).

## Design

- **N = 10 per draft per arm:** 10 drafts, 200 calls, about $8.50 at run 4's $0.0425 per call.
- **Arms ALTERNATE call by call within each draft**, so a cap stop leaves both arms equally covered.
- **Raw output and summary are committed BEFORE they are read.**
- **Strikes are split by their own field `by`** (`check.ts:57-60`): `model` strikes are the measure; `rule` strikes are deterministic, identical in both arms, and listed.

## Definitions, fixed now

- **A split:** a line whose MODEL verdict over its 10 runs in one arm is neither 0/10 nor 10/10.
- **A false strike:** any model strike on a CONTROL line (every control line is true).
- **P1 REDUCES SPLITS** if BOTH hold:
  - (i) the two named lines are struck 0/10 under P1;
  - (ii) P1's total false strikes on control lines are no more than CURRENT's.
  - If CURRENT also shows 0 false strikes everywhere, (ii) holds with no measured benefit, and the result says exactly that.
- **P1 ADMITS A DEFECT** if a class-4 keyed line is struck by P1 in fewer of its 10 runs than by CURRENT, or fewer than 10/10 where CURRENT is 10/10. Rule strikes count toward "struck" in both arms alike.
- **Decision, as approved:**
  - P1 becomes prompt v4 ONLY IF it reduces splits AND admits no defect.
  - Otherwise CURRENT stays, and the measured rates travel to v6's registration.

## Not in this probe

**The checker-input trim** (his "a, keep them running", 01:27:53Z). Integration's condition: the probe's arms include the trimmed input, "or the trim gets its own measurement first". The trim is not designed yet, so it **gets its own measurement**, registered separately, before v6's re-freeze.

## What this does not show

- Defect detection beyond class 4 (the pass bar's job).
- Live drafts.
- v6's new text.
- One author's drafts over two days.
