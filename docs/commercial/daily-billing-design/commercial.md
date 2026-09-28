# Daily billing — design, Commercial's section (lead)

**Commercial leads and holds this document. Ops writes the infra section, Design the
warning, Web the save-card flow — into this same folder, one file each.** Written
2026-09-27/28, against `e41da7b`. **DESIGN ONLY: no build, no provider account, no
customer or vendor contacted.**

> **HEADLINE, PER WEB'S FINDING (§8) — READ THIS FIRST: "A DAY" IS CURRENTLY THREE
> DIFFERENT INSTANTS IN THIS REPO, AND NO TWO OF THEM AGREE.** The session expires at
> **20:00 ET** (`lib/auth/expiry.ts`, unchanged, measured directly). The trading date
> rolls forward at **22:00 ET** (`lib/market/session.ts`). His stated paid day opens on
> a fresh after-hours report at **~20:30 ET**, which exists nowhere in code today. **A
> buyer who pays at Monday 20:30 loses the last 30 minutes of Tuesday under the
> current code, measured, not reasoned about (§8).** This is the single open question
> that gates §3 below and needs his answer before anything here ships.

---

**His ruling, verified at his own turn (`list_events`, not the relay alone):**

> *"start with daily. if we have their card on file, let them in immediately, the
> charge happens in the background. if it was unsuccessful, we'll send a warning of
> some kind. maybe a popup saying hey, you have 1 hour to fix this or your session is
> over. can we do that?"*

And, asked whether a cutoff landing inside 07:00–10:00 ET should hold to 10:00 instead:

> *"1 hour. regardless of time."*

**Recorded as his explicit choice, against the recommendation offered** — the one-hour
clock runs inside his own trading window, and ends a session mid-move if that's where
it lands. **Daily first; annual is a later design**, per his own sequencing.

**The shape, restated as a diagram, not owned by any one seat's section below:**

```
sign-in       -> admitted immediately, regardless of payment state
              -> background charge attempt fires the same moment
charge OK     -> nothing visible happens; access continues to the day's boundary
charge FAILS  -> warning shown, one-hour clock starts
card fixed    -> immediate retry, clock cancelled on success
clock expires -> session ends, regardless of time of day (his ruling)
next sign-in  -> refused until the card is fixed (not this document's mechanism --
                 the ordinary "charge fails at the door" case, unchanged)
```

---

## 1. FIRST-TIME CARD SETUP — THE MANDATE TEXT, AND WHAT THE TERMS OF SALE MUST SAY

**Web owns the page; this section owns what the words on it are legally required to
say, quoted from the provider whose mechanics this design already assumes (Stripe).**
Already quoted in the first day-pass addendum, restated here because it is now load-
bearing rather than background: `docs.stripe.com/payments/save-and-reuse`, saving a
card for later off-session charges requires the site's own terms to state, in advance:

> *"The customer's agreement to your initiating a payment or a series of payments on
> their behalf for specified transactions. The anticipated timing and frequency of
> payments... How you determine the payment amount. Your cancellation policy."*

**Applied to this specific shape, four sentences a terms-of-sale document needs that
a generic subscription's would not:**

1. **That a charge is attempted once per calendar paid-day, automatically, without a
   fresh authorisation each time** — the "series of payments" clause, satisfied once
   at card save rather than re-consented to daily.
2. **That access is granted BEFORE the charge is confirmed**, and can end mid-session
   if it fails — this is the unusual part relative to every comparable this seat has
   read (Seeking Alpha, Vested, INDmoney all charge or verify payment before granting
   access, never after). **Say this plainly rather than let a subscriber discover it
   from the warning banner**, because "you get access first, and can lose it an hour
   later" is not the shape a reader would assume from "you get charged when you log
   in."
3. **The one-hour figure itself, stated as a number, not "promptly" or "shortly."** A
   term that describes a real consequence (session ends) needs the real number so a
   dispute cannot turn on what "shortly" meant.
4. **Cancellation**, per §4 below.

**Nothing here drafts the clause; §2's existing scope (billing scope, terms-of-sale
routes) still governs which document carries it and whether `terms.md` is touched
directly (it should not be — the same reasoning as before, unchanged).**

---

## 2. THE BACKGROUND CHARGE — IDEMPOTENCY, RETRIES, AND WHAT "FIXED" MEANS

**Idempotency: one charge per (user, paid-day), regardless of how many times they
sign in or from how many devices.** Stripe's own mechanism is built for exactly this,
quoted from `docs.stripe.com/api/idempotent_requests`:

> *"The API supports idempotency for safely retrying requests without accidentally
> performing the same operation twice... A client generates an idempotency key, which
> is a unique key that the server uses to recognize subsequent retries of the same
> request... Stripe's idempotency works by saving the resulting status code and body
> of the first request made for any given idempotency key... Subsequent requests with
> the same key return the same result."* **And keys age out on their own: "You can
> remove keys from the system automatically after they're at least 24 hours old."**

**Design consequence: the idempotency key should be derived from `(userId,
paidDate)`, not from the session id or the sign-in event.** A second sign-in the same
paid day, from any device, submits the identical key and Stripe returns the identical
result rather than charging twice — and because keys age out at ~24 hours, tomorrow's
paid day gets a fresh key with no manual cleanup needed. **This is a property of using
the right key, not a mechanism this desk has to build.**

**What "fixed" means — his own phrase, and the design choice it implies.** *"Fixing
the card inside the hour retries the charge"* (Integration's framing, matching his
shape) reads as **event-driven, not polled**: the retry fires when the person submits
a new or corrected payment method, not on a timer re-checking the same failing card
every few minutes. **Two consequences worth naming rather than assuming:**

- **A blind retry of the SAME card that just failed is very unlikely to succeed** on
  its own between now and the hour's end, unless the failure was transient (see §5).
  Retrying only on an explicit card update is both cheaper and more honest about what
  changed.
- **The clock should be cancelled the instant the retried charge succeeds**, not left
  running to its full hour — the warning's whole purpose is the deadline, and a
  deadline that doesn't clear on success reads as a bug the first time someone hits it.

---

## 3. THE DAY BOUNDARY THE CHARGE RUNS AGAINST — CORRECTED, THIS WAS NOT SETTLED

**This section originally treated the boundary as already moving to ~20:30. It was
not settled, and Web's independent measurement (§8) caught the same premise-stated-
as-fact this seat has corrected in itself before.** `sessionExpiry` (`lib/auth/
expiry.ts:51`) still computes the session boundary at **20:00 ET, unchanged, at
`21d4534`** — the ~20:30 figure is his stated intent for when the paid day OPENS
(the fresh after-hours report), not a boundary anything in the code yet uses. **§8
carries the actual open question and this section defers to it rather than
restating a guess as fact a second time.**

**What still holds regardless of how §8 resolves:** the charge fires at the same
moment a session is issued (`lib/auth/callback.ts:145-146`), so **the charge and
whatever boundary IS chosen are computed from the identical event** — there is no
separate "billing day" clock to keep in sync with the "access day" clock, which
remains the thing most likely to drift if they were ever built as two, whichever
single boundary he picks.

---

## 4. REFUNDS AND DISPUTES FOR A DAY PASS — COMPARABLES, NOT INVENTED

**No day-pass-specific comparable was found** — searched directly; Seeking Alpha,
Vested and INDmoney (already read for the annual/onboarding work) are all monthly-or-
longer products, and no single-day information-access product with a published
refund policy turned up in a direct search. **Named as an absence rather than
papered over with an invented policy.**

**What generalises from the comparables already on file, stated as principle rather
than as a borrowed number:** Seeking Alpha's own annual terms (already quoted in the
annual addendum) draw the line at *consumption* — a short window before the product
has been used, none after. **A day pass is the extreme case of that same principle:
by the time a paid day has ended, the thing sold (that day's reports) has already
been delivered in full.** A no-refund default for a completed day is the logical
limit of every comparable's own shape, not a new invention — **but this seat does not
rule it; it is his to set, same as the other refund options already on file (billing
scope §3, annual addendum §3).**

**Disputes (chargebacks) carry a real, quotable cost that a many-small-charges model
multiplies in a way a monthly one does not.** Stripe's own published fee, already
quoted in the billing scope: **$15 per dispute received**, regardless of the disputed
amount. **A day pass priced well under $15 means a single disputed charge can cost
more than several days of the subscription it disputes** — worth him seeing as a
number, not a hypothetical, before pricing is set. The generic industry pattern this
seat has read elsewhere (not quoted here as a specific source, named as a general
shape): small, frequent, automatic charges are disproportionately likely to be
disputed as "I forgot I was being charged for this" rather than as fraud — a
friendly-fraud risk that scales with charge FREQUENCY, independent of price.

---

## 5. AN UNREACHABLE PROCESSOR — CONFIRMING THE READING HOLDS, NOT ASSUMING IT

**Integration's question, and the honest answer is: his rule as stated covers a
DECLINE, and an outage is a different signal that his own words do not yet
distinguish — this needs to go back to him as a small, separate confirmation, not be
assumed.**

**Why they are different, precisely:** a decline (`card_declined`,
`insufficient_funds`, and similar) is a **definite** answer from the processor — the
card was checked and refused. A timeout, a 5xx, or no response at all is an
**indefinite** one — nothing was actually checked. **Starting the one-hour warning
clock on an indefinite answer punishes a subscriber for Stripe's outage, not for
anything about their card**, which is a different fact from the one his rule was
written to handle.

**The reading this seat believes is consistent with "let them in immediately," offered
as a confirmation to seek rather than an answer to assume:** on an indefinite result,
**do not start the warning clock; retry the charge attempt shortly afterward as a
background job, and only surface the warning once a definite decline is actually
received.** This keeps his stated principle — a payment problem never keeps someone
off the board at the moment of sign-in — intact for the harder case, rather than
letting an outage silently start a clock nobody can act on. **This is this seat's
reading, not his ruling; it should go back to him as one short question rather than
be built on an assumption.**

---

## 6. OPS'S INFRA SECTION — LANDED (at `../2026-09-28-daily-billing-infra.md`), READ IN FULL

**Landed outside this folder, not inside it — noted so a future reader isn't confused
by the path; linked here rather than moved, since Integration's register (`commercial.md`)
is what makes it discoverable regardless of directory.** Read directly, not taken from
the relay. **It resolves §5's open question by construction, and it does so more
precisely than this section anticipated:**

**§5's decline/outage question, settled by Ops's own state model.** Ops's `charges`
row has three states — `PENDING`, `SUCCEEDED`, `FAILED` — and `grace_until` (the
one-hour clock) is set only "On FAILED." **A network timeout or an unreachable
processor is neither a decline nor a success; it should leave the row `PENDING`
rather than writing `FAILED`, so `mointel-billing` simply retries it on its next
pass and the one-hour clock never starts.** `FAILED` is reserved for a definite
decline response from the processor. **This is a refinement to Ops's design, not a
disagreement with it** — the state machine already has the right shape; the
recommendation is which of the three states an indeterminate result should land in,
and it should not be treated as new work since `PENDING` is already the row's
starting state before any attempt succeeds or is declined.

**Commercial's read on the three decisions Ops left for him, offered as
recommendations, not rulings — his to make, same as everything else in this
document:**

- **Is Saturday (or any non-trading day) a charged day?** This seat's read: **no.**
  The unit sold, per his own words, is *"a days usage of everything"* — a non-trading
  day has no premarket report, no regular session, no after-hours; there is nothing
  to sell that day. Charging for a day with no reports would be charging for access
  to an empty board, which is a different product than the one he described.
- **After the hour lapses, is the account revoked, or only that day's session
  ended?** This seat's read: **only that day's session.** The entire appeal of a day
  pass, by his own reasoning against monthly commitment, is that a bad day costs
  nothing beyond itself. Revoking the account over one failed payment reintroduces
  exactly the commitment friction a day pass is meant to avoid — tomorrow's sign-in
  attempts payment fresh, and either succeeds (the card issue was transient) or fails
  again (and refuses at the door, the ordinary case, not a special revocation).
  `revokeEmail`'s "immediate" mechanism stays reserved for what it was built for —
  fraud, a ban — not repurposed as the everyday consequence of a declined card.
- **Automatic retry, or only on card fix?** This seat's position, §2 above, unchanged
  by Ops's section: **event-driven, on card update, not polled.** Ops's design is
  compatible with either — `mointel-billing` "claims PENDING rows" however it's
  scheduled — so this is a product choice layered on infrastructure that supports
  both, not a constraint the infra forces either way.

---

## 7. DESIGN'S SECTION — LANDED (`daily-billing-design/design-seat.md`), READ IN FULL, ONE CONFIRMATION GIVEN

**Design asked this seat to confirm one reading against his ruling: does a second
decline (a failed retry) keep the ORIGINAL end time, or does the hour restart?**
**Confirmed: the original end time stands. A retry does not reset the clock, only a
SUCCESSFUL retry clears it.** His words support this directly — *"you have 1 hour to
fix this or your session is over"* describes one hour, from the failure, full stop;
*"1 hour. regardless of time"* is about WHEN the hour can land, not a licence to
re-issue it. **Design's own reasoning is the decisive part, not just this seat's
agreement with it: a retry that reset the clock would let a bad card buy unlimited
hours by failing repeatedly right as the deadline approaches** — the opposite of what
a one-hour deadline is for.

**This sharpens a precise requirement for whoever builds Ops's `charges` row that
neither prior section stated explicitly, and it belongs here because it's exactly the
kind of ambiguity this desk has been burned by before: Ops's design sets `grace_until
= failed_at + 1h` "On FAILED," and does not say whether `failed_at` is written once,
at the FIRST failure in a paid day, or rewritten on every subsequent failed retry.**
**It must be the former.** `failed_at` (and therefore `grace_until`) should be set
once, on the transition into `FAILED` from `PENDING`, and a retry that fails again
should record the attempt without touching either field. **Flagged to Ops as a
build-time requirement, not assumed satisfied by the design as written** — the
document doesn't get this wrong, it simply doesn't say, and this is exactly the kind
of unstated assumption that reads correctly on a first pass and fails on a second
decline nobody tested for.

**The second thing Design flagged — that the OS notification carries no report text,
so it doesn't reopen §4's session-reports investment-advice analysis — confirmed,
and worth stating precisely rather than just agreeing.** §4's analysis (in
`docs/research/session-reports/commercial.md`) turns on whether content is
market commentary about specific securities; a billing notification ("your payment
failed, 9 minutes left") names no ticker, no price, no market fact of any kind — it
is an account-status notice, categorically outside that analysis, not a borderline
case inside it. **Design is right to write this down rather than let a later seat
point at "the desk already pushes OS notifications" as precedent for pushing report
content without re-running §4's test.**

**The OS-notification permission question itself (Design's §3/§7) is his, not this
seat's or Ops's — a product preference about how intrusive a warning may be outside
the app, with no commercial or licence question attached either way.**

---

## 8. WEB'S SECTION — LANDED (`../../web/2026-09-27-paid-day-signup-scope.md`), READ IN FULL, ITS HEADLINE PROMOTED TO THE TOP

**The most important finding in this whole design came from Web, not this section,
and Integration is right that it belongs at the top of the document — done, above.**
Measured directly against `sessionExpiry`, not reasoned about:

```
sign-in Mon 19:50 ET  ->  expires Mon 20:00 ET   (10 minutes)
sign-in Mon 20:30 ET  ->  expires Tue 20:00 ET
```

**A buyer taking a day the moment it opens (Mon 20:30, on Monday's fresh report) has
their session expire Tue 20:00 — thirty minutes before Tuesday's ~20:30 report even
opens, and a Tuesday 20:10 sign-in belongs to WEDNESDAY's paid day under the same
roll-forward.** The buyer loses those thirty minutes every single day and cannot get
them back by signing in again. **This is not a rounding error; it is two different
definitions of "a day" that will disagree on every cycle, forever, until one of them
is picked.**

**Web's recommendation, which this seat endorses rather than merely repeats: define
the paid day by the CLOCK (20:00, unchanged) and treat "opens on a fresh report" as a
promise about WHAT IS WAITING when the day opens, not about WHEN it opens.** The
reasoning is the same discipline `lib/auth/expiry.ts` already states about itself —
*"NO SECOND DEFINITION OF 20:00 ET... a second calculation here would be a second
source of truth for the one number this desk has repeatedly got wrong."* **A paid-day
boundary that floats with a report re-introduces exactly the failure that file was
built to close off, and it does something worse than a stale clock: it moves the
CHARGE, not just a label, whenever a report runs late.** Kept as the recommendation;
his to rule, per Web's own §7.

**Two things this section corrects in ITSELF as a result, named rather than quietly
fixed:**

- **§3 above previously asserted the boundary was already moving to ~20:30. It was
  not, and has been corrected in place** rather than left standing next to this
  section's disagreement with it.
- **§4's "an unreachable processor" and Ops's fold-in already assumed a MIN-style
  boundary was resolved. Web's §3 independently derived the identical requirement
  from a different angle** — measuring `sessionExpiry` directly rather than reading
  Ops's schema — **and it is already satisfied by Ops's own design**: *"grace_until =
  failed_at + 1h, and... expires_at = MIN(expires_at, grace_until)... a failure at
  19:30 ET must not EXTEND a session that ends at 20:00."* Design's band reads that
  resulting `expires_at`/`endsAt` value and prints the absolute time (*"ends at 07:43
  ET"*), never a bare "1 hour" — so **Web's requirement that the warning "cannot
  promise sixty minutes at 19:50" is not a new gap, it is confirmation, arrived at
  independently, that the mechanism already built is the right one.** Worth stating
  plainly so three seats converging on one answer reads as convergence, not as one of
  them catching the other two out.

**Two more things from Web's section that belong in this assembled document rather
than only in its own file:**

- **Self-serve vs. invite-by-hand for the first paying users is still his, not
  settled by the day-pass ruling.** Web's own words: *"his card-on-file model
  describes what happens once somebody is paying; it does not say the first paying
  users arrive self-serve."* If hand-invite still holds (Web's 2026-09-26
  recommendation, never withdrawn), most of the page work in Web's §5 waits, and the
  live public sentence at `app/page.tsx:432` (*"There are no public sign-ups"*) stays
  true for longer — **but the day-boundary question above still needs an answer
  either way**, because the paid day is defined the same way regardless of how the
  first users reach it.
- **Admission never required a payment-aware gate.** Web confirmed `lib/auth/
  gate.ts`'s existing constraint survives unchanged: the allowlist stays the single
  authority on admission; the payment fact only decides who gets written to it and
  when. Consistent with this document's own read throughout — worth having Web's
  independent confirmation on file rather than only this seat's.

---

## 9. EVERY OPEN DECISION ACROSS ALL FOUR SECTIONS, GATHERED IN ONE PLACE

**For Integration's assembly. Nothing below is new — each is stated in its own
section above, collected here so the ask to him is one list rather than four
documents.**

1. **Does a paid day end at 20:00 ET with the session, or at ~20:30 with the next
   report?** §8. The one that gates everything else; Web's recommendation is 20:00,
   unchanged, with the report as the day's first content rather than its start.
2. **Is a non-trading day (Saturday) a charged day?** §6. This seat's recommendation:
   no — nothing is sold that day.
3. **After the hour lapses, is the account revoked, or only that day's session
   ended?** §6. This seat's recommendation: only that day.
4. **Automatic retry, or only on card fix?** §6. This seat's position: event-driven,
   on card update.
5. **Do the first paying users arrive self-serve, or still invited and invoiced by
   hand?** §8, Web's. Not settled by anything in this design; his 2026-09-26
   recommendation (hand-invite) stands until he says otherwise.

**Not a decision — already closed by his own words and recorded so it isn't
re-asked:** whether a retry resets the one-hour clock (no, confirmed §7); whether
the gate needs to learn about payment (no, confirmed independently by this seat and
Web, §8); whether the OS notification reopens the session-reports investment-advice
question (no, §7); **the OS notification itself — RULED, his words to Design,
2026-09-28: *"yes, send the notification"*.** Scope exactly as Design's §3 already
specified: once at failure, once at 10 minutes left, only where browser permission
already exists, never prompted by the failure itself, no sound, same end time as
the band. Verified against Design's own committed file
(`daily-billing-design/design-seat.md:141-147`), not taken from the relay alone.
**Do not put this back to him** — it is answered.

---

## SOURCES

`docs.stripe.com/payments/save-and-reuse`; `docs.stripe.com/api/idempotent_requests`;
`stripe.com/pricing` (dispute fee, already quoted in the billing scope);
`lib/auth/expiry.ts:51`; `lib/auth/callback.ts:145-146`; `about.seekingalpha.com/
terms`; this seat's own `2026-09-26-billing-onboarding-support-scope.md`,
`2026-09-27-day-pass-addendum.md`, `2026-09-27-day-pass-addendum-2-annual.md`; Ops's
`2026-09-28-daily-billing-infra.md`; Design's `daily-billing-design/design-seat.md`;
Web's `web/2026-09-27-paid-day-signup-scope.md`; all read in full. His rulings
verified via `list_events` on the Integration session, not taken from the relay
alone. A search for a day-pass-specific refund comparable returned nothing on
point; recorded as absence in §4 rather than assumed resolved.
