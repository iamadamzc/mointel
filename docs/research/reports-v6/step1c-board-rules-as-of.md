# Reports v6, step 1c: can the board's Why and Risk rules run on the AS-OF dossier?

*Seat `local_5f4bfcf8`, 2026-10-02. Answers Design-tmi's ask in `docs/Design/report-b-spec.md` (`a6867865`): the report's tags are the board's own outputs, `resolveWhy` and `resolveRisk`, as shared code. Every `row.` field both functions read was listed from the production line (`2a625a5b`, `lib/dashboard/why.ts` and `risk.ts`), then traced to its source.*

## Every input, and whether a checkpoint has it

| Input | Read by | Source | As of the checkpoint? |
|---|---|---|---|
| `row.intelligenceState.status` | Why, Risk | the research status | **YES:** `desk_assessment_tickers.intelligence_status` (`db.ts:652`) |
| `row.intelligence.analysis.dossier` (catalyst; structure) | Why, Risk | the accepted dossier | **YES:** the version the checkpoint row names (`analysis_version_id`, `db.ts:654`), the same one `reportResearch` reads |
| `nowMs` (catalyst age, freshness) | Why (`why.ts:230`, `:326`, `:360`) | the wall clock | **YES, if passed** the checkpoint's `completedAt`; the default `Date.now()` must NOT be used |
| `row.catalystFreshFrom` | Why | `catalystFreshFromUtc(db, tradingDate)` (`readModel.ts:682`) | **YES:** recomputable for the report's trading date |
| `row.research` (`catalyst.gradeBucket`, `catalyst.latest`, `warning.current`, `structure.state`) | Why, Risk | **the OUTSIDE SHEET's research row** | **NO.** Live; no checkpoint column holds it (`db.ts:621-665`) |
| `row.comparison` (sheet vs desk disagreement) | Why (`why.ts:396`) | `SheetAutoComparison` (`merge.ts:157`, `:446`) | **NO.** Built from the live sheet |
| `row.displayedFloat` | Risk (`risk.ts:249`) | `resolveDisplayedFloat(research, researchRecord)` (`merge.ts:337`), from the sheet | **NO**, and see the conflict below |

## So, for the report

**The shared functions CAN run.** Build the row from the checkpoint and pass the checkpoint's time:

- status and dossier as of the checkpoint;
- `nowMs` = the checkpoint's `completedAt`;
- `catalystFreshFrom` for its date;
- the three SHEET inputs as **null** (`research`, `comparison`, `displayedFloat`).

**What that changes against the board, so the surface is told:**

1. **Grade letter.** The board prefers the sheet's grade bucket when it has one (`why.ts`, the `sheetGrade` branch). The report would show the DESK dossier's grade only. On a name the sheet grades differently, the report's letter can differ from the board's at the same moment.
2. **Headline.** The board prefers the sheet's latest line; the report uses the dossier summary.
3. **Disagreement marker.** The sheet-vs-desk disagreement cannot show in the report.
4. **Risk:**
   - DIRTY FLOAT from the SHEET (`research.structure.state`) cannot fire. DIRTY FLOAT from the DOSSIER (`structureClassification`) still does.
   - The sheet's warning sentence is not used; the dossier's structural warning is.

**The conflict to settle (Design and Marketing):**

- ~~`resolveRisk`'s DIRTY FLOAT branch prints a FLOAT NUMBER as its value.~~ **CORRECTED** (this seat, while building the adapter; the branch around the line was not opened when this was first written):
  - `` `${formatShares(row.displayedFloat)} float` `` (`risk.ts:249`) is the value of the **STRUCTURE_CLEAN ("NO FLAG FOUND")** branch, the last return of `resolveRisk`.
  - **The DIRTY FLOAT branch** prints the supply share count (`` `${formatShares(supplyShares)} sh supply` ``), never a float.
- The report's guardrail is float ONLY as a verdict, never a number (Marketing; Design's own spec drops the float tag).
- With `displayedFloat` passed as null, that value is null in the report, which is safe. **What actually differs from the board: a CLEAN name shows "NO FLAG FOUND" with no float figure in the report, where the board can show "{N} float".** The DIRTY FLOAT chip reads the same on both.
- Proposal: keep it null in reports. Design says whether the chip then needs different words.

**The alternative, not proposed:** freezing the sheet's research onto each checkpoint, so the report could match the board exactly. That is a store change, Ops's, a scope call for Integration.

## Build note (Research's side)

- **One adapter** builds the minimal row from checkpoint data and calls the board's functions unchanged.
- **A test** proves that on a name with no sheet row, the report's tag equals the board's tag for the same dossier and time.
- **A mutant** that passes `Date.now()` instead of the checkpoint time must fail a freshness-colour test.
