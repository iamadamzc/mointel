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

> **ANSWERED BY HIM, 2026-09-27 — SEE §7b. THE REPORT IS THE START OF THE DAY,
> AND THE REPORT IS AT ~20:30**, moving there from 22:00 under his `8f52b73`
> ruling. *This seat recommended the opposite — the 20:00 clock — and he overruled
> it.*
>
> **AND THE CONCERN THIS SECTION RAISES IS NOT DISPOSED OF BY THAT RULING. IT IS
> THE LIVE QUESTION.** *A report published at ~20:30 is an event; `20:30` is a
> clock.* **The boundary must be the SCHEDULED time, or a late report moves a
> charge and somebody's access** — with Integration, unanswered as of `9d7cc30`.
>
> ~~The boundary he ruled for is `RECAP_MIN`~~ — **struck; that was this seat's
> second wrong answer and §7 carries the correction.** *Left visible because a
> pointer that silently changed its answer twice is worse than one that shows it
> did.*

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

### ~~THE RELAYED TIME WAS WRONG, AND THE REAL ONE IS ALREADY A CONSTANT~~ — **STRUCK 2026-09-27, THIS SECTION WAS WRONG**

> ## ⚠ STRUCK, NOT DELETED. THE ~20:30 IS HIS, AND THIS SEAT CALLED IT A RELAY ARTEFACT.
>
> **Everything struck below rested on one claim — "there is no 20:30 in this
> system" — which this seat established by grepping `HEAD`.** *It is the exact
> error this desk has already written down: **a grep at `HEAD` answers only the
> present.*** **The 20:30 is DESIGNED AND APPROVED, NOT BUILT, so the tree looks
> identical to one where it was never his idea.**
>
> **HIS WORDS, `8f52b73`, 2026-09-27 — read in the commit, not relayed:**
> ***"why is the run at 10pm if the ah closes at 8? the run should be at 805, then
> the day starts at 830 pm with a fresh report on ah."***
>
> **The design at `8f52b73` / `9de7324`:** a new **~20:05 "after-hours complete"**
> checkpoint; the after-hours report published from it at **~20:30**; the **22:00
> checkpoint kept as a FILINGS UPDATE** into the same slot, and the **22:00
> trading-date roll unchanged.** *Ops measured 20:05 as safe — last after-hours
> bar correction by 20:00:00.2 on four days.* **And the design says the thing that
> makes it coherent: "the paid day's boundary is a billing concept and does not
> require the internal roll to move."**
>
> ~~`RECAP_MIN` is the paid-day boundary~~ — **it is not. `NEXT_DAY_RECAP` at
> 22:00 is the UPDATE; the ~20:30 report is the START.** *His two rulings compose:
> the paid day starts with the after-hours report, and the after-hours report moves
> to ~20:30.*

**WHAT THE STRUCK SECTION GOT RIGHT AND IS WORTH KEEPING:** *`RECAP_MIN` is
`NEXT_DAY_PREP_MIN` is 22:00, and `lib/desk/schedule.ts:8` does describe the
22:00 recap in the words of his ruling.* **Those facts are true and they are why
the wrong conclusion was so easy to reach** — the 22:00 recap really was the
after-hours report, until he moved it.

---

## 7b. THE BOUNDARY AS RULED: ~20:30, AND WHAT IT COSTS

**Paid day opens at the ~20:30 after-hours report. Session expiry is unchanged at
20:00 ET.** *Measured with the probe in §2:*

```
buyer signs in Mon 20:30 (the report publishes, the paid day opens)
  -> session etDate Tue, expires TUE 20:00
  -> 23.5 hours of access inside a 24-hour paid day
Tue 20:00  signed out
Tue 20:05  the after-hours-complete checkpoint runs -- about the day they paid for
Tue 20:30  the report publishes and opens the NEXT paid day
```

> **SO THE THIRTY MINUTES A BUYER LOSES ARE NOT EMPTY ANY MORE, AND THAT IS THE
> DIFFERENCE THE STRUCK SECTION MISSED.** *Under 22:00 the gap was `POST_MARKET`
> with nothing in it — the "two frozen hours are a gift" framing, now withdrawn.*
> **Under ~20:30 the gap contains the 20:05 checkpoint: the desk's closing
> assessment of the after-hours session the buyer paid for, published five minutes
> after they are locked out.**

**THE QUESTION THAT RAISES, AND IT IS A PRODUCT QUESTION RATHER THAN A CLOCK ONE:
does a buyer of day N get to see the assessment that closes day N?** *Under his
model the 20:30 report opens day N+1, so the answer today is no — each paid day
opens with the previous session's report.* **That is internally consistent and may
be exactly what he wants. It is worth him knowing it is the consequence**, because
"I paid for Tuesday and cannot see what Tuesday's after-hours did" is the sentence
a customer will write.

**AND THE RESIDUAL MISMATCH SHRINKS FROM TWO HOURS TO THIRTY MINUTES, same
direction:** *between 20:00 and 20:30 the session day has rolled while the paid
day has not, so a sign-in there gets the next paid day up to half an hour early.*
**Still in the customer's favour; no longer in an empty window.**

### The clock-versus-event concern is now the live one, and Integration has it

**A report published at ~20:30 is an event; `20:30` is a clock.** *This seat
raised that against the boundary and then mis-aimed it at 22:00.* **It applies
squarely here: if the boundary is the report's ACTUAL publish time, a late report
moves a charge and moves somebody's access.** **Integration is putting to him that
the boundary is the SCHEDULED 20:30 rather than the actual publish, and this seat
supports that** — *the report can be late without the day being late, which is the
only version where billing does not inherit a pipeline's luck.*

*Nothing in this file needs him beyond that scheduled-versus-actual question,
which Integration holds. The grace-period question is answered by "1 hour,
regardless of time" and is satisfied by Ops's `MIN(expires_at, grace_until)`.*
