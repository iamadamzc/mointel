# Sheet removal, step 2: RESULT, as pre-registered

*Research seat `local_98e3e9a1`, 2026-10-03. Pre-registration `prereg-omit-prior.md` (`4a0f65c1`); his yes for the scratch copy and the $15 cap, this seat's chat, 2026-10-03. Harness `a1a8ac66` (the code that ran; the raw header's `head` 789e7e98 predates its `--env-dir` fix, ERROR LEDGER). Raw output `100a92a4`, committed before it was read. Analysis script committed before the run (`789e7e98`).*

## The sample was 3 names, and that is the first finding

- The Sheet, as loaded at run time, returned **4 priors**, with no load error. The desk reads only the Sheet's TODAY rows (the plan, `docs/sheet-removal-plan-2026-10-03.md`, row 2), so on any day the prior reaches only that day's handful of names. The store keeps no Sheet history to sample earlier days from.
- 3 of the 4 are ranked on 2026-10-02 with stored sources: **NAUT, RETO, VEEA.** By the registration ("fewer than 20 with priors means all of them, with the count reported") the run is 3 tickers x 4 arms = 12 interpretations.
- Store: scratch copy of the 10-02 snapshot, sha256 `9f0efa03...` (verified on the copy). Models: research `gpt-5.6-terra`, escalation `gpt-5.6-sol`. **Spent $1.68** (conservative pricing; cap $15).

## Disagreement rates (pairs compared: 3 per noise pair, 12 cross)

| Field | WITH-1 vs WITH-2 | WITHOUT-1 vs WITHOUT-2 | WITH vs WITHOUT (pooled) | Flagged |
|---|---|---|---|---|
| outcome | 2/3 | 1/3 | 4/12 | no |
| catalyst status | 0/3 | 0/3 | 0/12 | no |
| catalyst grade | 0/3 | 0/3 | 0/12 | no |
| catalyst type | 1/3 | 0/3 | 2/12 | no |
| plausibly explains move | 1/3 | 1/3 | 4/12 | no |
| structure classification | 2/3 | 1/3 | 6/12 | no |
| shares outstanding (and date) | 0/3 | 0/3 | 0/12 | no |
| cycle classification | 1/3 | 1/3 | 2/12 | no |
| escalated | 2/3 | 0/3 | 4/12 | no |
| board Why chip (code) | 1/3 | 0/3 | 2/12 | no |
| board Why chip (grade) | 0/3 | 0/3 | 0/12 | no |
| board Risk chip (label) | 2/3 | 1/3 | 8/12 | no |

Escalations per arm: WITH-1 2, WITHOUT-1 2, WITH-2 0, WITHOUT-2 2.

**No field is flagged** (the registered rule: the pooled cross rate above BOTH noise rates). The board Risk chip comes closest: 8/12 across arms, against 2/3 and 1/3 within them.

## What this can and cannot say

- **Can:** on these 3 names, withholding the Sheet's human analysis changed no catalyst status, catalyst grade, share count or Why grade in any of 12 interpretations. The fields that moved (structure, Risk chip, escalation, outcome) moved as much between two runs of the SAME arm.
- **Cannot:** with 3 names, every noise rate is 0, 1/3 or 2/3, so a real effect smaller than the model's own run-to-run variation is invisible. "Not flagged" is not "no effect".
- **For step 3:** the size of the question is set by the TODAY rows, not by this run. Removing the Sheet changes the interpreter's input for only the few names on that day's TODAY tab (4 at run time).

## Housekeeping

- The scratch copy `A:\mointel-scratch\market-scratch-2026-10-02.db` now holds the run's written versions; it is not the snapshot and touches nothing live. Its removal waits on his word.
