# The path to a card on file — SCOPE

**Web, 2026-09-27 20:39 ET, against `21d4534`.** Owner of this file: **Web**.
Written on Integration's relay of his billing rulings. **Beside Commercial's lead
document at
[`../commercial/2026-09-26-billing-onboarding-support-scope.md`](../commercial/2026-09-26-billing-onboarding-support-scope.md)**,
which owns pricing, packaging and what the terms of sale must say. **This file
owns the pages.** *Supersedes nothing in
[`2026-09-26-signup-flow-scope.md`](2026-09-26-signup-flow-scope.md); that one
scoped the flow when there was no price, and its §3 and §4 still hold.*

> ## SCOPE, NOT BUILD. NO PROVIDER ACCOUNT, NOTHING PUBLISHED.
> **No page is built, no provider is chosen or contacted, and no price or tier
> appears below** — those are Commercial's and his. *This document says what
> pages would have to exist, what each has to be honest about, and where his
> rulings meet code that already exists and disagrees with them.*

## 1. HIS RULINGS, AS RELAYED, AND WHAT EACH ONE OBLIGES A PAGE TO SAY

**Relayed verbatim by Integration 2026-09-27. Quoted, not paraphrased, because
the wording carries the design.**

| his ruling | what a page then owes the reader |
| --- | --- |
| *"a subscriber pays for a days usage of everything"* | **one price, no tiers, no feature table.** *A page that lists what is included implies something is excluded.* |
| the paid day opens **~20:30 ET on a fresh after-hours report** | **when the day they are buying starts and ends, in their own clock** |
| *"every single day. i will not do monthly. we can do daily, or annual."* | **two choices and nowhere any monthly framing** — not "$x/mo equivalent", not a monthly total |
| *"if we have their card on file, let them in immediately, the charge happens in the background"* | **that they are in before the charge settles, and what happens if it fails** |
| *"maybe a popup saying hey, you have 1 hour to fix this or your session is over"* — **"1 hour. regardless of time."** | **an hour that is really an hour, and it cannot be promised where it cannot be delivered (§3)** |

---

## 2. THE FINDING THAT MATTERS MOST: "A DAY" ALREADY EXISTS IN CODE, AND IT IS NOT HIS DAY

**Three boundaries exist in this repo today. They are all deliberate, they are
all documented, and no two of them are the same instant.** *Read at `21d4534`.*

```
20:00 ET   AFTER_HOURS_END_MIN, lib/market/session.ts:30
           -> sessionEndUtc -> lib/auth/expiry.ts: THE SESSION EXPIRES. The user is signed out.
22:00 ET   NEXT_DAY_PREP_MIN, lib/market/session.ts:32
           -> resolveTradingSession: THE TRADING DATE ROLLS FORWARD, deliberately late so the
              22:00 recap can close out the day it belongs to.
~20:30 ET  HIS PAID DAY OPENS, on a fresh after-hours report. Exists nowhere in code.
```

> **`lib/auth/expiry.ts` ALREADY ASKED HIM A VERSION OF THIS AND IS STILL
> WAITING.** *Its own words: "FLAGGED FOR HIM RATHER THAN SETTLED: that roll has
> a billing consequence he has not been asked about. Signing in at 21:00 on
> Monday and working until 20:00 Tuesday is one session — is it one charged day
> or two?"* **His ruling answers that one: the paid day it belongs to is the one
> it is usable in, which is what the code already does. That flag can be
> retired.** *It does not answer the boundary below.*

### The consequence, MEASURED by running `sessionExpiry`, not reasoned about

**Probe run against the real function at `21d4534`** — a throwaway test, printed
and removed, because a boundary claim derived by reading arithmetic is the kind
this desk has got wrong four times:

```
sign-in Mon 19:50 ET  ->  etDate 2026-09-28   expires Mon 20:00 ET   (10 minutes)
sign-in Mon 20:00 ET  ->  etDate 2026-09-29   expires Tue 20:00 ET
sign-in Mon 20:10 ET  ->  etDate 2026-09-29   expires Tue 20:00 ET
sign-in Mon 20:30 ET  ->  etDate 2026-09-29   expires Tue 20:00 ET
sign-in Mon 21:00 ET  ->  etDate 2026-09-29   expires Tue 20:00 ET
```

**The roll happens AT 20:00:00 exactly, not after it** — the comparison is
`todaysClose > now`, so equality already belongs to the next day. *Worth knowing
before anyone writes "after 20:00" in a policy.*

*So, a buyer taking a day the moment it opens:*

```
Mon 20:30  paid day opens with Monday's after-hours report; buyer pays, is let in
Mon 20:30  session created -> sessionExpiry rolls forward -> expires TUE 20:00
Tue 20:00  SESSION EXPIRES. Buyer is signed out.
Tue 20:30  the next paid day opens with Tuesday's report
```

**So the buyer loses the last thirty minutes of the day they bought, and cannot
get it back by signing in again** — a sign-in at 20:10 Tuesday belongs to
*Wednesday's* paid day under the same roll-forward, which the 20:10 row above
measures directly. **The gap is small in
minutes and it sits exactly on the boundary his ruling names.**

**THE QUESTION THIS PUTS TO HIM, and it is one sentence: does a paid day end at
20:00 with the session, or at the next report around 20:30?** *Either is
defensible and they are half an hour apart.* **What is not defensible is having
both**, which is what the tree contains today.

### AND THE DEEPER PROBLEM IS THE KIND OF BOUNDARY, NOT ITS VALUE

**`20:00` is a clock. *"A fresh after-hours report"* is an event.** *One is
DST-aware arithmetic on a constant; the other is a data product completing.*

> **A BILLING BOUNDARY THAT FLOATS WITH A REPORT AND A SESSION BOUNDARY FIXED TO
> A CLOCK ARE TWO DEFINITIONS OF "A DAY", AND THEY WILL DISAGREE ON EVERY DAY THE
> REPORT IS LATE OR DOES NOT RUN.** *The charge moves and the access does not.*

**`lib/auth/expiry.ts` was built specifically to avoid this and says so:** *"NO
SECOND DEFINITION OF 20:00 ET... a second calculation here would be a second
source of truth for the one number this desk has repeatedly got wrong — four
clock failures in four days."* **A floating paid-day boundary re-introduces
exactly what that file refused.**

> **SETTLED BY HIM, 2026-09-27 — SEE §8. THE PAID DAY RUNS 20:00 → 20:00, AND THE
> ~20:30 AFTER-HOURS REPORT IS THE DAY'S FIRST CONTENT RATHER THAN ITS BOUNDARY.**
> *His words: "days run from 8pm to 8pm... ah report is the first report of the new
> trading day... end of ah to end of ah."*
>
> **So this section's concern was right and its recommendation was right: one
> boundary, on the clock, and the report is what is waiting when the day opens.**
> *It took two wrong answers in between — both left visible in §7 — and the reader
> should know the conclusion was not reached cleanly.*

---

## 3. THE HOUR THAT CANNOT ALWAYS BE AN HOUR

**His ruling is unambiguous: *"1 hour. regardless of time."*** *So the warning
promises sixty minutes at 08:14 and at 19:50 alike.*

> **AT 19:50 THE SESSION EXPIRES IN TEN MINUTES ANYWAY — MEASURED, §2.**
> *`sessionExpiry` ends it at 20:00 whatever the payment state.* **So a popup promising an hour at
> 19:50 promises fifty minutes that do not exist, and the reader is signed out
> by a rule that has nothing to do with their card.**

**This is not an argument against his ruling.** *"Regardless of time" reads as
deliberately refusing a shorter grace near the close, and it is the right
instinct — a trader mid-move should not get less warning because of the hour.*
**It is a statement that the COPY cannot say "one hour" in the one window where
that is false.** *A promise a page cannot keep is worse than a shorter promise
it can.*

**What the page needs, as a property rather than a wording:** **the warning
states the time access actually ends — the earlier of the grace expiry and the
session boundary — and never a duration it computed without checking the
boundary.** *Wording is mine to draft once the boundary in §2 is settled, because
the sentence changes depending on the answer.*

> **ALREADY SATISFIED BY OPS AND DESIGN — THIS SECTION IS CONFIRMATION, NOT A
> GAP.** *Read in `docs/commercial/daily-billing-design/commercial.md` rather than
> taken from the message that told me:* **Ops's schema sets `grace_until =
> failed_at + 1h` and then `expires_at = MIN(expires_at, grace_until)`, with its
> own note that "a failure at 19:30 ET must not EXTEND a session that ends at
> 20:00"; Design's band prints that resulting absolute time ("ends at 07:43 ET")
> and never a bare "1 hour".** *Which is the property above, built before this
> seat derived it.*
>
> **THREE SEATS REACHED THE SAME REQUIREMENT FROM THREE DIRECTIONS** — Ops from
> the schema, Design from the band, this seat by measuring `sessionExpiry`. *Kept
> here because the convergence is the evidence: a requirement three independent
> routes arrive at is stronger than any one of them, and this section would
> otherwise read as an open item that is in fact closed.*

**AND THE END OF THE HOUR HAS ITS MECHANISM ALREADY, correctly.** *`revokeEmail`
ends live sessions in the same transaction — his "immediate", 2026-09-24.*
**Yesterday that looked like a conflict with non-payment; his ruling resolves
it.** *The hour IS the grace, and immediate is right at the end of it.* **The
question Integration put to him on 2026-09-26 is answered by this ruling and can
be closed.**

---

## 4. ADMISSION BEFORE PAYMENT, AND THE ONE-AUTHORITY RULE HOLDS

*"Let them in immediately, the charge happens in the background."*

**So admission no longer waits on a successful charge, and this does NOT require
the gate to learn about payment.** *The constraint written into
`lib/auth/gate.ts` at `49efcaf` survives his ruling unchanged:*

```
card saved        -> a person or a process adds the email to the allowlist -> admitted
charge fails      -> the warning, then revokeEmail at the end of the hour -> refused
```

**The allowlist stays the single authority on admission; the payment fact only
decides WHO IS WRITTEN TO IT AND WHEN.** *That is the shape the gate comment
already anticipated, and his ruling fits it without amendment — worth stating
because "let them in before the charge" sounds like it needs a payment-aware
gate and does not.*

---

## 5. THE PAGES — what has to exist, and who owns the words

| page | has to be honest about | copy |
| --- | --- | --- |
| **pricing** | one price for a day of everything; **daily or annual, never a monthly figure** | **Commercial's numbers**, Web's page |
| **save a card** | what is charged, when the first charge lands, that the day starts before it settles | Web |
| **you are in** | when this paid day ends, in the reader's own terms | Web |
| **charge failed — the warning** | **the real end time (§3)**, what fixes it, one action | **Web drafts; the surface is Design's** — see below |
| **session over** | that access ended for payment and not for cause, and how to get back | Web |
| **update card** | reachable by somebody currently locked out | Web |
| **billing history / am I still paying** | what was charged and for which day | Web + Commercial |
| **cancel** | that stopping is stopping paying, with no notice period on a daily unit | Commercial defines, Web writes |

> **THE WARNING POPUP IS ON THE SIGNED-IN SURFACE, WHICH IS DESIGN'S, NOT
> WEB'S.** *The charter's boundary is authentication, not the file tree:
> everything a stranger sees is Web's, everything a signed-in trader sees is
> Design's.* **A payment warning fires at a signed-in trader mid-session, so the
> component is Design's and the copy is Web's** — *and it is the first artefact in
> this scope that crosses that line, so it needs agreeing rather than assuming.*
> **Also: the public pages load NO client JavaScript by design. A countdown does.
> That is fine on the desk and must not leak onto the public surface.**

---

## 6. THE SEQUENCING CONSTRAINT I ALREADY OWN

**`app/page.tsx:432`, live on `tmitrader.com` right now:**

> *"There are no public sign-ups. An invite request goes to the operator by email
> and is answered by a person."*

**A save-card page reachable from the landing page makes that sentence false the
moment it ships.** *It is not a preference about launch shape — it is a published
claim with a file and a line number.* **So the copy change ships BEFORE or WITH
the first public sign-up path, never after.**

**AND THE INVITE-BY-HAND RECOMMENDATION FROM `2026-09-26` IS NOT SUPERSEDED BY
THESE RULINGS — it is narrowed.** *His card-on-file model describes what happens
once somebody is paying; it does not say the first paying users arrive
self-serve.* **If they are still invited and invoiced by hand, that sentence
stays true, every page in §5 except pricing and save-a-card waits, and the §2
boundary question still has to be answered because the paid day is defined either
way.** *Which of the two it is, is his.*

---

## 7. RULED BY HIM, 2026-09-27: THE AFTER-HOURS REPORT IS THE START OF THE DAY

**His words: "the after hours report is the start of the day."** *That settles the
§2 boundary against this seat's recommendation, and it is the better answer —
because the report is not at ~20:30.*

### ⚠ TWO WRONG ANSWERS FROM THIS SEAT, KEPT VISIBLE

**Both struck, neither deleted, because the route to the answer is part of the
record.**

1. **~~"There is no 20:30 in this system; the boundary is `RECAP_MIN` at 22:00."~~**
   *Established by grepping `HEAD`.* **The ~20:30 was HIS**, from `8f52b73`
   — *"why is the run at 10pm if the ah closes at 8? the run should be at 805, then
   the day starts at 830 pm with a fresh report on ah"* — **designed and approved,
   not built, so the tree looked identical to one where he never said it.** *A grep
   at `HEAD` answers only the present.* **Sent to Commercial as an urgent
   correction to a number of theirs that was right; retracted.**
2. **~~"The paid day therefore opens at ~20:30, so a buyer gets 23.5 of 24 hours and
   cannot see the assessment that closes the day they paid for."~~** *Correct
   arithmetic on a boundary he had not ruled.* **Dissolved by §8: the report is
   content, not a boundary.**

**WHAT SURVIVED ALL THREE STAGES, AND WHY IT IS THE ONLY THING THAT DID:** *the
grace cap in §3 — `MIN(expires_at, grace_until)` — holds at 20:00, 20:30 and 22:00
alike.* **A requirement whose truth does not depend on the disputed number is the
only kind that was safe to state while the number was disputed.**

---

## 8. SETTLED: THE PAID DAY IS 20:00 → 20:00, AND THE REPORT IS ITS FIRST CONTENT

**His ruling, 2026-09-27, verbatim:** ***"days run from 8pm to 8pm. you are right,
ah report is the first report of the new trading day. ... end of ah to end of ah.
rest agreed."***

```
Tuesday's paid day   =  Mon 20:00 ET  ->  Tue 20:00 ET
Mon ~20:30 report    =  Tuesday's FIRST CONTENT (it reports Monday's after-hours)
Tue ~20:30 report    =  Wednesday's first content
a sign-in Tue 20:15  =  buying WEDNESDAY
```

**IT MATCHES `sessionExpiry` EXACTLY, WITH NO BOUNDARY CODE AT ALL.** *Measured in
§2 — a sign-in at Mon 20:00 ET is assigned Tuesday and expires Tue 20:00:*
**24.0 hours, the whole paid day, no gap at either end.**

> **AND THE TWO CONSEQUENCES THIS FILE RAISED BOTH DISSOLVE RATHER THAN BEING
> ACCEPTED.** *The 23.5-hour shortfall is gone — access and the paid day are now
> the same interval.* **And "a Tuesday buyer cannot see the assessment that closes
> Tuesday" is not a shortfall under his definition: that report is Wednesday's
> first content, and somebody signing in on Tuesday evening after 20:00 is buying
> Wednesday.** *A real question, answered by a definition rather than by a
> mechanism — which is why it needed him and not a design.*

> ## ⚠ THE NUMBER AGREED. THE REASONING DID NOT. DO NOT READ THIS AS RATIFICATION.
>
> **This seat's argument for 20:00 was structural: a boundary must not float,
> because a report is an event and a clock is a constant.** *His reason is not
> that.* **It is how he uses the product — he reviews the prior close the evening
> before, so the day he is buying starts when that review starts.** *Relayed by
> Commercial 2026-09-27.*
>
> **THE TWO REASONS PREDICT DIFFERENT THINGS, AND THE DIFFERENCE IS DORMANT ONLY
> WHILE THE ANSWER IS THE SAME.** *My argument is satisfied by ANY fixed clock
> time — 19:00, 22:00, midnight — so a future proposal to move the boundary to
> another constant would pass it.* **His reason is not: it requires the boundary to
> sit where his evening review sits.** *So whoever next proposes moving this number
> must satisfy HIS reason, not this file's.*
>
> **Recorded because "Web recommended 20:00 and he agreed" is the sentence a later
> reader will take away, and it would credit an argument he never adopted.** *The
> desk's own rule: record the ruling, not the reason you happen to like.*

**AND THE PREVIOUS-DAY'S-REPORT SHAPE IS DESIGN — HE DESCRIBED IT UNPROMPTED, IN
HIS OWN WORDS:** *"ah report is the first report of the new trading day".* **So a
future page implying otherwise is the defect.**

> **BUT "HE CONFIRMED IT INTENTIONAL" IS THE WRONG WAY TO SAY IT, AND THIS FILE
> SAID IT THAT WAY FOR AN HOUR.** *Commercial's refinement, and it is right:
> "confirmed intentional" implies the question was well-formed and he weighed a
> tradeoff.* **There was no tradeoff. The question — "should a buyer see the
> assessment that closes the day they paid for" — presupposed that a paid day owns
> the report closing its own session, and under his definition NO paid day ever
> does.** *Every day opens with the prior session's report; there is no withheld
> content and never was.*
>
> **SO IT DISSOLVES RATHER THAN BEING ACCEPTED, AND THE DISTINCTION IS NOT
> PEDANTIC:** *a tradeoff he accepted would invite a page that explains or softens
> it, and would reopen the moment someone thought the tradeoff was avoidable.* **A
> malformed question invites neither.** *The copy can state plainly how the product
> works.*
>
> **THE GENERAL SHAPE, which is this desk's "a query answers only the population it
> was asked over", one level up:** *my question was answerable and its PREMISE was
> a mapping I had invented — that a paid day and the session it reports on are the
> same day.* **A well-formed question built on a wrong mapping produces a real
> answer to nothing.*

**THE RESIDUAL MISMATCH THIS FILE CARRIED THROUGH THREE STAGES IS ALSO GONE.**
*Session day and paid day were 2 hours apart at 22:00 and 30 minutes apart at
20:30. At 20:00 they are the same instant.* **There is now ONE definition of the
day, which is what §2 was arguing for and what `lib/auth/expiry.ts` refused to
have twice.**

### What is now approved, and what still waits

- **FIRST PAYING USERS ARE INVITED AND BILLED BY HAND. Self-serve comes later.**
  *His ruling, and it is the §6 recommendation of
  [`2026-09-26-signup-flow-scope.md`](2026-09-26-signup-flow-scope.md) adopted.*
- **SO THE PUBLIC SAVE-CARD PAGE AND THE `app/page.tsx:432` COPY CHANGE BOTH
  WAIT.** *"There are no public sign-ups. An invite request goes to the operator by
  email and is answered by a person" STAYS TRUE and stays on the page.* **§6's
  sequencing constraint is not triggered, and must not be until self-serve.**
- **THE BILLING BUILD IS APPROVED — STRICTLY AFTER THE SIGN-IN CUT-OVER PROVES THE
  GATE REFUSES.** *Web's build part is whatever a hand-invited payer needs in order
  to save a card; Commercial holds the requirements.* **Nothing public, and it is
  behind the cut-over, which is still his to schedule.**
- **OPEN, WITH INTEGRATION:** whether a late report delays the day's first content.
  **Now a content question rather than a billing one** — *the boundary is 20:00
  regardless, so a late report can no longer move a charge.* **Which is the
  clock-versus-event concern finally landing where it does no damage.**

*Nothing in this file needs him.*
