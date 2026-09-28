# Daily billing — design, Commercial's section (lead)

**Commercial leads and holds this document. Ops writes the infra section, Design the
warning, Web the save-card flow — into this same folder, one file each.** Written
2026-09-27/28, against `e41da7b`. **DESIGN ONLY: no build, no provider account, no
customer or vendor contacted.**

> **HEADLINE, FINAL — RULED DIRECTLY BY HIM ~01:20Z 2026-09-28, CLOSING THE WHOLE
> BOUNDARY QUESTION. READ THIS, NOT THE HISTORY BELOW IT, FOR THE CURRENT ANSWER —
> the history stays in §8 because this document has been wrong twice on the way
> here and a vanished record would hide that.** His words, verified at his own turn:
>
> > *"days run from 8pm to 8pm... you are right, ah report is the first report of
> > the new trading day. think of it this way - i look at my plan for premarket the
> > night before, so my trading day starts in the evening the day before and ends
> > after hours the next day. end of ah to end of ah."*
>
> **THE PAID DAY IS 20:00 ET TO 20:00 ET — a clock boundary, identical to
> `sessionExpiry`'s existing one. NO BOUNDARY CODE CHANGES.** The ~20:30
> after-hours report is the new day's FIRST CONTENT, not its start time — a
> distinction his own words draw precisely ("I look at my plan... the night
> before," i.e. the new day opens with him reviewing what the day that just ended
> produced). **This supersedes every intermediate stage in §8**, including this
> seat's own recent endorsement of a ~20:30 START and Integration's own framing
> that produced it — Integration's words, owned rather than relayed: *"it
> supersedes the 'day starts ~20:30' framing, which was mine: it conflated the
> report time with the boundary."* **Web's original stage-1 number (20:00) was
> right all along; its reasoning (avoid a floating clock) was not the reason he
> gave, but the number matches.** The scheduled-vs-actual-publish-time question
> (§8, formerly open) is now **moot** — a late report cannot move a charge or a
> boundary that was never tied to it. **The previous-day's-report product question
> (§9, formerly open) is now CONFIRMED intentional, in his own words** — see §9.

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

## 3. THE DAY BOUNDARY THE CHARGE RUNS AGAINST — RULED, 2026-09-27, §8 CARRIES THE HISTORY

**This section has been wrong twice on its way to right, and both corrections are
kept in §8 rather than erased, because a receipt that vanishes reads as if the
question were always easy.** First pass: asserted the boundary had already moved to
~20:30 (it hadn't). Second pass: endorsed defining the paid day by the 20:00 session
clock, on Web's own recommendation (§8) — **he ruled the opposite, directly, to
Web: "the after hours report is the start of the day."** `sessionExpiry` (`lib/auth/
expiry.ts:51`) itself is untouched at 20:00 — that ruling governs the *session*, not
the *paid day*, and this document previously conflated the two.

**The paid day starts with the after-hours report, and that report is real, at
~20:30 ET, built from a new checkpoint approved but not yet shipped (§8).** The
charge still fires at the moment a session is issued (`lib/auth/callback.ts:
145-146`), so **the charge and the paid-day boundary remain computed from the
identical event** — that structural point survives every correction to which
instant the event actually is.

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

## 8. THE DAY-BOUNDARY HISTORY, FIVE STAGES, CLOSED BY HIS OWN FINAL RULING — ALL FIVE KEPT, NOT JUST THE LAST

**Three stages, each superseding the last, each worth keeping visible rather than
silently replaced with the final answer — this is exactly the shape the desk's own
rule about corrections asks for.**

**Stage 1 — Web's original section (`daily-billing-design/... paid-day-signup-scope.md`
as first written), read in full.** Measured directly against `sessionExpiry`, not
reasoned about: a buyer paying at Mon 20:30 (the moment the after-hours report was
believed to open the day) had their session expire Tue 20:00 — thirty minutes before
Tuesday's report, losing that window every day. **Web's recommendation from this
measurement: define the paid day by the 20:00 clock, treat the report as content
rather than the boundary.** This section originally endorsed that recommendation.
**He ruled the opposite, directly, to Web: "the after hours report is the start of
the day."** The endorsement above was wrong the moment it was written; struck here
rather than pretending it never happened.

**Stage 2 — Web's own correction (`b01b06e`), read in full, and it swung too far.**
On learning his ruling, Web searched the current tree for a 20:30 boundary, found
none, and concluded **"THERE IS NO 20:30 IN THIS SYSTEM"** — that the report Adam
meant is `NEXT_DAY_RECAP` at the existing 22:00 constant, and rebuilt its whole
arithmetic (22-hour access, a "gift" of two frozen hours) around 22:00. **This was
also wrong, and Integration caught it before it reached a customer-facing page:**
the ~20:30 figure is not a relay error — it is his own words, from earlier the same
session (*"the run should be at 805, then the day starts at 830 pm with a fresh
report on ah"*), and Research had **already designed and gotten his approval** for
exactly that: a new ~20:05 after-hours-complete checkpoint (`8f52b73`), measured safe
by Ops (`9de7324`), publishing the report at ~20:30 — **approved, not yet built,
which is why a grep of HEAD found nothing and both Web and, earlier, this section
mistook absence in the tree for absence in the plan.**

**Stage 3 — the composed, current answer, per Integration directly:** **the paid day
starts with the after-hours report (his ruling), and that report is real, scheduled
at ~20:30 (his design, approved, unbuilt) — not the 20:00 session clock (stage 1's
now-refused recommendation) and not 22:00 (stage 2's now-corrected substitution).**
The existing 22:00 `NEXT_DAY_RECAP` becomes an *update* into the same paid day, not
its start. **One question remains genuinely open, Integration's, not yet answered as
of this document's last edit: does a late report still start the day at its
scheduled 20:30, or does lateness push the boundary back?** Integration recommends
scheduled-time-governs, for the same reason `lib/auth/expiry.ts` gives against a
second, event-driven definition of a clock number — but this is recorded as a live
question, not assumed answered.

**One thing survives all three stages unchanged, and it is worth naming because it
is the part that was never wrong:** **Web's convergence finding on §3's "unreachable
processor" / warning-duration question holds regardless of which instant the paid
day turns out to be.** Ops's `grace_until = failed_at + 1h` with `expires_at =
MIN(expires_at, grace_until)`, and Design's absolute-time band, already satisfy the
requirement Web derived independently — that a warning cannot promise a full hour
this close to whatever the boundary is. **Three seats arrived at the same
requirement from three different angles; that convergence is real and does not
depend on today's boundary being 20:00, 20:30, or 22:00.**

**Stage 4 — Web's own retraction of part of stage 2 (`9d7cc30`), read directly, and
it surfaces a genuine product question this document did not have.** The "thirty
minutes" figure in this document's headline was right all along (Web's original
number, wrongly walked back to "ninety" in stage 2, now restored); what changes is
what those thirty minutes CONTAIN. Under the corrected ~20:30 boundary:

```
buyer signs in Mon 20:30 (report publishes, paid day opens)  -> expires Tue 20:00
Tue 20:00  signed out
Tue 20:05  the after-hours-complete checkpoint runs -- closing out the day just paid for
Tue 20:30  the report publishes and opens the NEXT paid day
```

**So the checkpoint that closes out a paid day runs five minutes after that day's
buyer has already been signed out of it — meaning each paid day, by construction,
opens with the PREVIOUS session's report, never its own.** **The right question,
Web's own framing, kept because it is sharper than this section's first pass: not
"is thirty minutes of access missing" — it is "should the closing assessment of a
day you paid for be visible to you at all."** Under his model the answer is
defensibly no, and it is the same answer for every subscriber, symmetrically —
**this is a product choice, not a shortfall, and only becomes a defect if a page
ever implies the report belongs to the day it opens rather than the one it
closes.** No such page exists yet, so today it is a constraint on copy Web has not
yet written, not a bug anyone has shipped. **Named here as a live question for him,
routed through this document rather than separately by Web, so it reaches him once.**
The residual mismatch (a sign-in between 20:00 and 20:30 gets the next paid day up to
thirty minutes early) still runs in the buyer's favour, unchanged in direction from
earlier drafts, only shrunk from two hours to thirty minutes.

**Stage 5 — HIS FINAL RULING, direct, verified at his own turn, ~01:20Z 2026-09-28,
closing all four prior stages at once:**

> *"days run from 8pm to 8pm... you are right, ah report is the first report of the
> new trading day. think of it this way - i look at my plan for premarket the night
> before, so my trading day starts in the evening the day before and ends after
> hours the next day. end of ah to end of ah."*

**The paid day is 20:00 ET to 20:00 ET — the same clock `sessionExpiry` already
uses. No boundary code changes.** The ~20:30 report is the new day's first content,
not its start — his own reasoning draws that line precisely: the new day opens with
him reviewing what the day that just ended produced, the way anyone reviews a
premarket plan "the night before." **Stage 3's ~20:30-start framing is superseded,
and Integration owns that correction rather than this seat relaying it as someone
else's**: *"it supersedes the 'day starts ~20:30' framing, which was mine: it
conflated the report time with the boundary."* **Stage 1's number was right; its
reasoning was not the reason he gave, and the number is what matters.** The
scheduled-vs-actual-publish-time question stage 3 left open is now **moot** — a
late report cannot move a boundary that was never tied to it, and his own separate
"1, yes" (a late report never moves a charge) is recorded for completeness though
the clock boundary already made it true by construction.

**And stage 4's product question DISSOLVES rather than merely gets answered — Web's
own sharpening of its own finding (`debe4d4`), confirmed against the boundary
above.** The question presupposed that a paid day owns the report closing its own
session; under his 20:00-to-20:00 definition it does not — that report is the next
day's first content, by construction, for every subscriber alike. *"I look at my
plan for premarket the night before"* is the same fact from his own side. **Nothing
is withheld, because "this day's own closing report" was never part of what this
day's access was ever going to include** — see §9 item 2 for the full form.

**Two more things from Web's section, still true after the final ruling:**

- **First paying users: RULED — invited and billed by hand, self-serve later.**
  Web's 2026-09-26 recommendation was never withdrawn and is now his direct word
  via Integration's summary. Web's public save-card page and the `app/page.tsx:432`
  change (*"There are no public sign-ups"*) wait for self-serve; nothing about the
  hand-invite path needs either.
- **Admission never required a payment-aware gate.** Web confirmed `lib/auth/
  gate.ts`'s existing constraint survives unchanged: the allowlist stays the single
  authority on admission; the payment fact only decides who gets written to it and
  when. Unaffected by the boundary ruling above.

---

## 9. EVERY DECISION ACROSS ALL FOUR SECTIONS — CLOSED, PER HIS RULING ~01:20Z 2026-09-28

**Every item on the list this document has carried is now closed. Nothing below is
new — each ruling is quoted where it was made, collected here so nobody re-asks
any of it.**

1. **RULED — the paid day is 20:00 ET to 20:00 ET, "end of ah to end of ah."** §8.
   No boundary code change. The ~20:30 report is the day's first content, not its
   start; the scheduled-vs-actual-publish-time question is moot under a clock
   boundary.
2. **DISSOLVED, not merely answered — Web's own correction to this item (`debe4d4`),
   confirmed.** §8. The question as posed ("should the closing assessment of the day
   you paid for be visible to you") presupposed that Tuesday's paid day owns
   Tuesday's closing report. **It does not, by his own definition: Tuesday's paid
   day is Mon 20:00 → Tue 20:00, and the report describing Tuesday's own
   after-hours publishes Tue ~20:30 — the first content of WEDNESDAY's paid day.**
   Access and the paid day are the identical 24.0-hour interval (measured against
   `sessionExpiry`: a sign-in at Mon 20:00 expires exactly Tue 20:00); nothing is
   withheld, because "day N's own closing report" was never a thing day N's paid
   access was ever going to include. **The late-report question also changes
   category rather than staying open**: it is no longer a billing question (the
   20:00 boundary can't be moved by a late report), only a question of when a day's
   first content happens to appear — lower stakes, and not this document's to
   carry further.
3. **RULED — a non-trading day is not charged.** Matches this seat's recommendation
   (§6).
4. **RULED — a lapsed hour ends only that day's session, not the account.** Matches
   this seat's recommendation (§6).
5. **RULED — retries happen only on card update, not automatically.** Matches this
   seat's position (§6).
6. **RULED — first paying users are invited and billed by hand; self-serve later.**
   Web's public save-card page and the `app/page.tsx:432` change wait for
   self-serve and are not part of this build.
7. **RULED — the OS notification ships, exactly as Design's §3 scoped it**
   (once at failure, once at 10 minutes left, permission already granted only, no
   sound) — his words to Design, *"yes, send the notification,"* verified against
   Design's own committed file.
8. **RULED — daily billing is BUILD APPROVED, sequenced strictly after the sign-in
   cut-over is proven to refuse a non-invited account, and nothing charges anyone
   until he separately approves the first real run.** The build owners are each
   section's owner: Ops the infra, Design the warning, Web the pages (hand-invite
   path only, for now), this seat the terms-of-sale requirements (§1).

**Already closed earlier and re-confirmed rather than re-asked:** a retry does not
reset the one-hour clock (§7); the gate never needed to learn about payment (§8);
the OS notification does not reopen the session-reports investment-advice question
(§7).

---

## SOURCES

`docs.stripe.com/payments/save-and-reuse`; `docs.stripe.com/api/idempotent_requests`;
`stripe.com/pricing` (dispute fee, already quoted in the billing scope);
`lib/auth/expiry.ts:51`; `lib/auth/callback.ts:145-146`; `about.seekingalpha.com/
terms`; this seat's own `2026-09-26-billing-onboarding-support-scope.md`,
`2026-09-27-day-pass-addendum.md`, `2026-09-27-day-pass-addendum-2-annual.md`; Ops's
`2026-09-28-daily-billing-infra.md`; Design's `daily-billing-design/design-seat.md`;
Web's `web/2026-09-27-paid-day-signup-scope.md` at `21d4534` (stage 1), `b01b06e`
(stage 2), `9d7cc30` (stage 4, the retraction), and `debe4d4` (the dissolve
correction to item 2, after his final ruling); Research's `8f52b73` and
`9de7324` (the 20:05/20:30 design and its measurement); all read in full. His
rulings verified via `list_events` on the Integration and Web sessions directly
(including his final boundary ruling, ~01:20Z 2026-09-28), not taken from the relay
alone. A search for a day-pass-specific refund comparable returned nothing on
point; recorded as absence in §4 rather than assumed resolved.
