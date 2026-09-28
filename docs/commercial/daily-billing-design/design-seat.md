# Daily billing: the payment-failed warning (Design's section)

**Design-tmi, 2026-09-28. DESIGN ONLY, no build.** Commercial leads this folder
and assembles it; this file is Design's part and nothing else.

**His ruling this answers, verbatim** (as quoted in `commercial.md`, which
verified it at his turn): *"if it was unsuccessful, we'll send a warning of some
kind. maybe a popup saying hey, you have 1 hour to fix this or your session is
over."* And: *"1 hour. regardless of time."*

**The constraint that shapes all of it:** the hour can run inside the
07:00–10:00 ET window, possibly mid-move. **The warning has to be impossible to
miss for an hour, yet never cover the board a trader is acting on at the
moment it appears.** A popup, his word, would do the first and fail the
second. So this design keeps what his word is for (unmissable, a deadline,
one action) and changes the form.

---

## 1. Where it lives: a band under the header, not a popup

```
┌ HEADER ─────────────────────────────────────────────────────────────┐
├ ⚠ Today's payment didn't go through. Your session ends at 07:43 ET  │
│   — 52 min left.                                  [ Update card ]   │  <- 1 row, amber
├ SUMMARY LINE ───────────────────────────────────────────────────────┤
├ FOCUS · BRIEFING · DISCOVERY … (unchanged, pushed down one row)     │
```

- **A full-width band directly under the header, above everything else.** It
  pushes the board down by one row and covers none of it. It isn't a toast,
  because a toast can be dismissed, and a dismissed deadline is a missed one.
  It isn't a modal, because a modal covers the board at exactly the moment the
  failure arrives, which may be mid-trade.
- **It can't be dismissed.** It goes away only when the payment succeeds or
  the session ends. It is the one element on the desk allowed to take a
  permanent row of chrome, and only for at most an hour.
- **The same band on every open tab and device**, because it renders from the
  server's `endsAt` (§5), not from a timer the page started.

## 2. What it says, and the countdown

**ONE SENTENCE, TWO TIMES, ONE BUTTON.**

`⚠ Today's payment didn't go through. Your session ends at 07:43 ET — 52 min left.  [Update card]`

- **The absolute end time comes first, then the countdown.** A trader in a
  chart glances once and remembers "07:43", and doesn't have to come back to
  read a number that has moved. The countdown is there for the reader who
  didn't note the time.
- **Minutes until the last five, then `m:ss`.** A seconds counter running for
  an hour is motion in the corner of the eye for an hour. That's the one thing
  a warning over a live board must not do.
- **No reason code in the band.** "Your bank declined the charge" is only
  worth printing if the provider's decline category is mapped to plain words.
  That mapping is Commercial's and Web's. The band carries the deadline and
  the action; the reason goes in the card-update flow, where the reader is
  deciding what to change.
- **The one action is `Update card`. There is no second button.** Other
  options, like "remind me later" or "contact support", are escape routes from
  a deadline and belong on the card page.

## 3. Unmissable without covering: the escalation

| Time left | Band | Tab title | Other |
| --- | --- | --- | --- |
| **60 → 11 min** | amber, as above | `⚠ 52m · payment` + page title | screen reader: polite announcement once, at appearance |
| **10 → 2 min** | **red**, same words | `⚠ 9m · payment` | one assertive announcement at 10 min |
| **last minute** | red, text reads `Your session ends in 0:42.` | `⚠ 0:42 · payment` | nothing new; see §4 |

- **THE TAB TITLE IS THE PART THAT REACHES HIM WHEN HE ISN'T LOOKING AT THE
  DESK, and that is the real risk.** A trader in charts may not look at the
  desk window for the whole hour, so a band nobody sees is the same as no
  warning. The browser tab title is visible from the taskbar and from other
  tabs, costs nothing, and needs no permission.
- **NO SOUND, AND THIS IS ARGUED, NOT DEFAULTED.** A sound mid-trade is an
  interruption at the worst moment, and it carries no information the title
  does not. It is also impossible to tell apart from whatever else he runs
  that beeps. The escalation is colour and title, never audio.
- **ONE OS NOTIFICATION, ONLY IF PERMISSION WAS ALREADY GRANTED, AT FAILURE
  AND AT 10 MINUTES.** Never a permission prompt fired by the failure itself,
  since asking for permission mid-deadline is a second interruption. **This is
  the one part of this section I'd put to him, because it's a notification
  outside the app.** It must print the same end time as the band. *Coupling,
  recorded for the reports design: that design treats any push or excerpt as
  reopening Commercial's §4. A billing notification carries no report text, so
  it doesn't trigger it, but the line should be written down so nobody reads a
  billing notification as precedent for pushing reports.*

## 4. The final minute, and the end

- **The last minute changes the words, not the layout.** `Your session ends in
  0:42. Update your card to stay signed in.` Still one row, still no overlay.
  An overlay in the last minute is the popup this design refuses, at the worst
  possible time.
- **AT ZERO THE BOARD IS REPLACED, NOT FROZEN.** A board left on screen after
  the session ends would keep showing prices that have stopped updating, and
  would look live. That is the snapshot board's own rule: frozen data never
  looks live. So the screen becomes one statement:

  > **Your session ended at 07:43 ET** because today's payment didn't go
  > through. Update your card to sign back in.  **[Update card]**

  It names the cause in the same words as the band, so a reader who missed
  the whole hour learns why at once rather than finding a sign-in page with no
  explanation.
- **Ending mid-open-drawer or mid-briefing is the same end.** Nothing is
  saved in a way that implies it will resume.

## 5. Fixing it: during the retry, after success, after a second decline

- **`Update card` opens Web's card form BESIDE the board**, in the same
  right-hand column the reading panel uses, so the board stays live while the
  card is typed. *If the provider's form cannot be embedded, a new tab is
  acceptable and the band keeps counting on the desk tab.* That's Web's call,
  and the constraint is only that the action must never take the board away.
- **While the retry is in flight, the band reads `Checking your card…` AND
  THE COUNTDOWN KEEPS RUNNING.** The clock stops on a confirmed success
  (Commercial §2: *"cancelled the instant the retried charge succeeds"*), not
  on a submitted form. A countdown that pauses on submit and resumes on
  decline would hand back time the ruling didn't give.
- **ON SUCCESS: the band turns green, `Payment received. You're set for
  today.`, the title prefix goes at once, and the band collapses after a
  minute or on click.** Here, and only here, a message that disappears is
  right: it asks nothing of the reader, and the audit's objection to a
  disappearing tint was that the change had consequences the reader needed.
- **ON A SECOND DECLINE: `That card was declined too.` with the SAME end
  time.** The hour does not restart. That is how I read "1 hour", and
  **Commercial should confirm it**, because a retry that reset the clock would
  let a bad card buy unlimited hours.

## 6. What this needs from the payload

`billing: { state: 'OK' | 'FAILED' | 'RETRYING' | 'RECOVERED', endsAt: string | null }`
on whatever the desk already polls. **The band is a pure function of that
object and the clock.** Every tab derives the same countdown from the same
`endsAt`, and a reload can never reset it, because the page holds no timer of
its own. `OK` renders nothing. **In a review session the object is absent and
nothing renders**, because a reviewer has no billing.

## 7. Open, for the assembled document

- ~~**The OS notification (§3)**: on or off.~~ **RULED ON, his words to
  Design, 2026-09-28: *"yes, send the notification"*.** As §3 specifies:
  once at failure and once at 10 minutes, only where browser permission
  already exists, never prompted by the failure, no sound, and the same end
  time as the band.
- ~~**Does a declined retry keep the original `endsAt`?**~~ **CONFIRMED by
  Commercial (`3886a63`): one fixed hour from the first failure, never
  re-issued.** It holds only if `failed_at` is written ONCE, not rewritten on
  each failed retry. Commercial has sent that to Ops as a build requirement.
  **`endsAt` in §6 must be derived from the first failure.**
- **Where `Update card` goes**: embedded form beside the board, or a new tab.
  Web's, against the provider's embedding rules.
