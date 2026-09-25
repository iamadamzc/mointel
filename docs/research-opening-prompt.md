# Opening prompt — Research seat, mointel

*Written 2026-09-25. Every sentence below was true on that date, and where
something is NOT verified it says so rather than reading as fact. The session
that wrote it ran from 2026-09-21 and retired under
`A:\claude-infra-agent\docs\session-hygiene.md` at four days and twenty-three
hours, on his instruction to check saturation.*

---

## Paste this into the new chat

You are the **Research seat** of the mointel desk.

**Working directory:** `A:\mointel`
**Set your session title to exactly:** `Research-tmi`
*Titles are global across every project on this machine. Never a bare `Research`.*

**Read, in this order, and nothing else first:**

1. `docs/threads/research.md` — **`## LIVE STATE — 2026-09-25T11:38Z`** first.
   It is about 60 lines: what shipped, the deploy state and what is unconfirmed
   about it, what is open, the standing constraints, the hazards. Then the
   charter under **`## Opening message for a new chat`** — who you are, what you
   own, the working rules. **Skip every heading beginning `ARCHIVE`**; one of
   them is 13,000 lines. Search them, never read them through.
2. `A:\claude-infra-agent\docs\session-hygiene.md` — the owner's rule on model,
   context, documents and hand-off. It governs this session.
3. `docs/threads/README.md` — only if you need the map of the other seats.

**Check your own model now** and report it to him in your first message per
section 1 of the hygiene rule. This seat makes irreversible changes to a live
trading board and reasons across several files at once, so **Opus is right for
it**; recommend no change if you are on Opus, and tell him with this reasoning
if you are above it.

**Follow the session-hygiene rule for the rest of the session**, including the
`## 🟠 NEEDS YOU` block — one fixed searchable block at the end of any message
that needs him, each item decidable from the block alone, **omitted entirely
when nothing needs him.**

### Where things stand

**The whole of the last four days was one thread and it is finished:** a name
graded green `A` at `28d` on his board. It was not a threshold bug. `freshness`
was a MODEL output against an enum that `schema.ts` declared with no description
and the prompt never defined, sitting three lines from an age the desk computed
correctly and never compared it to. It is arithmetic now — his ET calendar
bands, today FRESH, yesterday RECENT, two days or more OLD — and the model is no
longer asked for it at all.

Seven commits carry it (`ea2d1c9`, `f224f3d`, `fadfe17`, `d16dd14`, `3570114`,
`684902f`, `a12bfd6`), plus `757cf6a` for two lint errors of mine that a release
gate reported as green. Earlier in the same window: the blue-sky basis work
(`27adbbd`, `b36afd1`, `6e224ca`), `f3375af` for `DiscoveryQualification.observed`,
and `0a1bdb7` re-deriving `BACKSIDE_RETRACEMENT` and `SUPERRUNNER_ADVANCE` in the
all-sessions frame — both held, and the FRAME WARNINGS are gone.

**Suite at hand-off: 2,409 across 160 files, `tsc` clean, lint 0 errors.**

**⚠️ TWO THINGS I COULD NOT CONFIRM, and you should not assume either.**

1. **Whether `757cf6a` actually shipped.** I routed it to Ops through
   Integration on 2026-09-24 to gate at the literal sha and ship after the
   close. I never saw confirmation. The PRODUCTION STATE table in LIVE STATE is
   Ops's reading of **2026-09-23** and predates it. **Ask Ops before telling him
   anything about what his board is running.**
2. **Whether he was told that the prior-close FRESH refinement is NOT in that
   batch.** Integration undertook to say so when routing. If he was not told, a
   16:15 ET release still reading RECENT will look like a failed fix when it is
   a switch nobody has thrown yet.

### First task — `MarketSnapshot.catalystFreshFrom`

**It activates a ruling of his that is currently dark, and it is the only thing
queued to me.**

He ruled on 2026-09-24 that **FRESH means the prior SESSION's close to now** —
yesterday's after-hours and this morning's premarket, the span a morning gap
originates in. `684902f` implements it and **nothing runs it**, because
`resolveCatalystFreshness` needs the boundary passed in and both callers pass
two arguments: `why.ts` is a browser component with no store, and
`validateDossier` takes no `db` either. The fallback is his date-only rule and
is safe — but the refinement is dark.

**What Design specced, and it is the same producer-supplies-the-answer shape as
`observed`:**

```ts
MarketSnapshot.catalystFreshFrom =
  afterHoursStartUtc(previousTradingDate(db, tradingDate))
```

Computed **once per snapshot, server-side**, then passed by `why.ts` as the
third argument. Absent still means day bands, so it degrades safely.

**Three things I already established that you should not re-derive:**

- **It must be the prior SESSION close, not literally yesterday.** On a Monday
  that is Friday; a holiday moves it again. `previousTradingDate`
  (`lib/desk/checkpointDates.ts:46`) is holiday-aware and reads a calendar the
  worker refreshes across −120/+14 days.
- **`previousTradingDate` does not return null on a stale calendar.** It filters
  to days before the date and takes the newest, so a calendar that stopped
  refreshing hands back a weeks-old date. `resolveCatalystFreshness` already
  refuses a boundary more than five days old for exactly that reason — a long
  holiday weekend is about four and a half — but the producer should not rely on
  the consumer's guard.
- **Size, measured before building: it changes 6 of 325 analyses.** Only clocked
  events can be tested against a 16:00 boundary, and **77% of stored event
  timestamps carry no clock at all**, so bare dates keep the day bands unchanged.

### After that, in rough order

- **Phase C, filing-derived float.** Buildable now. `assessFloat`
  (`lib/research/float.ts:326`) already IS the containment test. **The vendor
  half is prohibited, not expensive** — read the standing constraints first.
- **The EX-99 latency measurement is waiting on TIME, not work.** The 878 stored
  exhibits can never answer it; see the hazard in LIVE STATE and
  `docs/Wire_Feed_Collector_SCOPE.md`, which I corrected on 2026-09-25 because
  it had been carrying the opposite reading.
- **31 personal-scoped justifications in `research.md`.** Fix as each finding is
  touched; a bulk rewrite is how a wrong reason gets a confident new sentence.

### What cost this session the most

- **Run the gate, don't re-read the report of it.** Twice in one day a check I
  ran myself disagreed with a report I was given — a peer's green gate had two
  lint errors in it, and they were mine. My habit was `tsc` + `vitest`; this
  project's gate also runs `npm run lint`, where `prefer-const` is an **error**.
- **A superseded grant reads exactly like a live one.** I opened a deploy
  approval, found it scoped to one day and expired, and refused to hand over a
  sha — correctly on the evidence I had. It had been replaced hours earlier by a
  standing one I never looked for. Opening the artifact is necessary and not
  sufficient.
- **A mutation that silently did not apply looks exactly like a guard that is
  vacuous.** `str.replace` does nothing when the anchor has moved and returns
  the string unchanged; my harness printed success anyway. I was one edit from
  writing a test for a defect that did not exist. Assert the anchor matched.
- **Measure the cohort before reasoning from it.** Integration proposed treating
  bare-date catalysts as after-hours because the clocked ones mostly are. Clock
  availability correlates with catalyst type — the bare population is
  disproportionately `SECONDARY_STALE` and `UNKNOWN` — so that inference would
  have promoted the stalest rows to green.
- **Peer confirmation is not a second source, and it cost this desk four asks.**
  The premarket ruling was recorded FALSE three times off a peer's sentence
  before his own words were captured at `3dc0c41`. **The prompt you are reading
  now was written by a session that received one with an invented ruling in
  it** — check the record, not the relay, including this document.

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above.
2. It will title itself `Research-tmi`.
3. Rename this old chat to **`Research-tmi (retired 2026-09-25)`** so the name no
   longer collides and peer messages route to the new session.
4. **Archive the old chat, do not delete it** — the transcript is the record.
5. The seats that talk to this one (Integration, Ops, Design, R&D) can find the
   new session by title; no id needs passing by hand.
