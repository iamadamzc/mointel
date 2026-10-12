# Writer v7: the draft and the test plan (2026-10-12)

*Research-tmi, 2026-10-12 (UTC date). Draft only: no model call has run, nothing is wired, nothing ships. Branch `research/writer-v7-on-2fa909bf` (on 51da1b30 + 2fa909bf). The checker is unchanged.*

## His direction

- "the prompt should include the character of the voice we want, which is a financial news tv desk reporter." (Marketing chat e89d9590, uuid 80ad319c, 2026-10-12T23:15:03.070Z, verified)
- "no. dont give it structure so rigidly. say what all must be included, but tell it to do it in a human style in the voice described. instruct it to not be robotic, but to be coherent." (same chat, uuid 2a33f9e0, 2026-10-12T23:24:38.673Z, verified)

The character paragraph is Marketing's (`docs/marketing/voice-tv-desk-2026-10-12.md` at 0fad1663, Commercial read 79).

## What the draft is (`lib/desk/reports/writerV7.ts`)

- **One short system prompt** (`SYSTEM_V7`): the character, what the Summary and each name line must include, the truth rules once, the reply shape. 4,622 characters against v6's 8,477 (831 words against 1,483), measured on the constants.
- **Facts, not words.** v6 handed the model a fixed phrase per news state for every name (`writerV6.ts:98-104`, "fresh news found in our sources"). v7's sheets give each name's news STATE; the three ruled state phrases ("Not researched at this checkpoint", "no catalyst found in our sources", "our research reached no conclusion") appear once, in the system prompt.
- **No figure in a name line while the card prints one.** The name sheet gives the move as words computed from the card's own figures (`cardMoveWords`, the same rounding as `sessionReports.ts` pathView): up, down or little changed; "off the high" at 1.0 percent under or more, "at the high" at 0.0, otherwise nothing about the high. With no card path, the price and the framed change are given, as in v6.
- **No clock time.** The sheets give event and source dates, not times; the kind frames carry no time.
- The reply shape and parser are v6's (`parseDraftV6`).

Tests `tests/desk/reportWriterV7.test.ts`, 14 (v6's 9 still pass). Five controls, each made the named test fail, bytes restored (`scripts/writer-v7-controls.py`). tsc 0 with a planted-error control, eslint 0.

## Commercial read 79's four rules: checker today, or prompt only

| Rule | Checker today (at 2fa909bf) | Prompt carries it |
|---|---|---|
| 1. Coherence within a line; a name line never refers to another name | By rule, in part: a line opening "It", "Also", "The same" and the like is struck (check.ts:197, :586), and so is a line naming another ticker in the report (:587-588) | The coherence itself, and the opening list (a test ties the prompt's list to the checker's) |
| 2. Move and news in separate clauses, never joined by "after", "following", "on", "as", "amid" and the like | By rule in the SUMMARY only (CAUSAL, :356-411, via narrativeFindings :465); "as", "sparked", "triggered", "fueled" are not in the rule at all. Name lines: only the model checker's general support read | Everywhere (a test ties the prompt's list to every word of CAUSAL) |
| 3. Move words only up, down, higher, lower, little changed | Not checked anywhere; the rule's MOVE pattern even reads "jumped" and "surged" as moves | Only the prompt |
| 4. The ruled state phrases exactly | In part: a bare "no catalyst" is struck (:171); the model checker holds UNKNOWN to "no conclusion" (:692). "Not researched at this checkpoint" is not checked | Only the prompt, for exactness |

## Three points for Commercial's read of the text

1. A name with no card path may still state its price and change (v6's rule); the voice's "never a price" assumes the card prints one. Keep, or drop?
2. The recap sheet no longer gives "of those, the desk covers" (coveredMovers); Marketing's must-include list does not name it. Keep it out?
3. When the price is under the high by less than 1.0 percent, the sheet says "say nothing about the high". Is that the right reading of "only as the card shows"?

## The test plan (needs his yes on spend before any run)

- **Inputs:** the same 12 stored inputs as the 10-12 reports test (store copy of 2026-10-07; 10-02, 10-05, 10-06; four kinds each), built at 2fa909bf so the deal-word and fresh-count fixes are in both arms.
- **Arms:** v6 and v7 prompts, each with the current writer (luna) and Claude Opus 5.5 at high effort: 4 arms, 48 reports a round. Checker: terra, unchanged, for every arm.
- **Measured, per arm:** lines struck and Summary struck, by reason and by rule or model; number errors (NUMBER_NOT_IN_ROW, NUMBER_WITHOUT_ROW); and the voice by program: the most repeated phrase across a report's lines, ruled state phrases used exactly, any figure in a name line that has a card path, any clock time.
- **Blind pairs for him: 10, v6 against v7, same input and same model**, 5 per model, all four kinds. Position BALANCED BY DESIGN: v7 is A in exactly 5 of 10, the assignment drawn from a seed committed before the run. The key is a separate file. (The 10-12 read's hash put luna in A in 7 of 8, `75134a17`.)
- **Predictions committed before the run**, and the harness committed before any call, as on 10-12.
- **Cost, estimate from the 10-12 run's measured costs** (luna arm $0.045 a report, Opus arm $0.168 a report, each with terra checking): about $5 a round (luna arms about $1.10; Opus arms about $4.00, of which about $3 is Claude on the Tests-TMI key and the rest terra checks on the desk's OpenAI key). v7's shorter prompt may lower this a little; its output length is not measured. Stop at $7.
- **Not in this round:** wiring v7 into the pipeline. That follows his read of the pairs and his go by sha.
