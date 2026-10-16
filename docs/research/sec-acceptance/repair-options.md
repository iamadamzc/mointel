# The repair: side effects of option A and option B, from code (2026-10-16)

*Research-tmi, for Integration 42nd's question before it goes to him. Read at d772ba25; read only. Counts are from the two PC store copies; the box's numbers come from its own dry run.*

## Common to both: repairing the source rows

The repair changes `research_sources.published_at` on the timed SEC rows that are off (580 rows in the 10-07 copy, 429 in the 10-14 copy). Three things read those rows through the evidence fingerprint, which hashes every source's `publishedAt` (`lib/research/fingerprint.ts` computeEvidenceFingerprint):

1. **The board's change label, "new source evidence on file"** (`NEW_EVIDENCE`).
   - Every checkpoint recomputes the fingerprint from the current source rows (`worker/desk-assessments.ts:272`) and compares it with the previous checkpoint row's (`lib/desk/assessment.ts:302-307`).
   - So **each affected name on the board shows "new source evidence on file" once**, at the first checkpoint after the repair, though no evidence is new.
   - It cannot be avoided without rewriting the previous checkpoint rows (frozen, the performance record) or changing what the fingerprint hashes, which would fire it for every name.
   - The report writer does not carry this note (`reports/writer.ts` CHANGE_NOTES has no shape for it), so **no report text changes from it**.
2. **Paid re-analysis.** The interpretation pipeline skips the model when the fingerprint equals the current version's stored one (`interpret/pipeline.ts:170-194`). After a source repair it differs, so **the next research job for each affected name runs the model** unless the repair also updates the stored fingerprint.
   - A job is still only queued when the name is on the board and the queue's other conditions hold. The repair queues nothing itself.
3. **Failed names reopen.** The retry policy clears a FAILED block "the moment the fingerprint changes" (`research/retry.ts:113`; `queue.ts:408`, `news/recheck.ts:136`). Affected names left FAILED become retryable.

**Names affected:** 154 in the 10-07 copy and 50 in the 10-14 copy have at least one source to repair, and all of them have an analysis.

**Mitigation, in both options:** the repair also writes the recomputed fingerprint where the gates compare it: the current version's `evidence_fingerprint`, and `research_retry_state.evidence_fingerprint` for those names. Then (2) and (3) do not fire. (1) still fires once on the board.

## Option A: rewrite the stamp inside the current version (in place)

- **What reads a version by id after the fact:**
  - The reports pipeline reads the version each checkpoint row stored (`reports/pipeline.ts:219-247`; `reports/research.ts:4`).
  - The morning read compares the evening and morning versions (`morningRead.ts:297`).
  - Recorded raw files and harnesses cite version ids.
  - In place, all of these see the NEW stamp for past checkpoints: **a report regenerated or replayed for an earlier checkpoint would no longer reproduce what was published**, and what a frozen checkpoint row "saw" changes underneath it.
- **Nothing hashes a version's dossier content** (searched: no dossier hash). The version's `evidence_fingerprint` covers sources only, and is stale after the source repair unless updated (see above).
- **No new version**, so no "re-read" label (`ANALYSIS_UPDATED`) and no morning "re-checked".
- **Undo:** an undo file of each version id's old stamp and old fingerprint, written before the write. Undo restores both.

## Option B: a new superseding version

- **What happens:**
  - A new `research_analysis_versions` row (`supersedes_id` = the current one), with the repaired stamp and the recomputed fingerprint.
  - `research_dossiers.current_version_id` moves to it. History stays intact: past checkpoints keep their versions, and replays reproduce.
- **What fires:**
  - **"Re-read" label** (`ANALYSIS_UPDATED`) on the board at the next checkpoint, for each name that gets one, beside "new source evidence on file".
  - **The Morning check**: where the evening row cites the old version and the morning row the new one, the name is "re-checked"; where its EVENT_DATE differs, it is **REVISED** (`morningRead.ts` confirmationOf). This is one-time, on the repair's day.
  - **No paid call**: the new version carries the recomputed fingerprint, so the pipeline skips the model. No job is queued by the version itself.
- **How many:** one new version per name whose current stamp was copied from an off source: 67 (10-07 copy) and 12 (10-14 copy). Names are in scope.txt ("off:"). A name with an off source but an unaffected stamp needs no new version, only the fingerprint update.
- **Undo:** an undo file of each name's previous `current_version_id`. Undo points it back, and the new versions stay as history (append-only kept).

## What a viewer sees after either

The same board readings (both options read the same stamp and sources):
- hover clocks shift by the offset
- age chips
- three bands RECENT to FRESH in the recorded replay (BIYA, SORA)

**Plus:**
- **Both:** "new source evidence on file" once per affected name on the board.
- **B only:** "re-read" once per re-versioned name, and REVISED Morning checks on the repair's day.

## Recommendation

**Option B** with the fingerprint update:
- history stays reproducible
- no paid calls
- undo is a pointer move
Its visible cost is a one-time "re-read" label and some REVISED Morning checks on the repair's day, best run in the evening after the last report. The "new source evidence on file" label comes with either option.
