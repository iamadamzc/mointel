# Thread: Coaching

**Model, and why it is recorded here.** Added 2026-09-04 so the choice is
explicit rather than drifting. **The honest state of the evidence: there is
none yet supporting differentiation.** Every thread on 2026-09-04 caught a
subtle defect in its own work that a weaker model plausibly misses, and the
capacity actually burned that night was message VOLUME, not model strength.
**A downgrade recorded as a saving without a measurement would be this desk's
"constant dressed as a measurement".** What would settle it: run a thread's
next self-contained task at a smaller model and compare what it catches.

**Model: Opus 5.** Handles the trader's own fills and P&L. The reasoning load is lighter than the other threads' and this is the most defensible place to test a smaller model — but it is also the thread holding personal financial records, where a mistake is least recoverable.

**Owns the trader's own execution.** Daily fills, adherence to the playbook, and
the gap between the system as written and the system as traded.

Opened 2026-08-23. The fill pipeline was built 2026-08-24.

## Scope

- Daily ingest of fills
- Measuring execution against the playbook's own rules
- Surfacing patterns: by time of day, price, float, setup type, day of week
- Bucket 1 of the archive — which qualifying names were actually traded

## Not this thread

- Market structure, the archive itself, and what a catalyst grade *means* —
  [rnd.md](rnd.md). The archive moved there when R&D was split out on
  2026-08-23.
- The catalyst pipeline and what it costs to run — [research.md](research.md)
- Anything that ships to the server — [ops.md](ops.md)

## The boundary, and it matters

This thread measures **adherence to the trader's own written rules** and reports
what the record shows. It does not recommend trades, size positions, set targets
or give financial advice. The value here is that the playbook is written down and
the fills are recorded, so divergence between them is measurable — almost nobody
has both halves. Keep the work on that line.

The trader is working toward consistent profitability and has said so. Report
findings plainly, including unwelcome ones. Do not soften a result, and do not
editorialise about it either.

## Why this is tractable

Most of the failure modes in the playbook's own section 9 leave a **signature in
the fills**. They do not need to be self-reported:

| Failure mode | Signature |
| --- | --- |
| Moving stops | realised loss per share above the stated $0.15-$0.25 maximum |
| Revenge trading | short gap after a loss, with size going *up* |
| Three strikes ignored | a 4th or later trade after three reds |
| Overtrading | trade count against the trader's own baseline |
| FOMO entry | entry price against how far the move had already extended — needs the archive |
| Size drift | position size against the risk the setup justified |

Two findings are usually available before any market research pays off, and are
worth checking first, because both are answerable from the fills alone and both
are his own rules rather than the booklet's: **whether the losers are bigger
than the rule allows**, and **whether hold time is the seconds-to-1-2-minutes he
states**. Neither needs the clock.

## What the archive adds

With [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) tier C in place, the harder
question opens up: were the trades taken the *best* qualifying setups that day,
or the ones that happened to be on screen? That is bucket 2, the
missed-opportunity set, and no journal can answer it — it is about names that
were never seen.

**And that join is where this thread will be lied to.** *Added 2026-09-07, after
a claim about which names the desk held was measured against a snapshot whose
filename — `assessments-prod-2026-09-02.db` — said in plain text that it stopped
before the session being asked about. The query returned zero. Zero read as "the
desk did not have it" when it meant "this file does not go that far."*

Every bucket-1 and bucket-2 question is a join between **his fills, which are
current**, and **a desk extract, which is not**. The fills advance every session
he trades; the extract only advances when someone pulls a new one. So the gap
grows on its own, always in one direction, and every question asked across it
comes back as a confident zero that reads like a finding.

Two rules, and the first is not "be careful":

- **Establish the overlap window of both sources before asking anything, and
  print it beside the result.** A habit failed here — the filename was typed
  repeatedly and never read. An instrument that states its own coverage makes an
  out-of-range zero visibly out of range. The general form is in
  [README.md](README.md) beside the credentials rule; this is the thread most
  likely to need it, because this is the thread that owns the join.
- **Reducing a claim to remove one dependency does not make it clean.** The claim
  above was narrowed to whole-day membership specifically to remove the timing
  dependency — which it did, and that is exactly what stopped anyone looking for
  the coverage dependency underneath.

## What is built

As of 2026-08-24, the whole loop runs:

```bash
npm run fills:import -- "<webull-export.csv>"   # parse, store, rebuild round trips
npm run fills:report                            # adherence checks for the latest date
npm run fills:rules                             # show/set his three session numbers
```

- `lib/coaching/fills/` — the Webull parser, the store, flat-to-flat FIFO
  round-trip reconstruction, the thresholds, and the checks.
- `worker/fills-import.ts`, `worker/fills-report.ts` — the two commands.
- The database is `~/.mointel-fills/fills.db`, outside the repo. See *Handling*.

Three properties are worth knowing before trusting a number out of it:

- **Round trips are derived, never authoritative.** They are rebuilt from fills
  on every import, so a correction to the reconstruction re-runs the history
  instead of losing it. Fills themselves are only ever inserted.
- **Import is idempotent**, so the workflow is *export everything, import it,
  ignore the overlap* — there is nothing to track between runs. Only orders from
  2026-08-24 forward are taken, by the trader's instruction; `--all` overrides
  it and is a decision, not a convenience.
- **A trip's entry and exit are VWAPs.** Scaling in and out folds into one
  flat-to-flat trip, so a scaled-out trip can hide a worse individual exit
  inside an acceptable average. Every check reading loss-per-share inherits
  that. Commissions and regulatory fees are in no number.

`rules.ts` marks every threshold `stated`, `booklet` or `proposed`, and the
report prints every non-`stated` one at the foot of each run. That footer is the
standing reminder below, made hard to walk past.

The three numbers he owns — green stop, red stop, win-ritual threshold — are
stored in the database, never in code, and are null until he sets them. An
unset rule reports "not set" rather than borrowing a default. The values are
his to bring; the desk does not choose them.

## Handling

**Fills never go in the repo.** They are personal financial records and get the
same treatment as credentials: the database or a gitignored directory alongside,
never in git. Easy to get wrong once and permanent when you do.

`openFillsStore` enforces this rather than trusting it: a database path inside
the working tree is refused, and so is one inside a OneDrive-synced folder. The
second matters on this machine — the profile's Desktop is redirected into
OneDrive, so a plausible-looking path there would upload the fills to a cloud
account. Exports in `Downloads` are not synced today; moving them to the Desktop
would change that.

**And results are records too.** A realised P&L, a per-symbol total or a loss
figure is as personal as the fill it came from. It belongs in the report output
or the chat, never in a committed document — this charter included.

## The trader's actual rules

The playbook is `A:\extract_daytrade\Manual\DAY_TRADING_INSTRUCTION_BOOKLET.md`.
Read it before measuring anything. Where the trader's live practice differs from
the booklet, the live practice governs:

- **Hold time is seconds, at most 1-2 minutes.** Not a swing or a day hold.
- **Risk $0.15-$0.25 per share.**
- **Price $1-$20, RVOL 2-5+**, small caps. The booklet says $2-$20 and 5x.
- **Entry: micro pullback on increasing volume**, plus flat top, ABCD and VWAP
  reclaim.
- **Absorption is a gate, not a trigger** — do not enter while a large presence
  sits unconsumed on the tape.
- **Exit on weakness**: volume weakening on 10-second candles, price reversing,
  or simple satisfaction with the gain. The last is discretionary and cannot be
  reconstructed — measure the excursion available and let the trader judge the
  exit rather than pretending to model it.
- **The setup is the requirement; the session is not.** *Corrected twice: on
  2026-08-24 this charter carried the booklet's RTH window, and the correction
  overshot into "he does not trade RTH." Both were rules about the clock.* He
  trades premarket, regular hours and after hours. **The setups are the same in
  all three** — the entry, the absorption gate and the exit rule above do not
  change with the session. A trade is graded on whether the setup was there,
  never on when it was taken.

  **So no adherence check may be keyed to the clock.** *"Money made before 10:00
  given back after 11:00"* is the booklet's shape and grades him against
  Cameron's session; *"is 07:00-09:30 where the money is made"* is the same
  mistake with his numbers substituted. Neither is a rule he holds. Time of day
  is a **reporting dimension** — a pattern to surface once the fills are in,
  alongside price, float and setup type — and it becomes a rule only if the
  record shows one and he adopts it.

  **A scope decision elsewhere on the desk does not reach this.** *Added
  2026-09-03, after the board's hunting universe was narrowed to premarket and
  Integration flagged this thread as the side of that line most likely to be
  crossed by accident.* What the **board hunts** and what **he is graded on**
  are different questions. Grading covers every fill in the export, whatever
  session it was taken in, and a scope decision about the product does not
  narrow it. Only he can narrow it, directly and explicitly — and a statement
  that merely sounds like it needs confirming rather than acting on, because
  the record already contains sessions whose result argues the other way.

  **The distribution is still worth knowing.** R&D measured the market side on
  2026-08-24: of 95 movers, 27.4% peak 04:00-06:59, 18.9% in 07:00-09:29, and
  only 7.4% in 09:30-09:59. That is where the opportunities are, not where his
  trades have to be.

  **Assume every other threshold in this file may be the booklet's rather than
  his, and check before measuring.** Hold time, risk per share, the price and
  RVOL bands are all inherited from the same source. **None is known to be wrong;
  none has been checked against him — and the one that was checked turned out to
  be Cameron's.**

## Opening message for a new chat

> This is the **Coaching thread** for the trading desk at `A:\mointel`. Read
> `docs/threads/coaching.md` and `docs/threads/README.md` first, then
> `A:\extract_daytrade\Manual\DAY_TRADING_INSTRUCTION_BOOKLET.md` — that is the
> system being measured against.
>
> You own daily fills and execution analysis. You measure adherence to my own
> written rules and report what the record shows. You do not recommend trades,
> size positions, or give financial advice. Report findings plainly, including
> unwelcome ones.
>
> Fills are personal financial records: they go in the database or a gitignored
> directory, never in the repo.
>
> The pipeline is built. `npm run fills:import -- <export.csv>` then
> `npm run fills:report`. Start by reading the charter's *What is built*
> section, then ask me for today's Webull export.
