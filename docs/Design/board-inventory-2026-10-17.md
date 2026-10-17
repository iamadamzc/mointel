# The desk, everything a user sees: inventory for the glossary (2026-10-17)

**Design-tmi (`local_83b5b7ec`), for Integration 43rd, at his ask: "the site needs a glossary/dictionary/walk thorugh of the board. what each section means, does, each symbol, etc, etc."** This is step 1, the inventory. It holds NO words for users: Marketing writes those from it, Commercial reads them, he approves them.

**Source:** production `366eeebd8fb3fcbda1288cf416a51636c3384789` (tag `release/2026-10-17-366eeebd`, equal to origin/production when read), checked out detached and read only. Every `file:line` is at that commit. Nothing was run, rendered or deployed.

**Method.** Five read-only readers, one per area, in the order a user meets the desk, each told to open the code before every statement, to account for every user-visible string in each file, and to list what it could not tell from the code. Design then checked a sample of the findings against the source (marked below). The sections are their work, joined unchanged except where a note says so; treat any line as a lead and open the cited line before relying on it.

**How to read it.**
- Strings are quoted exactly as in the source. Where the CSS uppercases a string, the section says so; the screen shows it in capitals.
- Where a source string holds the em dash glyph (U+2014), it is written `[U+2014]`. On the desk the lone U+2014 is the empty-cell glyph (his named exception); a few sentences also contain it, each flagged in its section.
- Colours are named by their token (`text-pos`, `bg-warn`, tone `warn` and so on); each section's colour table gives what each token signals. Tokens are defined in `app/globals.css` for both themes (dark is the default).
- Every section ends with "Unclear from the code": open questions for Marketing, Research or Design to settle before words are written.

**Out of scope:** the public pages (front page, pricing, trial, welcome, terms, privacy, the explainer pages). They are Web's and are not the desk.

## Sections

- A. Before the desk, the header, and billing
- B. Above the board: summary, filters, focus, briefing, checkpoints
- C. The board (column by column)
- D. The ticker drawer (dossier)
- E. Below the board, and the session reports

## Findings that are not glossary questions (for Integration)

These came out of the reading. They are things the live desk does that a glossary would have to explain around, or should not. **Checked by Design against the source** means Design opened the cited lines itself; **reader-reported** means only the section's reader did.

**Checked by Design against the source:**
1. **The sorted column's arrow is always down.** The sort buttons above the board show ▲ or ▼ by direction (`components/DiscoveryBoard.tsx:587`), and a second click on the same sort reverses it (`:421-427`). The sorted column's header always shows ▼ (`:960`) and always tells a screen reader "descending" (`aria-sort`, `:942`), whichever way the board is sorted. A small defect; Design's to fix if Integration wants it.
2. **The Δ change marker cannot light.** `changeSignature` is declared (`lib/data/types.ts:148`) and read (`lib/hooks/useDashboard.ts:34`), and nothing in the tree at this commit writes it, so no row is ever marked changed. (Whether it ever worked is a history question: not checked.)
3. **The reports ignore the board's price range.** `const board = null` (`components/DashboardShell.tsx:375`) under a comment saying the price control "does not ride". It does ride: the board's range is read from storage and set by the control (`:239-262`, `:661`). So the report range never follows the board, and the report's "not in your range" qualifier and the two-range briefing line ("Your board spans ...") cannot appear (sections B and E).
4. **"Premarket briefing" is not a separate report.** A PREMARKET row is re-filed as the Evening report's 22:00 edition (`lib/desk/reports/api.ts:108-110`).
5. **Desk Research says "in progress" after a failure.** With no analysis, the panel shows the status badge and a fixed sentence, "Source collection and interpretation are in progress. ..." (`components/AutomaticIntelligence.tsx:242-250`), so a badge reading ANALYSIS FAILED (`lib/dashboard/intelligence.ts:54`, `:131`) sits over a sentence saying work is in progress.
6. **An operator instruction reaches traders.** The research-offline detail reads "The automatic research worker is not running. Start the desk with npm run desk." (`lib/research/health.ts:50`; where it shows: section A).

**Reader-reported (not yet opened by Design):**
- A wrong-looking pre-load error, "The desk unavailable: {detail}", with the raw status as the detail; "Last heartbeat never ago."; the next-checkpoint name forced to lower case ("rth reassessment"); billing sentences that can render with an empty value ("You keep access to . No refunds."); the billing panel's ESC works only as a click, and the history tab has no way back but closing (section A).
- Billing history's Covers column always reads "One paid day" (`lib/dashboard/billingPageView.ts:155`). Design's note: history rows come only from `billing_charges` with source `daily` or `checkout` (`lib/billing/store.ts:16`, `:850-862`), and plans have their own "Plan invoices" link, so this is wrong only if a `checkout` charge can be a plan purchase: UNCLEAR, a Billing question.
- After the bell the RVOL sort caption still describes RVOL while the column shows Part; "low" and "thin" marks never explained on screen; a catalyst grade of NONE shows as C; a Why hover ends "The exact time is below." with nothing below; several float strings marked "NOT YET PASSED" in the source (section C).
- Raw engine values in the drawer (halt state "TRADING", price source "sip-trade", the model identifier, source ids and accession numbers); two cycle vocabularies side by side (the model's "GREEN, FRESH / FRONTSIDE" and the computed "OFF HIGH"); several drawer rows unreachable since the Sheet switch-off (section D).
- The checkpoint snapshot board: counts and filters show the live board while a frozen checkpoint shows; a stored timestamp in a hover without conversion or "ET"; "Assessment unavailable: HTTP 500"; "Loading assessment..." can stay up for good (section B).
- Desk Events: a checkpoint event opens the drawer on the symbol `DESK`; SOURCE CHANGE shows raw codes such as `COMPANY_IR`; "Earlier today" also lists last night's slots (section E).

None of these was changed. Integration rules which, if any, become work.

---

## A. Before the desk, the header, and billing

Source tree: `A:\mointel-design-inv`, detached at `366eeebd`. Every file:line below is to that tree. Where a string contains a non-ASCII glyph the code point is given. Source strings that contain U+2014 are written with `[U+2014]` in place of the glyph and flagged.

### A.0 Colour tokens used in this section (app/globals.css)

The palette comment (app/globals.css:2-6) says colours communicate state: "green = fresh/frontside strength, amber = warning, red = backside/danger, blue = informational, everything else is neutral chrome".

| Token / class stem | Dark value (globals.css) | Light value (`html[data-theme="light"]`) | Meaning in this section |
|---|---|---|---|
| `pos` (`text-pos`, `bg-pos`, `border-pos`) | #2fc46f (36) | #0f7a45 (87) | green: healthy / working / paid |
| `warn` | #e8ac33 (37) | #8a5a00 (88) | amber: warning, not current, degraded, simulated |
| `neg` | #f4574e (38) | #c22a22 (89) | red: offline, error, failed charge in last 10 min |
| `accent` | #4d93ff (39) | #1d5fd1 (90) | blue: brand, links, "connecting", "working", primary buttons |
| `ink`, `ink-1`, `ink-2`, `ink-3` | #e9edf3, #c7cedb, #97a1b0, #8792a3 (16-32) | #0d1218, #253042, #475365, #566173 (80-83) | text, from strongest to quietest |
| `desk`, `panel`, `panel-2`, `panel-3` | #06080b ... #161b23 (9-12) | #f3f5f8 ... #eceff4 (73-76) | page and panel grounds |
| `line`, `line-2` | #1b212a, #29313d (13-14) | #dfe3ea, #c6cdd8 (77-78) | borders |
| `dim` tone (a class set, not a token) | `border-line bg-panel-2 text-ink-3` | same | grey: idle / normal / not loaded |
| `.live-dot` | animation `live-pulse` 2.6s, opacity 1 to 0.35 (globals.css:192-210); off under `prefers-reduced-motion` | | a pulsing status dot = live / working |
| `.num` | mono font, tabular figures (globals.css:143-147) | | numbers that tick |

Light mode applies only on `/desk` and `/review` paths (lib/theme.ts:18, 29-32). Elsewhere (sign-in, entry gate, refusal screens) is always dark.

### A.1 Order of screens before the desk

`/desk` (app/desk/page.tsx:26-29) decides, before any data is read:

| Session state | Where the user goes | Source |
|---|---|---|
| not signed in (`anonymous`) | redirect to `/signin` (sign-in page is NOT in this section) | app/desk/page.tsx:27 |
| signed in, not admitted (`refused`) | 403 rendering `app/forbidden.tsx`, i.e. the Not Admitted screen (A.3) | app/desk/page.tsx:28 |
| admitted but has not accepted the current disclaimer (`unaccepted`) | redirect to `/enter`, the Entry Gate (A.2) | app/desk/page.tsx:29 |
| admitted and accepted | the desk (`DashboardShell`) | app/desk/page.tsx:38-41 |

`/enter` itself sends anonymous to `/signin`, refused to 403, admitted to `/desk` (app/enter/page.tsx:38-40). After a Stripe checkout the buyer lands on `/welcome` (A.4). A review link opens `/review/{token}` (A.5).

### A.2 Entry gate (`/enter`): components/EntryGate.tsx, words lib/legal/entryGate.ts

Shown when: signed in, invited/admitted, has not accepted this version of the text (app/enter/page.tsx:36-42). Full page, nothing of the desk behind it. Browser tab title: `Disclaimer | The Momentum Intelligence Trading Desk` (app/enter/page.tsx:30). Shown once per version; the version is a 16-hex-char sha256 of the text, so any wording change re-asks everyone (lib/legal/entryGate.ts:35-38).

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Brand mark | always | SVG polyline (an "M" drawn as a move), no text, `aria-hidden` | `text-accent` | EntryGate.tsx:21; BrandMark.tsx:19-38 | |
| Short wordmark (phone) | below `md` | `TMI` | ink | EntryGate.tsx:22 | hidden at md and up |
| Long wordmark (desktop) | `md` and up | `The` / `Momentum Intelligence` / `Trading Desk` | "The" `text-ink-3`; "Trading Desk" `text-accent`; class `uppercase` on all three | EntryGate.tsx:23-27 | renders as THE MOMENTUM INTELLIGENCE TRADING DESK |
| Heading | always | `Disclaimer` | ink | entryGate.ts:22; EntryGate.tsx:32 | |
| Paragraph 1 | always | `We are not a broker-dealer. We are not an investment adviser. We are not your fiduciary. Nothing the desk displays is a recommendation, an endorsement, a solicitation, or a suggestion to buy or sell any security.` | `text-ink-1` | entryGate.ts:24 | legal text, verbatim from Terms section 7 (entryGate.ts:7-12) |
| Paragraph 2 | always | `Every trading decision you make is yours. Trading low-float small-cap equities carries a substantial risk of loss, and you can lose more than you expect to.` | `text-ink-1` | entryGate.ts:25 | |
| Summary line | always | `This is a summary of one section of our Terms of Service, not all of them.` | `text-ink-3` | entryGate.ts:27; EntryGate.tsx:43 | |
| Terms link | always | `Read the full terms.` | `text-accent`, underline on hover | entryGate.ts:28; EntryGate.tsx:44-51 | opens `/terms` in a NEW TAB |
| Accept button | always | `Accept` | `bg-accent`, text `text-desk`; class `uppercase` | entryGate.ts:29; EntryGate.tsx:55-63 | POST `/auth/accept` with the version; goes on to the desk. Primary. 48px tall (`h-12`) |
| Decline button | always | `Decline` | outline `border-line-2`, `text-ink-1`; class `uppercase` | entryGate.ts:30; EntryGate.tsx:64-71 | POST `/auth/signout`: signs out, lands on the public page, nothing recorded (app/enter/page.tsx:22-23). Same size as Accept |

No client script; nothing pre-focused (EntryGate.tsx:8-15).

### A.3 Not Admitted screen (403): components/NotAdmitted.tsx, app/forbidden.tsx

Shown when: signed in but refused by the allowlist on `/desk` (app/forbidden.tsx:1-23 as rendered by `forbidden()`). Two versions, chosen by the purchase switch: closed shows the Invite version, open shows the Purchase version (app/forbidden.tsx:22-23; switch is `PURCHASE_PAGES === 'open'`, lib/public/purchaseOpen.ts:17-19). If the purchase facts cannot be read, falls back to the Invite version (app/forbidden.tsx:27-38).

#### A.3.1 Shared frame (`RefusalShell`, NotAdmitted.tsx:245-299). Also frames A.4.

| Item | Shown when | Exact text / glyph | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Brand mark + wordmark | always | same as A.2 (`TMI` on phone; `The` `Momentum Intelligence` `Trading Desk` uppercase on md+) | accent / ink-3 / ink | NotAdmitted.tsx:249-256 | |
| Header Sign out | always | `Sign out` | `text-ink-1`, hover `text-ink` | NotAdmitted.tsx:262-269 | POST `/auth/signout` |
| Footer disclaimer | always | `The Momentum Intelligence Trading Desk is an information service covering publicly traded US equities. It is not a broker-dealer, not an investment adviser, and nothing it displays is a recommendation to buy or sell any security.` | `text-ink-3` | NotAdmitted.tsx:277-281 | |
| Footer links | always | `Privacy` / `Terms` | `text-ink-1` | NotAdmitted.tsx:283-294 | to `/privacy`, `/terms` (same tab) |

#### A.3.2 Invite version (purchase switch closed): `InviteRefusal`, NotAdmitted.tsx:185-230

| Item | Shown when | Exact text | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Eyebrow | always | `Account status` | `text-ink-3`, mono, class `uppercase` | NotAdmitted.tsx:189-191 | |
| Heading | always | `You are signed in. This account does not open the board.` | ink | NotAdmitted.tsx:192-194 | |
| Body | always | `Access to the desk is by invite, and an invite is attached to an address rather than to a person.` then, if an email is known, ` You are signed in as {email}.` | `text-ink-2`; email in mono `text-ink-1` | NotAdmitted.tsx:195-204 | app/forbidden.tsx:22 passes no email when the switch is closed, so the "signed in as" sentence does not render on this path |
| Boxed note | always | `Signing in again reaches the same answer, so there is nothing to retry. If you were invited on a different address, sign out and come back on that one.` | `text-ink-1` on `bg-panel`, `border-line-2` | NotAdmitted.tsx:210-215 | |
| Button | always | `Ask about access` | `bg-ink`, text `text-desk` | NotAdmitted.tsx:218-223 | `mailto:desk@tmitrader.com?subject=Desk%20access` |
| Under-button | always | `A person answers. There is nothing further to do on this page.` | `text-ink-3` | NotAdmitted.tsx:224-226 | |

#### A.3.3 Purchase version (switch open): `StrangerRefusal`, NotAdmitted.tsx:149-182, words lib/public/purchaseCopy.ts:247-256

| Item | Shown when | Exact text | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Heading | always | `This account has no access yet.` | ink | purchaseCopy.ts:249 | |
| Body | always | `You are signed in as {email}. Access is by purchase, and is tied to the email address you sign in with. If you bought on a different address, sign out and come back on that one.` | `text-ink-2` | purchaseCopy.ts:250-251 | email = verified address (app/forbidden.tsx:32) |
| Start free trial | `canTrial` (no trial taken before) | `Start free trial` | primary: `bg-ink` `text-desk` | purchaseCopy.ts:252; NotAdmitted.tsx:157-164 | link `/trial`; `canStartTrial` (app/forbidden.tsx:34) |
| See pricing | always | `See pricing` | primary if no trial button, else outline `border-line-2` | purchaseCopy.ts:253; NotAdmitted.tsx:165-174 | link `/pricing` |
| Sign out | always | `Sign out` | outline | purchaseCopy.ts:254; NotAdmitted.tsx:175, 232-243 | POST `/auth/signout` |
| Ask link | always | `Ask about access` | `text-ink-1`, underlined | purchaseCopy.ts:255; NotAdmitted.tsx:176-178 | mailto, subject "Desk access" |

### A.4 After checkout (`/welcome`): PaymentPending and RefusedTrial (NotAdmitted.tsx), app/welcome/page.tsx

Only exists when the purchase switch is open; otherwise 404 (app/welcome/page.tsx:60). Uses the A.3.1 frame. (The "You're in." success page on the same route uses `SiteHeader`/`SiteFooter` and `YOU_ARE_IN` words, purchaseCopy.ts:194-202; it is listed here only for orientation and is not inventoried in full.)

#### A.4.1 Payment not confirmed yet (`PaymentPending`, NotAdmitted.tsx:70-105)

Shown when: Stripe says paid but the desk has not recorded it (`status.state === 'recording'`), or the success line cannot be built (app/welcome/page.tsx:93, 110).

| Item | Shown when | Exact text | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Heading | purchase | `Your payment has not been confirmed yet.` | ink | purchaseCopy.ts:258 | |
| Heading | free trial | `Your free trial has not been confirmed yet.` | ink | purchaseCopy.ts:268 | trial = Billing's record of the session (welcome/page.tsx:87) |
| Body | always | `You are signed in as {email}. Reload this page to check again.` | `text-ink-2` | purchaseCopy.ts:259 | |
| Reload | always | `Reload` | primary `bg-ink` | purchaseCopy.ts:260; NotAdmitted.tsx:89-94 | a link to the same `/welcome?...` URL (a GET), not a script |
| Sign out | always | `Sign out` | outline | purchaseCopy.ts:261 | POST |
| Ask link | purchase | `Ask about your payment` | `text-ink-1`, underlined | purchaseCopy.ts:262 | `mailto:desk@tmitrader.com?subject=Payment` |
| Ask link | trial | `Ask about your trial` | same | purchaseCopy.ts:269 | `mailto:...?subject=Trial` |

#### A.4.2 Trial could not start (`RefusedTrial`, NotAdmitted.tsx:116-147, words purchaseCopy.ts:213-228)

Shown when: `checkoutStatus` returns `trial_refused` (app/welcome/page.tsx:77-80).

| Item | Shown when | Exact text | Colour | Notes |
|---|---|---|---|---|
| Heading | always | `We couldn't start your free trial.` | ink | purchaseCopy.ts:214 |
| Reason line | reason `card_used` | `The free trial is once per person and per card, so it can't start with this card. You can buy a day or a plan.` | `text-ink-2` | purchaseCopy.ts:218 |
| Reason line | `account_used` | `You've already had your free trial. The free trial is once per person and per card. You can buy a day or a plan.` | same | :219 |
| Reason line | `already_bought` | `You've already bought on this account, so a free trial isn't available. You can buy a day or a plan at any time.` | same | :220-221 |
| Reason line | `not_a_card` | `The free trial needs a card, and the payment method you used wasn't one. You can try again with a card.` | same | :222 |
| Not charged | always | `You were not charged for this.` | `text-ink-2` | :215 |
| Bank line | every reason except `not_a_card` | `Your bank may show a small pending amount from the card check. It is not a charge, and we never take it.` | `text-ink-3` | :216; NotAdmitted.tsx:126 |
| Try again | `not_a_card` only | `Try again` | primary | :224; link `/trial` (NotAdmitted.tsx:129-133) |
| Open the desk | `already_bought` AND account currently has access (door `ok` or `trial`) | `Open the desk` | primary | :226; link `/desk` (NotAdmitted.tsx:134-137; welcome/page.tsx:79) |
| See pricing | otherwise | `See pricing` | primary, or outline when `not_a_card` | :225; link `/pricing` |
| Sign out | always | `Sign out` | outline | :227 |

### A.5 Review session (`/review/{token}`): ReviewBanner.tsx, ReviewRefusal.tsx

The review page is the real desk shell, read-only, pointed at `/review/{token}/api` (app/review/[token]/page.tsx:33-46). In read-only mode the billing state is never fetched (lib/hooks/useBillingState.ts:26), so no billing band, screen, trial chip or Billing button appears. The rest of the header (A.6) is the same.

#### A.5.1 Review banner (ReviewBanner.tsx:13-24)

Shown when: the token is valid; one strip above the desk header (app/review/[token]/page.tsx:43), and also on the review diagnostics page (app/review/[token]/diagnostics/page.tsx:72).

| Item | Exact text / glyph | Colour | Computed from | Notes |
|---|---|---|---|---|
| Left label | `Read-only review session` | `text-accent`, class `uppercase`; strip `bg-accent/10`, `border-accent/30` | ReviewBanner.tsx:16-18 | |
| Right line | `Nothing here can be changed · Expires {expiresAtClock} ET` | `text-ink-3` | ReviewBanner.tsx:19-21 | `·` is U+00B7 (separator). Time from `expiryClock`: `Intl` en-US, America/New_York, `dateStyle: 'medium'`, `timeStyle: 'short'` (lib/review/access.ts:84-90), i.e. a medium date plus a short 12-hour time, then the literal `ET` |

Diagnostics page header (out of scope beyond these two): heading `Desk diagnostics` (uppercase) and link `← back to the desk` (U+2190, leftward arrow = go back) at app/review/[token]/diagnostics/page.tsx:75-80.

#### A.5.2 Review link refused (ReviewRefusal.tsx:12-47)

Shown when: `verifyReviewToken` fails (app/review/[token]/page.tsx:29). Reason is `INVALID`, `EXPIRED` or `REVOKED` (lib/review/tokens.ts:211-242).

| Item | Shown when | Exact text | Colour |
|---|---|---|---|
| Eyebrow | always | `Momentum Intelligence Trading Desk` | `text-ink-3`, class `uppercase` (ReviewRefusal.tsx:32-34) |
| Heading | EXPIRED | `This review session has expired.` | ink (:16) |
| Detail | EXPIRED | `Review links are time-limited. Ask for a new one if you still need access.` | ink-3 (:17) |
| Heading | REVOKED | `This review session has been revoked.` | (:21) |
| Detail | REVOKED | `The link was withdrawn before it expired and no longer grants access.` | (:22) |
| Heading | INVALID (any unrecognised token) | `Not authorized.` | (:25) |
| Detail | INVALID | `This link does not grant access to the desk.` | (:26) |
| Footer line | always | `The desk itself is at ` + link `the usual address` + `, which needs a password.` | ink-3; link `text-accent` (:37-43) | link goes to `/` |

### A.6 Before the first desk payload (DashboardShell.tsx:434-441)

| Item | Shown when | Exact text / glyph | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Full-screen loading line | the desk shell has no dashboard data yet and no failure | `Loading desk…` | `text-ink-3`, class `uppercase` | DashboardShell.tsx:437 | `…` is U+2026 |
| Full-screen failure line | no data yet and the dashboard poll failed, signed out | `Signed out: The desk is frozen until you sign in again` | same | feedFailureLine, lib/dashboard/feedFailure.ts:76-82 with subject `The desk` | 401 or 403 (feedFailure.ts:45-48) |
| Full-screen failure line | no data yet, network/server fault | `The desk unavailable: {detail}` where detail is `API responded {status}` or the browser's fetch error message | same | feedFailure.ts:48, 57-60, 83 | see Unclear |

Header placeholders while the first market payload has not arrived (DashboardShell.tsx:124-189): market chip `Market: not loaded` (dim, hover `No market payload has been received yet`), research chip `Research: not loaded` (dim, same hover), assessment chip `Assessments: not loaded` (dim, same hover), assessment headline `LOADING` with subline `No market payload has been received yet`. Session text reads `Session not loaded` (MarketStatus.tsx:155-156).

### A.7 The desk header: components/DashboardHeader.tsx

Sticky at top, `bg-panel/95` with blur (DashboardHeader.tsx:61). One wrapping row, left to right, then optional full-width lines underneath. Clock ticks once a second (lib/hooks/useClock.ts:12-20).

#### A.7.1 Left group

| Item | Shown when | Exact text / glyph | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Brand mark | always | SVG "M", 18px | `text-accent` | DashboardHeader.tsx:77 | |
| Wordmark (h1) | always | `The` / `Momentum Intelligence` / `Trading Desk` | "The" `text-ink-3` (9px); name `text-ink`; "Trading Desk" `text-accent`; whole h1 class `uppercase` | DashboardHeader.tsx:78-82 | no phone short form here |
| ET clock | always | `HH:MM:SS` 24-hour; before mount `--:--:--` | `text-ink`, `.num` | DashboardHeader.tsx:57, 86; formatEtClock lib/format.ts:5-11, 79-81 | America/New_York, `hour12: false` |
| Zone tag | always | `ET` | `text-ink-3`, class `uppercase` | DashboardHeader.tsx:87 | |
| Date | `md` and up, after mount | ET date from `weekday: 'short', month: 'short', day: '2-digit', year: 'numeric'` (en-US) | `text-ink-3` | DashboardHeader.tsx:58, 88; lib/format.ts:13-19, 83-85 | empty before mount |

#### A.7.2 Assessment status (components/DeskAssessmentStatus.tsx, view model lib/desk/view.ts)

| Item | Shown when | Exact text / glyph | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Scheduler chip | always (label always shown) | dot + label, class `uppercase`: `Assessments: scheduler offline` / `Assessments: error` / `Assessments: running` / `Assessments: scheduled` / (before payload) `Assessments: not loaded` | tone per state: offline `neg`, error `neg`, running `pos`, scheduled `dim`, not loaded `dim`; dot `bg-{tone}`, never pulses | DeskAssessmentStatus.tsx:37-45; projectSchedulerHealth lib/desk/view.ts:75-131; DashboardShell.tsx:183-188 | offline = no heartbeat or heartbeat older than 3 min (view.ts:73, 81-102) |
| Chip hover | always | offline (none reported): `No desk assessment worker has reported. Scheduled checkpoints are not being taken.`; offline (stale): `Last heartbeat {N}s ago. Checkpoints will be missed.` or `Last heartbeat never ago. Checkpoints will be missed.`; error: worker's `lastError` or `The scheduler reported an error`; running: `Taking a scheduled desk assessment`; scheduled: `Scheduler is running and waiting for the next checkpoint`; not loaded: `No market payload has been received yet` | | view.ts:87, 98, 108, 118, 127; DashboardShell.tsx:186 | "never ago" wording: see Unclear |
| Next checkpoint | after mount and a next slot exists | `Next ` + `HH:MM` + ` ` + checkpoint label in lower case | "Next" `text-ink-2`; time `text-ink`, `.num`, bold; label `text-ink-3` | DeskAssessmentStatus.tsx:56-61; toNext view.ts:246-254 | label lowercased by `.toLowerCase()`. No "ET" suffix. Labels (lib/desk/schedule.ts:114-124): `22:00 recap`, `Structural refresh`, `First market scan`, `Premarket reassessment`, `Late-mover scan`, `Open spike assessment`, `RTH reassessment`, `RTH close`, `20:05 after-hours close`. Schedule times: 22:00, 06:10, 06:25, 06:45, 07:00, 09:25, every 30 min 10:00 to 15:30, at the close, 20:05 (schedule.ts:8-19, 79-86) |
| Session headline | after mount, viewport `xl` and up only | `PREMARKET`; `RTH`; `RTH · EARLY CLOSE {HH:MM} ET`; `AFTER HOURS · LIVE DISCOVERY`; `AFTER HOURS CLOSED`; `NEXT-DAY PREP`; `MARKET CLOSED`; `LOADING` (before payload) | `text-ink-2`, class `uppercase`, bold | DeskAssessmentStatus.tsx:63-67; describeSession view.ts:144-213 | `·` U+00B7. Hidden below xl (1280px) |
| Session subline | xl+, when non-empty | composed from `Last: {LABEL} {HH:MM}` (+ ` (late)`), `Next: {LABEL} {HH:MM} ET`, joined by ` · `. Phase fallbacks: PREMARKET/RTH: `Discovery ranked on Daily RVOL`; AFTER_HOURS: `AH session since {close} ET` + parts; POST_MARKET: `Final AH state frozen at 20:00 ET` + next; NEXT_DAY_PREP: `22:00 recap complete` or last part or `Preparing the next session`, then ` · Target session {YYYY-MM-DD}` and next; closed: `Next session {date}` or `No session scheduled` | `text-ink-3` | view.ts:156-211 | LABEL is upper-cased (view.ts:156, 158). Note "Last:" carries no "ET" but "Next:" does |
| Subline hover | xl+, when last checkpoint has notes | the last checkpoint's `notes` | | DeskAssessmentStatus.tsx:69 | free text from the worker |
| `late` tag | xl+, last checkpoint ran after its scheduled minute | `late` | `text-warn`, class `uppercase`, 9px | DeskAssessmentStatus.tsx:73-80 | hover: `This checkpoint was generated after its scheduled time. It records the state when it ran, not the state at the scheduled minute.` |

Session phase boundaries (lib/market/session.ts:27-32, 207-216): PREMARKET 04:00-09:30, RTH 09:30-close (16:00 normally), AFTER_HOURS close-20:00, POST_MARKET 20:00-22:00, NEXT_DAY_PREP 22:00-04:00; non-trading day = CLOSED (session.ts:222-229).

#### A.7.3 Right group, in render order (DashboardHeader.tsx:95-129)

**Market feed light (components/MarketStatus.tsx, lib/market/health.ts)**

| Item | Shown when | Exact text / glyph | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Market chip dot | always | 6px round dot | `bg-{tone}`; pulses (`live-dot`) only when state is LIVE and no feed banner | MarketStatus.tsx:130-134 | |
| Market chip words | only when the state is NOT what the hour should produce; inside 04:00-20:00 on a trading day the normal state is LIVE, otherwise IDLE; with no session loaded words always show | labels (class `uppercase`): `Market: {feed} · LIVE`; `Market: {feed} · closed`; `Market: {feed} · connecting`; `Market: {feed} · degraded`; `Market: {feed} · DATA STALE`; `Market: {feed} · DATA DEGRADED`; `Market: {feed} · error`; `Market: {feed} · disconnected`; `Market: {feed} not entitled`; `Market: worker offline`; `Market: {feed}` (simulator/test); `Market: not loaded` | LIVE `pos`; closed (IDLE) `dim`; connecting `accent`; degraded / stale / data degraded / simulated `warn`; error / disconnected / not entitled / worker offline `neg`; not loaded `dim` | MarketStatus.tsx:91-95, 135; projectMarketHealth health.ts:139-294; DashboardShell.tsx:124-135 | `{feed}` = `Alpaca SIP`, `Alpaca IEX`, `SIMULATOR`, `TEST STREAM`, else the feed name upper-cased (health.ts:132-137, 157). `·` U+00B7. Fresh under 90s, stale at 240s+ (DashboardShell.tsx:134 placeholder; live thresholds come from the server payload) |
| Market chip words while feed banner is up | feed banner (A.8) present | `Market: no data received`; `Market: data {N} min old, as of {HH:MM:SS} ET`; `Market: not reaching the desk, last data {time} ET` | forced `warn`, no pulse | MarketStatus.tsx:75-76, 135; chipText lib/dashboard/feedBanner.ts:136-140 | time may carry a date, see A.8 |
| Market chip hover | always | normal: `{label} · {detail}`; banner up: the banner sentence | | MarketStatus.tsx:125 | details below |
| Hover details | per state | LIVE: `Streaming; newest whole-market message {N}s old`. Closed: `Extended trading ended at 20:00 ET; the after-hours state is frozen and no new SIP prints are expected` (POST_MARKET) / `Market closed for the day; no SIP prints expected until 04:00 ET` (NEXT_DAY_PREP) / `Outside the 04:00–20:00 ET session window; no market data expected` (else; `–` is U+2013). Connecting: `Handshake in progress`. Degraded: `Worker heartbeat is {N}s old` or worker error or `Stream reported a degraded state`. DATA STALE: `Socket is connected but no whole-market message for {N}s (stale beyond {S}s). Connection is not freshness.` DATA DEGRADED: `Socket is connected but the newest whole-market message is {N}s old (fresh under {F}s).` Error/disconnected: worker error or `Reconnecting`. Not entitled: worker error or `Account lacks the required market-data subscription`. Worker offline: worker error or `The market feed is not connected. Prices and Discovery cannot update until it reconnects.` Simulated: `Synthetic data: not a market feed and not tradeable`. Not loaded: `No market payload has been received yet` | | health.ts:171, 186, 197, 208, 219, 230-235, 252-254, 265-267, 278-280, 290 | FLAG: when the age is unknown the STALE and DATA DEGRADED sentences print `[U+2014]s` in place of the number (health.ts:266, 279: `?? '[U+2014]'`). STALE with no message ever is reachable (health.ts:125) |
| Session phase word | always | `Closed`, `Premarket`, `Regular hours`, `After hours`, `Post-market`, `Next-day prep`; or `Session not loaded` before payload | `text-ink-2` | SESSION_PHASE_LABEL MarketStatus.tsx:42-49, 151-158 | falls back to the raw phase code if unmapped (:154) |
| Session phase hover | after mount and a message age is known | `Newest whole-market message {N}s ago. Fresh under {F}s, stale beyond {S}s.` | | ageDetail MarketStatus.tsx:51-57, 152 | |
| Universe badge | a session is loaded, universe is not FULL, and feed mode is not OFFLINE | `Universe: degraded` (DEGRADED_ASSETS and SHEET_ONLY), `Universe: no wildcard`, `Universe: simulated`, else `Universe: full` | `warn` (StatusBadge, class `uppercase`) | MarketStatus.tsx:160-166, 171-186 | hover: `The discovery universe is not the full asset list; coverage is reduced.` |

**Trial chip (components/BillingScreens.tsx TrialChip, :102-116 of the file)** sits between the market light and the research light. See A.10.3.

**Research engine light (components/ResearchEngineStatus.tsx, lib/research/health.ts)**

| Item | Shown when | Exact text / glyph | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Research chip dot | always | 6px dot | `bg-{tone}`; pulses when WORKING | ResearchEngineStatus.tsx:53-57 | |
| Research chip words | all states except IDLE (IDLE shows the dot only) | `Research: engine offline`; `Research: error`; `Research: degraded`; `Research: working ({n})`; (`Research: idle` is never displayed as words); before payload `Research: not loaded` | offline `neg`; error `neg`; degraded `warn`; working `accent`; idle `pos`; not loaded `dim` | ResearchEngineStatus.tsx:47-59; projectResearchHealth research/health.ts:47-168; DashboardShell.tsx:145-157 | class `uppercase`. Offline = no heartbeat or heartbeat older than 60s (health.ts:45, 76) |
| Research chip hover | always | `{label} · {detail}`. Details: offline `The automatic research worker is not running. Start the desk with npm run desk.` / `The research worker has no readable heartbeat.` / `No research heartbeat for {N}s. The worker is not running.`; error: model/SEC detail or `The research worker reported an error.`; degraded: any of `SEC access unavailable`, `SEC unreachable ({detail or 'observed failure'})`, `no interpreter configured` joined by ` · `, or `The research worker reported degraded capability.`; working `Analyzing {tickers or 'queued names'}; {n} queued`; idle `{n} queued, none started yet` or `Engine healthy; every eligible name is covered` | | ResearchEngineStatus.tsx:48; research/health.ts:50, 80-81, 107, 134-144, 154, 163-166 | FLAG: offline hover is an operator instruction (`npm run desk`) |
| Work line | after mount, when something is active or queued | `analyzing {T1}, {T2}` (first two active tickers) or `{n} queued` | `text-ink-2` | ResearchEngineStatus.tsx:69-75 | lower-case "analyzing" |

**Mock data badge (components/DataFreshness.tsx)**

| Item | Shown when | Exact text | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Research mock badge | only when the research provider is the development `mock` (never in production per comment) | `Research: Mock Data` | `warn` badge, class `uppercase` | DataFreshness.tsx:22-30 | hover: `No Google credentials configured. Showing the built-in mock dataset.` Otherwise renders nothing |

**Buttons**

| Item | Shown when | Exact text | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Refresh | always | `Refresh`; while a manual refresh runs `Syncing…` (U+2026) | outline `border-line-2` `bg-panel-2` `text-ink-2`, hover `border-accent/50`; class `uppercase`; disabled at 50% opacity | DashboardHeader.tsx:111-118 | click forces a fresh dashboard read (`force=1`, lib/hooks/useDashboard.ts:64-68, 179-181). The desk also polls every 4s by itself (useDashboard.ts:15) and the market every 1s (lib/hooks/useMarket.ts:22). Also present in review mode |
| Billing | only when a billing state exists (purchase switch open, not the owner, not review mode) | `Billing` | same as Refresh | DashboardHeader.tsx:119-127; BILLING_PAGE_WORDS.headline billingPageView.ts:22; DashboardShell.tsx:510 | opens the Billing panel (A.10.5) |
| Theme toggle | after mount | names the mode it switches TO: `Light` (when dark) / `Dark` (when light) | same as Refresh; class `uppercase` | ThemeToggle.tsx:12-17, 28, 37-46 | hover `Switch to light mode` / `Switch to dark mode`. Click swaps theme at once and stores it in this browser (`tmi-theme`, lib/theme.ts:15, 42-55). Default dark |

#### A.7.4 Full-width lines under the header row

| Item | Shown when | Exact text | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Research failure line | dashboard poll failed (`failure`) or the research payload carries an error (`meta.error`) | signed out: `Signed out: Research is frozen until you sign in again`; transport: `Research unavailable: {detail}` (`API responded {status}` or the fetch error); else `meta.error`: `Upstream read failed, showing last good data: {reason}` or the raw upstream message | `text-neg` on `bg-neg/8`, top border `neg/25` | DashboardHeader.tsx:132-136; feedFailure.ts:76-83; lib/data/index.ts:91-101, 146, 166, 173 | `{reason}` may end with ` (HTTP {status})` (index.ts:96-100) |
| Simulator warning | feed mode SIMULATOR | `Simulator mode: market values on this screen are synthetic and must not be traded` | `text-warn` on `bg-warn/12`, class `uppercase` | DashboardHeader.tsx:138-142 | |
| Test stream warning | feed mode TEST | `Alpaca test stream (FAKEPACA): diagnostics only, not market data` | same | DashboardHeader.tsx:144-148 | |

StatusBadge (components/StatusBadge.tsx:31-40) is the shared chip: 10px, bold, class `uppercase`, tones `pos`, `warn`, `neg`, `accent`, `neutral` (`border-line-2 bg-panel-3 text-ink-2`), `dim`; hover defaults to the label. Its catalyst/structure/session helpers (:43-110) are board features, not header items.

### A.8 Feed problem banner ("not updating"): components/FeedBanner.tsx, lib/dashboard/feedBanner.ts, lib/hooks/useFeedBanner.tsx

Where: one line above the board, below the summary and filter bar (DashboardShell.tsx:542), only when the board itself is shown (not on a billing screen). Silent when the board is current. `role="status"` (polite, not an alert). Colour: `text-warn` on `bg-warn/12`, bottom border `warn/35`, 12px, no wrap (FeedBanner.tsx:14-20). Computed by `feedBanner()` (feedBanner.ts:87-124) from the market poll's failure and last snapshot (DashboardShell.tsx:478-486). The same object is shared by context to the header market chip, price-source tooltips and a drawer title (useFeedBanner.tsx:17-23; feedBanner.ts:136-158).

| State | Shown when | Exact text | Computed from |
|---|---|---|---|
| NEVER | the market poll is failing (network/server) and no market payload has arrived since the page opened, or the last payload's time cannot be read | `This page cannot reach the desk. No numbers have been received since this page opened.` | feedBanner.ts:91-98, 126 |
| UNREACHABLE | the market poll is failing (network/server) and a previous payload exists | `This page cannot reach the desk. The numbers below are the last ones received, at {time} ET.` | feedBanner.ts:99-104 |
| DATA_OLD | the poll works but market freshness is STALE (only inside 04:00-20:00 on trading days; not for simulated/test feeds) | `The desk's market data was last updated at {time} ET, {N} minute ago. The numbers below are as of then.` (or `minutes` when N is not 1) | feedBanner.ts:108-123 |
| (none) | signed out (401/403) | no banner; the header's red line says it | feedBanner.ts:106 |

`{time}`: `HH:MM:SS` 24-hour ET; prefixed with `{Mon} {d}, ` (e.g. short month and day) when not today in ET (bannerTime feedBanner.ts:42-68). The times are the server's and the data's own stamps, never the page clock (feedBanner.ts:20-22). `{N}` is whole minutes, floor of seconds/60 (feedBanner.ts:117).

### A.9 Billing: when any of it appears

Nothing billing-related shows unless `GET /api/billing/state` returns a state. The deciding line is app/api/billing/state/route.ts:32:

`if (!purchaseOpen() || isDeskOwner(db, userId)) return NextResponse.json(null, { headers: NO_STORE });`

So: purchase switch closed (env `PURCHASE_PAGES` not exactly `open`, lib/public/purchaseOpen.ts:15-19), or the owner's account, gives null and therefore no band, no screen, no trial chip and no Billing button. Review sessions never ask (lib/hooks/useBillingState.ts:26). A 404 also reads as null; other failures keep the last state (useBillingState.ts:29-36). Read every 60s and on tab focus/visibility (useBillingState.ts:9, 45-50), including while the tab is hidden.

The single mapping is `billingDeskView` (lib/dashboard/billingView.ts:201-256), keyed on Billing's `door`: `ok`, `trial`, `buy_first`, `charge_first` (lib/billing/account.ts:56).

#### A.10.1 Failed-charge band (components/BillingBand.tsx)

Where: one row directly under the header, pushes the board down (DashboardShell.tsx:514). Cannot be dismissed. Shown when door is `ok` and a one-hour grace is running, or for one minute after it was paid (billingView.ts:225-255; lib/hooks/useDeskBilling.ts:15, 33-41).

| Phase | Shown when | Exact text | Colour | Button |
|---|---|---|---|---|
| amber | grace running, more than 10 min left, daily | `Your payment didn't go through. Your session ends at {HH:MM} ET, {N} min left.` | `warn` (`border-warn/40 bg-warn/15 text-warn`) | `Update card` |
| amber | same, plan | `Your plan's renewal didn't go through. Your session ends at {HH:MM} ET, {N} min left.` | `warn` | `Update card` |
| red | 10 min or less left (same two sentences) | as above | `neg` (`border-neg/45 bg-neg/15 text-neg`) | `Update card` |
| last | 60 seconds or less left | `Your session ends in {M:SS}. Update your card to stay signed in.` | `neg` | `Update card` |
| checking | a retry charge is pending | `Checking your card...` (three full stops, not U+2026) | `warn`, or `neg` at 10 min or less | none |
| second_decline | retry declined too | `That card was declined too. Your session ends at {HH:MM} ET.` | `warn` / `neg` at 10 min or less | `Update card` |
| paid | grace ended with the charge succeeded; shown 60s | `Payment received. You're set for this paid day.` (daily) / `Payment received. Your plan is renewed.` (plan) | `pos` (`border-pos/40 bg-pos/12 text-pos`) | none |

Words: billingView.ts:34-41. `{HH:MM} ET` from `etTime` (billingView.ts:85-93, 24-hour, `24:` rewritten to `00:`). `{N}` = minutes left rounded up (billingView.ts:240). `{M:SS}` from `clock()` (billingView.ts:147-149). The countdown is the server's `endsAt`, ticking each second (useBillingState.ts:63-71). If time runs out before the next read, the board is replaced by the card screen (billingView.ts:236-238).

Text uses `.num` and is `aria-hidden`; a screen-reader-only `role="status"` copy is announced once per phase, `assertive` in red, `polite` otherwise (BillingBand.tsx:19-39). Button: `border-current`, class `uppercase` (BillingBand.tsx:40-48). Click "Update card": opens a new tab to Stripe's portal; the tab closes itself if no portal URL comes back (useDeskBilling.ts:61-73).

#### A.10.2 Tab title and OS notifications

| Item | Shown when | Exact text / glyph | Computed from | Notes |
|---|---|---|---|---|
| Tab title prefix | grace running | `⚠ {N}m · payment · {page title}`; last minute `⚠ {M:SS} · payment · {page title}` | billingView.ts:138-139, 242; useBillingTitle BillingBand.tsx:57-70 | `⚠` U+26A0 (warning: payment deadline); `·` U+00B7. Restored when the band goes |
| OS notification | grace running, browser permission ALREADY granted, more than 10 min left, once per grace | title `TMI`; body `Your payment didn't go through. Your session ends at {HH:MM} ET.` / `Your plan's renewal didn't go through. Your session ends at {HH:MM} ET.` | billingView.ts:43-45, 274-293; useDeskBilling.ts:47-58 | the desk never asks for permission |
| OS notification | 10 min or less left, once | `Your session ends at {HH:MM} ET. Update your card to stay signed in.` | billingView.ts:46, 289-292 | |

#### A.10.3 Trial chip (header)

| Item | Shown when | Exact text | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Trial chip (button) | door `trial` and the trial end is known | `Free trial ends {Day} {h}:{mm}{am/pm} ET` e.g. format `Mon 10:00am ET` | outline `border-line-2` `bg-panel-2` `text-ink-2`; NOT uppercase; no colour change, no countdown | BillingScreens.tsx:102-116; DESK_WORDS.trialChip billingView.ts:59; trialEndShort :95-104; billingView.ts:208-211 | hover and aria-label: `Your free trial ends at {same}. You will not be charged.` (billingView.ts:60). Click opens the Billing panel |

#### A.10.4 Screens that replace the board (components/BillingScreens.tsx)

The header stays; summary, filters, feed banner, board and drawer are not shown (DashboardShell.tsx:516-522, 754). Centred, heading 17px `text-ink`, lines 13px `text-ink-2`. PRIMARY button style: `border-accent/50 bg-accent/15 text-accent`, class `uppercase`; SECONDARY: plain `text-ink-2` text (BillingScreens.tsx:11-13).

**Update-your-card screen** (`card_required`; door `charge_first` with no pending charge, or grace ran out on the page): BillingScreens.tsx:15-37, words billingView.ts:48-54.

| Item | Shown when | Exact text |
|---|---|---|
| Heading | always | `Update your card to open the desk.` |
| Line | amount known, daily | `Your payment of {$amount} didn't go through.` |
| Line | amount known, plan | `Your plan's renewal of {$amount} didn't go through.` |
| Line | session end known | `Your session ended at {HH:MM} ET because the payment didn't go through.` |
| Button (primary) | always | `Update card` (opens Stripe portal in new tab) |
| Under button | always | `Your card is tried again as soon as you update it. No refunds.` (`text-ink-3`) |
| Contact link | always | `Contact us` (`text-accent`, `mailto:desk@tmitrader.com`) |

`{$amount}`: `$5` style for whole dollars, `$5.50` otherwise (dollars(), billingView.ts:106-109). Amount comes from the latest charge or the grace (billingView.ts:217).

**Checking screen** (door `charge_first` and the charge is PENDING): BillingScreens.tsx:40-49, `role="status"`, no button.

| Item | Exact text |
|---|---|
| Heading (daily) | `Checking your payment...` |
| Heading (plan) | `Checking your plan's renewal...` |
| Line | `The desk opens when the payment is confirmed.` |

(billingView.ts:80-82, 219-221.) Ellipses are three full stops.

**Buy screen** (door `buy_first`, four cases): BillingScreens.tsx:51-99, words billingView.ts:62-78, chooser billingView.ts:174-199. First button is primary, the rest secondary text.

| Case | Shown when | Heading | Line | Buttons |
|---|---|---|---|---|
| trial_ended | trial ran out, nothing bought (also the fallback) | `Your free trial has ended.` | `You were not charged. We do not keep your card, only a code that identifies it. To keep using TMI, choose a day or a plan. You will enter a card again.` | `See pricing`, `Sign out` |
| plan_ended | cancelled plan ran to its end | `Your plan has ended.` | `To keep using TMI, choose a day or a plan.` | `See pricing`, `Sign out` |
| card_removed | daily buyer removed the card | `Add a card to open the desk.` | `You removed your card, so nothing was charged for this paid day. A paid day costs $5.50. Add a card to continue. No refunds.` | `Add card` (Stripe portal, new tab), `Sign out` |
| no_access | never bought, no running trial | `This account has no access yet.` | `You are signed in as {email}. Access is by purchase, and is tied to the email address you sign in with.` | `Start free trial` (only if no trial ever taken), `See pricing`, `Sign out` |

Links: `See pricing` to `/pricing`, `Start free trial` to `/trial` (useDeskBilling.ts:11-12); `Sign out` is a POST to `/auth/signout` (BillingScreens.tsx:78-87).

#### A.10.5 Billing panel (components/BillingPanel.tsx, lib/dashboard/billingPageView.ts)

Opened by the header `Billing` button or the trial chip. A right-edge panel, max 460px, `role="dialog"`, `aria-label="Billing"` (BillingPanel.tsx:79-84). Two tabs: billing and history.

| Item | Shown when | Exact text | Colour | Computed from | Notes |
|---|---|---|---|---|---|
| Heading | billing tab / history tab | `Billing` / `Billing history` | `text-ink` | BillingPanel.tsx:86; billingPageView.ts:22, 48 | |
| Close | always | `ESC` (class `uppercase`), `aria-label="Close"` | `text-ink-3`, hover ink | BillingPanel.tsx:87-89 | click closes; see Unclear about the Esc key |
| Row labels | billing tab | `Plan`, `Price`, `Paid through`, `Renews` (plan) or `Next charge` (daily) | `text-ink-3`, class `uppercase` | billingPageView.ts:23-27; BillingPanel.tsx:99-106 | |
| Plan values | plan account | Plan: `Monthly` / `Six months` / `Annual`; Price: `$89 a month` / `$499 for six months` / `$899 a year`; Paid through: `{Month d}` (calendar date); Renews: `{Month d}, at the price then in force` or, if cancelled, `Ends {h:mm}{am/pm} ET on {Weekday}, {Month d}. It will not renew.` | `text-ink` | billingPageView.ts:28-29, 35-36, 112-122 | |
| Daily values | daily account | Plan: `Daily`; Price: `$5.50 a day`; Paid through (only when today's charge succeeded): `{h:mm}{am/pm} ET on {Weekday}, {Month d}`; Next charge: `The next paid day you sign in on`, or with no card `None. There is no card on file.` | | billingPageView.ts:30-34, 132-140; paidThroughAt account.ts:105-110 | |
| Cancel plan | plan that still renews | `Cancel plan` | outline button | billingPageView.ts:37, 125; BillingPanel.tsx:108-112 | ONE STEP: the click cancels; no "are you sure" (BillingPanel.tsx:10-12) |
| Remove card | daily with a card, or a cancelled plan with a card (never a plan that still renews) | `Remove card` | outline | billingPageView.ts:38, 127, 142 | ONE STEP |
| Remove card note | when Remove card is offered | `You will not be charged again. It takes effect for the next paid day, and does not end a day you have already paid for.` | `text-ink-2` | billingPageView.ts:40 | |
| Billing history | always on billing tab | `Billing history` | outline | BillingPanel.tsx:118-120 | switches to the history tab; no button back to the billing tab (see Unclear) |
| Under buttons | billing tab | `Prices are in US dollars. No refunds.` | `text-ink-3` | billingPageView.ts:41 | |
| Confirmation (cancel) | after a successful cancel | `Your plan is cancelled. It will not renew. You keep access to {endTime}. No refunds.` | `text-ink`, `role="status"` | billingPageView.ts:43; BillingPanel.tsx:69-71 | replaces the panel body |
| Confirmation (remove, daily) | after remove on daily | `Your card is removed. You will not be charged again. If this paid day is already paid for, access ends at {endTime}.` or, with no paid-through time, `Your card is removed. You will not be charged again.` | | billingPageView.ts:44-45 | |
| Confirmation (remove, plan) | after remove on a cancelled plan | `Your card is removed. You will not be charged again. You keep access to {endTime}.` | | billingPageView.ts:46 | |
| History columns | history tab, rows exist | `Date`, `Amount`, `Covers`, `Status` (class `uppercase`, `text-ink-3`) | | billingPageView.ts:49-52 | |
| History row | each billed day | Date `{Month d}`; Amount `$5` or `$5.50` style; Covers `One paid day`; Status `Paid` / `Declined` / `Pending` / `Refunded`; `Receipt` link on paid rows | date and amount `.num`; Receipt `text-accent` | historyRow billingPageView.ts:149-158 | Receipt opens in a new tab |
| Receipt note | history tab | `A receipt link stops working after 30 days. To get an older receipt, email desk@tmitrader.com.` | `text-ink-3` | billingPageView.ts:56 | |
| Plan invoices | history tab, plan account | `Plan invoices` | `text-accent` | billingPageView.ts:57; BillingPanel.tsx:158-162 | hover `Opens in a new tab.`; opens Stripe portal |
| Failure note | history load or an action failed | `If you cannot use this page, email desk@tmitrader.com and we will do it for you.` | `text-neg` | billingPageView.ts:59; BillingPanel.tsx:165 | |

`{endTime}` format: `{h}:{mm}{am/pm} ET on {Weekday}, {Month} {d}`, e.g. the module's own example "8:00pm ET on Friday, October 17" (etStamp billingPageView.ts:75-81).

### Item count

135 items inventoried (each table row above counts as one item; A.0 token rows and A.1 routing rows excluded). 19 unclear items.

### Unclear from the code

1. `Market: {feed} · DATA STALE` and `... DATA DEGRADED` hover sentences print `[U+2014]s` when the message age is unknown (lib/market/health.ts:266, 279). Flagged glyph; also unclear what a user should read from "for [U+2014]s".
2. Before data loads, a transport failure reads `The desk unavailable: {detail}` (DashboardShell.tsx:437 with feedFailure.ts:83), which is ungrammatical, and `{detail}` is a raw `API responded 502` or a browser error such as a fetch message, although feedFailure.ts:63 says the text is "Never the raw status". Same for the header line `Research unavailable: API responded {status}`.
3. The red header line calls the dashboard poll "Research" (DashboardHeader.tsx:134). Whether a user knows that "Research" means the whole desk payload (tickers, meta) is not clear from the code.
4. `meta.error` can be any upstream message (`describeError`, lib/data/index.ts:96-101), so its words are not knowable from source.
5. Research offline hover says `Start the desk with npm run desk.` (lib/research/health.ts:50): an operator instruction shown to every trader; the market and scheduler texts were deliberately stripped of commands (health.ts:182-184, view.ts:85).
6. Scheduler hover can read `Last heartbeat never ago. Checkpoints will be missed.` (lib/desk/view.ts:98) when the stamp is unreadable.
7. The "Next" checkpoint label is lower-cased by code (DeskAssessmentStatus.tsx:59), so `RTH reassessment` shows as `rth reassessment` and `RTH close` as `rth close`. Intent unclear.
8. The subline's `Last:` time has no `ET` while `Next:` has one (view.ts:156-160), and the inline "Next" item has no `ET` at all.
9. When the market light's words are hidden (state normal for the hour) only a coloured dot shows; the code gives no visible text for that dot besides its hover.
10. `Universe: full` (MarketStatus.tsx:184) is the default branch but the badge never renders for FULL; it is reachable only for an unknown mode value.
11. The Billing panel's `ESC` close is a click target only: no Escape key handler exists in BillingPanel.tsx or DashboardShell.tsx (Escape handlers found only in Popover, PriceRangeControl, TickerDrawer, useModalFocus).
12. The Billing panel has no control to go back from the history tab to the billing tab (BillingPanel.tsx:32, 118); only Close.
13. History rows always say `One paid day` under Covers (billingPageView.ts:155), even for a plan account, although `covers` also defines `One month`, `Six months`, `One year` (:54).
14. After a cancel, the confirmation shows `You keep access to {endTime}` with an empty string if the server returns no `endsOn` (BillingPanel.tsx:71), producing "You keep access to . No refunds.". Same pattern for remove on a plan (:74) and `Renews` with an empty date (billingPageView.ts:120-121).
15. `no_access` buy screen with no email would read `You are signed in as . Access is by purchase...` (billingView.ts:193, `state.email ?? ''`).
16. The trial chip shows nothing when the trial end is unknown (billingView.ts:210); the user then has no on-desk sign of being on a trial.
17. The review banner time format comes from `Intl` `dateStyle: 'medium'`/`timeStyle: 'short'`, which differs from every other time on the desk (24-hour HH:MM); whether that is intended is not stated.
18. The Refresh button stays in review mode (DashboardHeader.tsx:111-118 has no read-only check); whether a reviewer is meant to have it is unclear.
19. Session phase falls back to the raw code if a phase is unmapped (MarketStatus.tsx:154); no such phase exists today.

## B. Above the board: summary, filters, focus, briefing, checkpoints

Source: `A:\mointel-design-inv` at 366eeebd. All references are file:line in that tree. Read-only; nothing was run.

### B.0 Order on screen and what hides the whole area

Top to bottom, as `components/DashboardShell.tsx` renders it (lines 524 to 667):

1. Summary line with the filters inline (`MarketSummary` wrapping `FilterBar`), DashboardShell.tsx:526-540.
2. `FeedBanner` ("not updating" banner), DashboardShell.tsx:542. Not in this section's brief; not inventoried here (see Unclear, last item).
3. Inside the scrolling `main` (DashboardShell.tsx:556): Focus strip (557-565).
4. Briefing line, or the inline briefing between sessions (567-605).
5. Screen-reader-only announcement of a new report (606-609).
6. Checkpoint row: "Back to live" button and the View selector (615-638).
7. Filter banner, only on the live board (640-646).
8. Then either the live Discovery board (another section) or the frozen checkpoint board `AssessmentSnapshotBoard` (648-667).

Conditions that hide all of B:
- Before the first dashboard payload, the whole page is one centred line instead (DashboardShell.tsx:433-441): `Loading desk…` (ends in U+2026 HORIZONTAL ELLIPSIS), class `uppercase`, colour `text-ink-3`; or, on a feed failure, the text from `feedFailureLine(feed.failure, 'The desk')` (lib/dashboard/feedFailure, not opened). This is page-level, not strictly this area.
- A billing screen (`card_required`, `checking`, `buy`) replaces everything from the summary line to the bottom (DashboardShell.tsx:517-523). Only when `billing.view.screen` is none of those does B render (524).

Colour tokens used below (app/globals.css; dark is default lines 9-39, light under `html[data-theme="light"]` lines 71-90):

| Token | Dark | Light | Typical meaning in this area |
|---|---|---|---|
| `ink` | #e9edf3 | #0d1218 | primary text, ticker, price |
| `ink-1` | #c7cedb | #253042 | lead sentence, level price |
| `ink-2` | #97a1b0 | #475365 | secondary text |
| `ink-3` | #8792a3 | #566173 | labels, hints, quiet text |
| `pos` | #2fc46f | #0f7a45 | green: up, day 1, frontside, fresh catalyst |
| `warn` | #e8ac33 | #8a5a00 | amber: filter banner, limit message, late, snapshot badges, range error |
| `neg` | #f4574e | #c22a22 | red: backside, dirty float, snapshot load error |
| `accent` | #4d93ff | #1d5fd1 | blue: user-owned or active state (lit chip, chosen range, pinned star, Read button, new-report mark) |
| `panel`, `panel-2`, `panel-3`, `desk` | surfaces | | backgrounds; `panel-3` is the hover background |
| `line`, `line-2` | borders | | |

Class `num` (globals.css:143-147) sets monospace tabular figures; every number marked `num` below uses it.

---

### B.1 Summary line (counts)

`components/MarketSummary.tsx`. One row, `min-h-[26px]`, horizontally scrollable (`overflow-x-auto`), `bg-panel`, bottom border (MarketSummary.tsx:133). Always shown when B renders. Each segment is a number (`num text-[13px] font-semibold`, tone below) followed by a word (`text-[11px] text-ink-3`) (138-139). No CSS uppercase on these words.

Counts come from `boardCounts(merged.discovery, cyclePhase)` (DashboardShell.tsx:321; lib/dashboard/boardCounts.ts:45-57): each number is how many rows of the whole main board would remain if only that chip's filter were on, by running `rowMatchesFilters` with only that filter set (boardCounts.ts:46-47). They do not change when other filters are applied. Plain integers, no separators.

| # | Item | Shown when | Exact text | Colour | Computed from | Click / hover |
|---|---|---|---|---|---|---|
| 1 | Ranked count | always | `{n}` + `ranked` | number `text-ink` | `counts.onBoard` = `rows.length` of `merged.discovery` (boardCounts.ts:50) | Not clickable (a `span`, MarketSummary.tsx:143-152). Hover `title` = RANKED_HINT verbatim: "Names in the ranking at the time shown. The board shows the first 12, 25 or 50 of them, plus moving names outside them, up to a limit." (boardCounts.ts:32-33) |
| 2 | Day 1 chip | always | `{n}` + `day 1` | number `text-pos` | `counts.dayOne`: rows whose computed cycle phase is `DAY_ONE` (boardCounts.ts:51; view.ts:37-42, 646-649) | Button. Toggles Cycle filter between `DAY_1` and `ALL` (MarketSummary.tsx:73, 186-188). Title: "The move began today. Click to show only these names." |
| 3 | Frontside chip | always | `{n}` + `frontside` | `text-pos` | `counts.frontside`: phase `FRONTSIDE` | Toggles Cycle `FRONTSIDE`/`ALL`. Title: "Still making the cycle high. Click to show only these names." |
| 4 | Backside chip | always | `{n}` + `backside` | `text-neg` | `counts.backside`: phase `BACKSIDE` | Toggles Cycle `BACKSIDE`/`ALL`. Title: "Half the move or more given back, still in play. Click to show only these names." |
| 5 | Dirty float chip | always | `{n}` + `dirty float` | `text-neg` | `counts.dirtyFloat`: `resolveRisk(row).code === 'DIRTY_FLOAT'` (boardCounts.ts:54; view.ts:651-659) | Toggles Structure `DIRTY`/`ALL`. Title: "Structure or float reads DIRTY FLOAT. Click to show only these names." |
| 6 | Fresh catalyst chip | always | `{n}` + `fresh catalyst` | `text-pos` | `counts.freshCatalyst`: `resolveWhy(row).freshness === 'FRESH'` (boardCounts.ts:55; view.ts:670-673) | Toggles Freshness `FRESH`/`ALL` (MarketSummary.tsx:127). Title: "The desk found a catalyst and it is FRESH: the green rows in Why. Click to show only these names." |
| 7 | Filtered count | only while any filter is active (`isFilterActive`, view.ts:94-103) | `{n}` + `matching filter` | both `text-accent` | `discoveryRows.length`, the board rows passing all filters (DashboardShell.tsx:330-333, 528) | Not interactive. Sits in a reserved right-aligned slot (`ml-auto min-w-[132px]`) that stays empty when no filter is on (MarketSummary.tsx:173-181). |

Chip states (MarketSummary.tsx:156-167): `aria-pressed` true when that chip's filter value is set; lit chip gets `bg-accent/15 ring-1 ring-accent/40`; hover `bg-panel-3`. Title format for every clickable chip: `{hint}. Click to show only these names.` (160).

The FilterBar renders between chip 6 and item 7 (`{children}`, MarketSummary.tsx:171).

### B.2 Filter controls (inline on the summary line)

`components/FilterBar.tsx`. A group with a left border, after the chips (FilterBar.tsx:95). State: `FilterState` in DashboardShell (`useState(DEFAULT_FILTERS)`, DashboardShell.tsx:267). Defaults (lib/dashboard/view.ts:83-90): search `''`, every group `ALL`. Not stored anywhere: filters reset on page reload (no storage call in DashboardShell for filters).

The same filters apply to the live Discovery board (DashboardShell.tsx:330-333). They are not applied to the frozen snapshot board (AssessmentSnapshotBoard takes no filters, DashboardShell.tsx:666) and the filter banner is hidden while a snapshot is shown (640). See Unclear.

Each group (FilterBar.tsx:44-83): a group label (`text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase`, so shown in capitals) then a segmented radio group (`role="radiogroup"`, `aria-labelledby` the label). Each option is a button `role="radio"` with `aria-checked`; label text is CSS `uppercase`, `text-[11px] font-semibold`. Selected: `bg-accent/15 text-accent`; unselected: `bg-panel-2 text-ink-3`, hover `bg-panel-3 text-ink-2`. Clicking an option sets that group to that value (no toggle-off; choose `All` to clear). Option `title` (hover) given where listed.

| # | Item | Shown when | Group label (source; shown uppercase) | Options in order: label (value) [hover title] | Default | Predicate (what it keeps) |
|---|---|---|---|---|---|---|
| 8 | Search box | always | none; placeholder `Search ticker` (FilterBar.tsx:101). Typed text is CSS `uppercase`; placeholder is `normal-case` | free text, `type="search"`, width `w-32`, spellcheck and autocomplete off | empty | Keeps rows whose ticker CONTAINS the trimmed, upper-cased text (substring, not prefix) (view.ts:628-629). Every keystroke filters. |
| 9 | Setup grade | only when `market.snapshot?.setupGrades != null` (FilterBar.tsx:108; DashboardShell.tsx:538) | `Setup grade` (filterLabels.ts:24) | All (ALL), A, B, C, D, Not graded (NOT_GRADED). Labels are SETUP_GRADE_FILTERS with the prefix "Setup grade " removed (filterLabels.ts:34-37; setupGrade.ts:240-247). No titles. | All | `matchesSetupGradeFilter` (setupGrade.ts:253-262): A/B/C match stored grade; D matches stored `AVOID`; Not graded matches stored `UNKNOWN`; a row with no grade (`NOT_YET`) matches no option except All. |
| 10 | Cycle | always | `Cycle` | All (ALL); Day 1 (DAY_1) [The move began today]; Frontside (FRONTSIDE) [Still making the cycle high]; Off high (OFF_HIGH) [Off the high, less than half the move given back]; Backside (BACKSIDE) [Half the move or more given back, still in play] (filterLabels.ts:39-45) | All | Computed cycle phase from the row's dossier (`cyclePhaseOf`, cycle.ts:189-191): DAY_1 to DAY_ONE, FRONTSIDE, OFF_HIGH to PULLBACK, BACKSIDE (view.ts:37-42). Rows with no computed phase match nothing but All. |
| 11 | Structure | always | `Structure` | All; Dirty (DIRTY) [Dirty Float]; Unknown (UNKNOWN) [Unknown Structure]; Other (OTHER) [Neither Dirty Float nor Unknown Structure] (filterLabels.ts:47-52) | All | `resolveRisk(row).code`: Dirty = `DIRTY_FLOAT`; Unknown = `STRUCTURE_UNKNOWN` or `NOT_RESEARCHED`; Other = neither (view.ts:651-659). |
| 12 | Freshness | always | `Freshness` | All; Fresh (FRESH) [The catalyst is from today]; Recent (RECENT) [The catalyst is from yesterday]; Old (STALE) [The catalyst is from before yesterday] (filterLabels.ts:58-63) | All | `resolveWhy(row).freshness` equals the value (view.ts:670-673). Not-researched and researching rows have freshness null (why.ts:194, 209) and match only All. |
| 13 | Catalyst grade | always | `Catalyst grade` (filterLabels.ts:28) | All; A; B; C [C includes names with no company event in the desk's evidence.] (filterLabels.ts:32, 65-70) | All | `resolveWhy(row).grade` equals the letter (view.ts:673). Letters from `gradeLetter` (why.ts:467-472): A = STRONG or LEGITIMATE_POSITIVE; B = MODERATE_MIXED_SECONDARY; C = WEAK_NEGATIVE_DILUTIVE or NONE; anything else is [U+2014] and matches no letter. |
| 14 | Clear button | only while any filter is active (FilterBar.tsx:155) | `Clear` (161), CSS uppercase, `text-ink-2`, hover border accent | | | Resets all filters to DEFAULT_FILTERS (DashboardShell.tsx:536). |

Note: the summary chips (items 2 to 6) and these groups write the same fields, so clicking chip "day 1" lights "Day 1" in the Cycle group and vice versa.

### B.3 Focus strip (the user's pinned list)

`components/FocusStrip.tsx`, rendered first inside `main` (DashboardShell.tsx:557-565). State from `useFocus` (lib/hooks/useFocus.ts): in-memory only, per browser tab, lost on reload (useFocus.ts:19-28, 58-59). Limit `FOCUS_LIMIT = 6` (useFocus.ts:55). Order = order pinned (view.ts:140-162). A pinned ticker with no desk row is not drawn but stays pinned (view.ts:136-138). Review sessions (`readOnly` from useDeskMode) cannot pin.

| # | Item | Shown when | Exact text / glyph | Colour | Computed from | Notes |
|---|---|---|---|---|---|---|
| 15 | Empty one-line strip | no pinned rows drawn and no message (FocusStrip.tsx:56) | heading `Focus` (CSS uppercase, `tracking-[0.14em]`), then `Pin a ticker with ☆ to keep it here.`; review session: `Nothing pinned for this session.` (59-61) | both `text-ink-3` | `rows.length`, `readOnly` | ☆ is U+2606 WHITE STAR (the unpinned star). |
| 16 | Strip header | rows exist or a message exists (68-86) | `Focus` (CSS uppercase), `{rows.length}/{limit}` e.g. `2/6` (`num`), `pinned for this session` | heading `text-ink-2`; count and words `text-ink-3` | `focusRows.length`, `focus.limit` | Count is drawn cards over 6. |
| 17 | Limit message | after trying to pin a 7th name (useFocus.ts:76-85) | `Focus holds 6 names. Unpin one to add another.` (text built from FOCUS_LIMIT); hover `Dismiss` (FocusStrip.tsx:81) | `text-warn`, `border-warn/40 bg-warn/10` | `focus.message` | Clicking it dismisses it. Any later pin/unpin also clears it (useFocus.ts:72). |
| 18 | Empty text under header | message present but no rows (88-96) | `Pin a ticker from Discovery with ☆ to keep it here.`; review: `Nothing is pinned for this session.` | `text-ink-3` | | Different wording from item 15 for the same empty state (see Unclear). |
| 19 | Focus card | one per drawn pinned row (98-108, 133-249) | Card 326px wide | border `line-2`, hover `accent/50` | `buildDeskRead(row)` (deskRead.ts:427-455) | Whole card is a button (`role="button"`, tabIndex 0): click, Enter or Space opens the ticker's drawer (152-158). Focus ring `border-accent`. |
| 20 | Pin star (FocusToggle) | top-left of each card; also on Discovery rows and the drawer (DecisionCells.tsx:627, TickerDrawer.tsx:254). Not rendered at all in review sessions (FocusToggle.tsx:30-31) | `★` U+2605 BLACK STAR when pinned (always on a Focus card); `☆` U+2606 WHITE STAR when not | pinned `text-accent` (hover `accent/70`); unpinned `text-ink-3` (hover accent) | `focus.isFocused` | Click toggles pin; does not open the drawer (stopPropagation, 43-46). aria-label: `Remove {T} from Focus` / `Add {T} to Focus`. Title pinned: `{T} is in Focus. Removing it changes nothing else: it stays in Discovery, stays tracked, and keeps its research.`; unpinned: `Keep {T} in Focus for this session` (37-42). |
| 21 | Ticker | each card | the symbol | `text-ink`, 15px bold | `row.ticker` | |
| 22 | Price | each card | `formatPrice`: 4 decimals under $1, 2 decimals $1 to $999.99, 0 decimals at $1000+; missing = [U+2014] (lib/format.ts:117-122). No `$` sign. | `text-ink` | `telemetry.price` | |
| 23 | Percent change | each card | `formatSignedPercent`: `+12.3%`, `-4.0%`, 1 decimal, `+` only when positive; missing [U+2014] (format.ts:124-127) | `changeTone`: >0 `text-pos`, <0 `text-neg`, 0 or null `text-ink-2` (StatusBadge.tsx:83-88) | `telemetry.percentChange` | Baseline not stated on the card (see Unclear). |
| 24 | Price source tag | each card | CSS uppercase, 9px: `SIP` (sip-trade), `BAR` (sip-bar or sip-historical-bar), `SNAP` (sip-snapshot), otherwise the feed name upper-cased (telemetry.ts:95-100); appended ` stale` when `telemetry.stale` (FocusStrip.tsx:191); no market data: [U+2014] (telemetry.ts:185) | `text-accent` when source is ALPACA, else `text-ink-3` | `telemetry.sourceLabel`, `telemetry.stale` | Hover: ALPACA and no feed banner: `Live Alpaca market data`; ALPACA while the feed banner is up: `No market data received since this page opened` or `Last market data received, {time} ET` (feedBanner.ts:149-152); no data: `No live market data for this ticker.` (feedBanner.ts:146). |
| 25 | Three conclusion badges | each card (196-215) | Cycle, catalyst, structure labels, CSS uppercase, 10px; truncated at 150/110/110px; hover = full label or source text | Badge tones (StatusBadge.tsx:9-16): pos green, warn amber, neg red, neutral grey on panel-3, dim faint | `resolveConclusions` (deskRead.ts:369-425) | Cycle labels: `DAY 1`, `FRONTSIDE`, `OFF HIGH`, `BACKSIDE`, `PRIOR RUN`, `NO RUN` (cycle.ts:47-54), or `STARTED TODAY` (cycle.ts:160, 171-177). Cycle tones: DAY 1 and FRONTSIDE pos, OFF HIGH warn, BACKSIDE neg, others dim (cycle.ts:61-74). Cycle hover: e.g. `up 53.0% from 1.20 · high 1.84 on 2026-10-15 · 12.0% of the move given back · 1 session since the high · through 2026-10-16 close` (cycle.ts:85-127; `·` is U+00B7). Catalyst labels (neutral tone): `🔥 STRONG` (U+1F525), `🟢 LEGITIMATE POSITIVE` (U+1F7E2), `🟡 MODERATE / MIXED / SECONDARY` (U+1F7E1), `🔴 WEAK / NEGATIVE / DILUTIVE` (U+1F534), `NONE` (research/view.ts:47-54); hover = dossier catalyst summary. Structure labels: `CLEAN` pos, `CAUTION` warn, `DIRTY FLOAT` neg (research/view.ts:63-68; deskRead.ts:168-179); hover = dossier structure summary. Unresolved: `CYCLE NOT ESTABLISHED`, `CATALYST UNKNOWN`, `STRUCTURE UNKNOWN` (dim) with hovers `Analysis ran but did not establish a cycle boundary for this name.`, `Analysis ran but reached no catalyst conclusion.`, `Analysis ran but reached no structural conclusion.` (deskRead.ts:148-158). Research in flight or failed: the research status label `ANALYSIS PENDING` or `ANALYSIS FAILED` (intelligence.ts:49-55), hover `Desk research is under way for this ticker.` (deskRead.ts:235). Nothing at all: `NOT ANALYZED` (dim, deskRead.ts:161-166). |
| 26 | RVOL | each card (218-222) | `RVOL ` then `formatMultiple`: `23.4x`, `150x` at 100+, missing [U+2014] (format.ts:130-134); then ` #{rank}` when ranked | label `text-ink-3`, value `text-ink-2`, `#rank` `text-accent` | `telemetry.rvol`, `telemetry.rvolRank` | 10px. |
| 27 | Spread | each card (223-226) | `SPRD ` then `{spreadPct.toFixed(2)}%`, e.g. `1.25%`; missing [U+2014] (225) | label ink-3, value ink-2 | `telemetry.spreadPct` | |
| 28 | Nearest level above / below | each card, two lines (231-234; NearestLevel 114-131) | Line starts `▲` U+25B2 (above) or `▼` U+25BC (below). With a level: `{price} {type}{ dated Oct 7}{state tag} {distance}`. Price 3 decimals under $1 else 2, or a zone `{low}–{high}` (U+2013) (deskRead.ts:244-257). Type words: `HOD`, `LOD`, `PM high`, `PM low`, `RTH high`, `AH high`, `PD high`, `PD low`, `PD close`, `VWAP`, `whole $`, `half $`, `resistance`, `support`, `reclaim`, `trigger`, `hist. resistance`, `blue sky`, `level` (priceLevels.ts:199-219). Date suffix ` dated {Mon D}` (plus `, {YYYY}` if not this year) (levelDate.ts). State tag: `LOST SUPPORT`, `PRICE ABOVE`, `AT LEVEL` (priceLevels.ts:239-243), preceded by ` · ` when a date is shown else a space. Distance `+0.12` / `-0.08` (2 decimals), or [U+2014] if unknown. No level: `▲ open` / `▼ open` | glyph and type ink-3; price ink-1; state tag `text-warn`; distance: above `text-pos`, below `text-warn` | `read.nextUp[0]`, `read.nextDown[0]` (deskReadLevels, deskRead.ts:267-275) | Distance unit is dollars, unsigned meaning implied by sign. |
| 29 | Structural warning | card has one (237-247) | first structural warning from the dossier, condensed to 240 chars at a sentence break or cut with `…` U+2026 (deskRead.ts:319-326); one line clamp. Hover: full text, plus ` (SOURCE COVERAGE INCOMPLETE)` when source coverage was incomplete (241-243; deskRead.ts:351) | `text-warn/90` | `read.structuralWarning` | |
| 30 | Changed flash | ticker in `feed.changedTickers` (160) | no text; class `row-changed` | brief accent tint (22% accent fading over 2.4 s); reduced motion: steady 12% accent tint (globals.css:169-189) | `useDashboard().changedTickers` | |

### B.4 Briefing line (and inline briefing between sessions)

`components/SessionReports.tsx` `BriefingLine` (66-151) and `InlineBriefing` (165-277); chosen in DashboardShell.tsx:568-605. Payload: `useSessionReports()` (null on 404 or no `slots`; useSessionReports.ts:42-46).

Which variant shows (DashboardShell.tsx:568-605):
- `reportChoice.kind === 'STRADDLE'`: straddle line (item 31). Unreachable in this build: `board` is hard-coded `null` (DashboardShell.tsx:375), and `chooseReportRange` only returns STRADDLE when a board range is given (sessionReports.ts:818-848).
- Else, timeline exists and off-hours (`isOffHoursEmpty`: session phase `CLOSED` or `NEXT_DAY_PREP` and the live board has 0 rows, offHours.ts:21-23): `InlineBriefing`.
- Else, timeline exists: `BriefingLine`.
- Else nothing (no reports payload, no ranges, before mount, or no slots for the range). The timeline needs `mounted` (DashboardShell.tsx:384-387).

Report range: viewer's stored choice (`localStorage` key `mointel.reportRange`, DashboardShell.tsx:58, 289, 397-400) if it is still configured, else the configured default (sessionReports.ts:826-832). Configured ranges come from env `REPORT_RANGES`; default list is one range `$1–$20` (lib/desk/reports/ranges.ts:14). Labels `$1–$20` use U+2013 EN DASH; cents shown only when not whole (ranges.ts:16-19).

The line itself (Band, SessionReports.tsx:279-295): a `section` `aria-label="Session briefing"`, `min-h-8`, 12px text, hidden when printing; a 2px left edge that is transparent normally and `border-l-accent bg-accent/10` (accent edge plus tint) while a new-report mark is showing. Left label `Briefing`, CSS uppercase, `text-ink-3`.

| # | Item | Shown when | Exact text | Colour | Computed from (file:line) | Controls / notes |
|---|---|---|---|---|---|---|
| 31 | Straddle choice | STRADDLE (unreachable now) | `Your board spans {A} and {B}. Briefings are written per range:` then one button per candidate range labelled with its range label; group aria-label `Choose a briefing range` (92-108) | text ink-2; buttons ink-2 on panel-2 | `choice.candidates` | Click stores that range. |
| 32 | Line status text | always on the line (124-126) | `briefingLineText` (sessionReports.ts:1012-1030), title = report kind: `Premarket briefing`, `Into-the-open briefing`, `Power-hour briefing`, `After-hours briefing`, `Evening briefing` (sessionReports.ts:67-74). States: not yet due: `{Title} · due {time}` or `{Title} · not yet due`; due, no report yet, still in window: `{Title} · being checked`; missed: `No {title lower-case} for this session`; published: `{Title} · {time}` | published: `font-semibold text-ink`; other states `text-ink-2` | `timeline.current` from `reportTimeline` (sessionReports.ts:718-775) | `·` U+00B7. Time format `8:31 pm ET` (lower-case am/pm), with `Oct 7, ` in front when not the reader's ET day (`etClockText`, sessionReports.ts:971-975; `etStamp` 479-487). The line shows the latest slot whose time has passed, or the first slot when none has (sessionReports.ts:773). |
| 33 | New / Revised mark | report published and not marked read in this browser, and the read list has loaded (DashboardShell.tsx:396; reportNotice.ts:61-83) | `New` or `Revised` (CSS uppercase, 10px). Hover: `Published {when} ET. Not opened in this browser.` / `Revised edition published {when} ET. Not opened in this browser.`; without a parseable time: `Not opened in this browser.` / `Revised edition. Not opened in this browser.` | `text-accent`; the whole line gets the accent edge and tint | `reportMark` | `Revised` only when the 10 pm edition wrote new lines or summary (`revisionChange`); a "Published again" edition counts as read if its 8:30 edition was (reportNotice.ts:38-44). `{when}` is `h:mm am/pm` or `Oct 7, h:mm am/pm`. |
| 34 | Late tag | published report flagged `late` (128; Late 319-328) | `late` (CSS uppercase) | `text-warn` | `current.report.late` | Hover: `Published after its scheduled time. It describes the checkpoint it was built from, not the moment it appeared.` |
| 35 | Lead sentence | published, not read, and a lead exists (130) | v5+ report: `We're watching {n} name(s) {into}.` or `Nothing on watch {into}.`, `{into}` = `into the premarket`, `into the open`, `into the last hour`, `into after-hours`, `into the next premarket` (sessionReports.ts:81-107). Older report: its stored headline (may be null, then nothing) (122-125) | `text-ink-1`, truncated | `reportLead` | Disappears once the report is read (line collapses to kind and time). |
| 36 | Missed reason | state MISSED with a recorded cause (132-134) | One of: `No {9:25 am ET or label} assessment ran.`; `The {time or label} assessment did not finish.`; `The report could not be written.`; `The report could not be checked, so it is not shown.`; `Every line failed its check, so nothing is shown.`; `No report was attempted.` (sessionReports.ts:777-792) | `text-ink-3`, truncated | `payload.missedCauses` | Label fallback is the checkpoint type label (e.g. `Open spike assessment`). |
| 37 | Range note | right side, whenever the line is CHOSEN (137) | `covers {range label}`, e.g. `covers $1–$20` | `text-ink-3`, 11px | `choice.range.label` | |
| 38 | Dismiss | mark showing (138; DismissButton 306-317) | `Dismiss`; hover `Marks this report as read in this browser. You can still open it from this line.` (reportNotice.ts:85-88) | `text-ink-3`, hover ink | `markCurrentRead` (DashboardShell.tsx:401-407) | Adds the edition to `localStorage` `mointel.reportsRead` (last 20 kept). Clears the mark and the lead sentence. |
| 39 | Read / Earlier today button | current slot has a report, or any earlier slot today has one (116-117, 139-147) | `Read` when the current report is published; otherwise `Earlier today` (CSS uppercase) | `text-accent`, `border-accent/40 bg-accent/10` | `canOpen`, `published` | Opens the report window (another section) and marks the current report read (DashboardShell.tsx:408-411). |
| 40 | Inline briefing panel | off-hours (see above), range CHOSEN, current slot PUBLISHED with a report, not collapsed (199) | `section` aria-label `Session briefing`; header label `Briefing` (CSS uppercase, ink-3); New/Revised mark and Dismiss as items 33 and 38; then `Collapse` button at right (254-261) | panel background | same timeline | Body is `ReportBody` (the same body as the report window; inventoried with the window, not here), centred at max 760px. Hidden when printing. |
| 41 | Briefing range picker (inline only) | inline panel and more than one configured range (234-253) | one button per range, labelled with its range label; `role="radiogroup"` aria-label `Briefing range` | selected `border-accent/50 bg-accent/15 text-accent`; others ink-2 | `reports.ranges` | Click stores the range (`mointel.reportRange`). With the default config (one range) it never shows. |
| 42 | Collapse / Show the briefing here | inline panel | `Collapse` (aria-expanded true) folds it to the one-row line plus a row with `Show the briefing here` (CSS uppercase, `text-accent`, aria-expanded false) that unfolds it (212-223) | | local state `collapsed` | Not remembered: resets on reload. |
| 43 | Screen-reader announcement | always present, empty unless a mark exists (DashboardShell.tsx:607-609) | `New report: {Title}, published {when} ET.` or `Revised report: {Title}, published {when} ET.` (or without `, published ...`) (reportNotice.ts:74, 81) | `sr-only` (invisible) | `mark.announcement` | `aria-live="polite"`. |
| 44 | Browser tab title prefix | while a mark is showing (DashboardShell.tsx:429-431) | `(1) ` before the page title (reportNotice.ts:91-96) | | `tabTitle` | Always `1`. |
| 45 | Report opens on load | once per page load, if the current report is published and unread, except weekdays 07:00 to 09:59 ET (reportNotice.ts:111-130; DashboardShell.tsx:418-427) | (opens the report window; no text on the line) | | `openOnLoad` | In the 07:00 to 10:00 ET weekday window only the mark shows. Market holidays are not checked (reportNotice.ts:109). |

### B.5 Checkpoint row: Back to live and the View selector

Row (DashboardShell.tsx:615-638): right-aligned, `bg-desk`, bottom border. Shown when the selector has options (today's completed checkpoints, or, when today has none, the one carried from an earlier date; offHours.ts:31-34) or a frozen board is showing.

Which board shows: `effectiveView` (offHours.ts:41-45). Default choice is AUTO (DashboardShell.tsx:272): live board, except off-hours (B.4) when it opens on today's newest checkpoint or the carried one (offHours.ts:26-28). An explicit choice always wins; picking Live sets LIVE. AUTO returns to live by itself when the session starts.

| # | Item | Shown when | Exact text | Colour | Computed from | Controls |
|---|---|---|---|---|---|---|
| 46 | Back to live | a frozen board is showing (623-631) | `Back to live` (CSS uppercase) | `text-accent`, `border-accent/40 bg-accent/10` | `selectedAssessment !== null` | Click sets choice LIVE (live board, stays live even off-hours). |
| 47 | View selector | at least one option (AssessmentHistory.tsx:38) | label `View` (CSS uppercase, 10px, ink-3); a native `select`, CSS uppercase, ink-2 | | `selectorOptions(panel)` | Options in order (56-70): `Live` (value LIVE); `Last assessment · {HH:MM}` (the newest checkpoint; duplicates its own entry below); then every checkpoint newest first as `{HH:MM} · {label}`, plus ` (late)` when generated late. Selecting one shows that frozen board; selecting Live shows the live board. Shows `Live` as selected when a choice is AUTO-live. |

Checkpoint labels (lib/market/readModel.ts:276-284, same words as lib/desk/schedule.ts:114-124): `22:00 recap`, `Structural refresh`, `First market scan`, `Premarket reassessment`, `Late-mover scan`, `Open spike assessment`, `RTH reassessment`, `RTH close`, `20:05 after-hours close`; an unknown type shows its raw type string (readModel.ts:261). `{HH:MM}` is the scheduled time in ET, 24-hour, two digits (readModel.ts:248-256); no `ET` suffix in the options.

### B.6 Filter banner (live board only)

`components/FilterBanner.tsx`; words and counts from `lib/dashboard/filterBanner.ts`. Shown only when a filter is active and the live board is showing (DashboardShell.tsx:640-646; filterBanner.ts:65). Amber box: `border-warn/35 bg-warn/12 text-warn`, 12px, `role="status"` (FilterBanner.tsx:24).

| # | Item | Shown when | Exact text | Colour | Computed from | Controls |
|---|---|---|---|---|---|---|
| 48 | Line 1: active filters and match count | any filter active | `Filters on:` then each active filter as `{Group}: {Option label}` separated by `;` with `.` after the last (e.g. `Search: AB; Cycle: Day 1; Catalyst grade: C.`), then `{X} of {Y} names match.` (or `{X} of 1 name matches.`) in semibold, then button `Clear filters` (CSS uppercase) | all `text-warn`; button `border-warn/50 bg-panel-2`, hover text ink | `activeFilters` (filterLabels.ts:86-101), `FILTER_BANNER_WORDS` (filterBanner.ts:28-38) | Order: Search, Setup grade, Cycle, Structure, Freshness, Catalyst grade. Search shown trimmed and upper-cased. Only `Catalyst grade: C` carries a hover: `C includes names with no company event in the desk's evidence.` Match-count hover: `{Y} is every name on the board before these filters. {X} match; the table shows the first 12, 25 or 50 of them, plus moving names among the rest, up to a limit.` X = rows passing filters; Y = all board rows incl. appended movers (filterBanner.ts:66-67). Clear resets all filters. |
| 49 | Line 2: moving names the filters hide | at least one "moving" row fails the filters (44-62) | `Moving names these filters hide:` then up to 5 buttons `{TICKER} +{n}%` separated by `,`, a final `.`, or `and {n} more.` when more than 5 | `text-warn`, names semibold underlined `decoration-warn/40`, hover ink | rows with `isMover` (view.ts:232-235: prior-close basis AND (board reason MOVER or `moving`)) not in the filtered set, biggest `percentChange` first (filterBanner.ts:69-81) | Percent rounded to whole number with a `+` always. Click a name opens its drawer, filters stay on. Hover: `{T}: up {pct to 1 dp}% from the prior close on {volume} shares since 04:00 ET. Opens its drawer; the filters stay on.` (the `on ... shares` part omitted if volume missing). Volume compact: `1.25M`, `340K`, `2.1B`, up to 2 decimals (format.ts:103-114). |

### B.7 Frozen checkpoint board (replaces the live board)

`components/AssessmentHistory.tsx` `AssessmentSnapshotBoard` (103-318), mounted with `key={id}` when a checkpoint is selected (DashboardShell.tsx:666). Fetches `{apiBase}/assessments?id={id}` once (122-140). No live data is merged.

| # | Item | Shown when | Exact text | Colour | Computed from | Notes |
|---|---|---|---|---|---|---|
| 50 | Load error | fetch failed (142-148) | `Assessment unavailable: {error}`, where error is e.g. `HTTP 500` or the browser's error message | `text-neg` | fetch | Raw technical text reaches the user. |
| 51 | Loading | before data, or the response has no assessment (150-156) | `Loading assessment…` (U+2026) | `text-ink-3` | | Also shown forever if the server returns `assessment: null` (see Unclear). |
| 52 | Heading | loaded (164-166) | `{label} · {HH:MM} ET`, CSS uppercase, e.g. `OPEN SPIKE ASSESSMENT · 09:25 ET` | `text-ink` | `assessment.label`, `.clock` | |
| 53 | Snapshot badge | loaded (168-172) | `Snapshot · not live` (badge, CSS uppercase) | warn badge | | Hover: `Recorded at {completedAt or scheduledFor}. Nothing on this view updates.` The time is the raw stored timestamp string (ISO) (see Unclear). |
| 54 | Generated late badge | `generatedLate` (173-179) | `Generated late` | warn badge | | Hover: `The desk was not running at the scheduled time. This records the state when it actually ran.` |
| 55 | Experimental badge | `experimental` (metadata.experimental set; readModel.ts:273) (180-186) | `Experimental` | warn badge | | Hover: `This assessment's ordering is explicitly unvalidated. Its components are persisted so they can be tested later.` |
| 56 | Meta line | loaded (187-191) | `{n} names · ranked on {rankingDefinition} · {tradingDate}` plus ` → {targetTradingDate}` when set (→ U+2192 RIGHTWARDS ARROW). Ranking words seen in code: `Daily RVOL`, `AH Participation` (lib/market/board.ts:39, 47). Dates are raw `YYYY-MM-DD` | 10px ink-3 | `assessment.*` | |
| 57 | Notes box | `assessment.notes` non-empty (194-198) | stored notes text verbatim | ink-2 on panel | `assessment.notes` | Content unknown from code (see Unclear). |
| 58 | Table header | loaded (203-216) | `Rank`, `Ticker`, `Price`, `%` (after-hours board: `AH %`), `Daily RVOL` (AH: `AH Particip.`), `Volume` (AH: `AH Volume`), `Spread`, `Cycle`, `Catalyst`, `Structure`, `Halt`, `Changed since previous`. All CSS uppercase, 10px ink-3 | | `assessment.board === 'AFTER_HOURS'` | Price to Spread right-aligned. No sorting, no filtering. |
| 59 | Table cells | per stored row (219-311) | Rank: number or [U+2014], `text-accent`. Ticker: button (hover accent) that opens the drawer with CURRENT detail (SnapshotTicker 86-93). Price: formatPrice. %: formatSignedPercent (AH: `ahPercentChange`). RVOL / AH participation: formatMultiple `x`. Volume: compact count `K/M/B`. Spread: `{n.nn}%` or [U+2014]. Cycle/Catalyst/Structure/Halt via `snapshotLabel` (language.ts:97-120): cycle `GREEN, FRESH / FRONTSIDE`, `YELLOW, FRONTSIDE WARNING`, `RED, BACKSIDE`, `UNKNOWN` (research/view.ts:56-61); catalyst the emoji labels in item 25; structure `CLEAN`/`CAUTION`/`DIRTY FLOAT`/`UNKNOWN`; halt [U+2014] for trading, `Halted`, `Resuming`; empty value [U+2014]; anything else lower-cased with spaces or a phrase from ENUM_PHRASE (language.ts:17-55). Changed: `changeReading` sentence (changes.ts:90-122): the stored note minus `TICKER: `, or class phrases joined by `; ` such as `entered the board`, `left the board`, `first appearance today`, `moved up the board`, `moved down the board`, `extended`, `gave back`, `new high of day`, `came off its high`, `lost support`, `halt state changed`, `catalyst changed`, `share structure changed`, `cycle changed`, `new source evidence on file`, `the desk re-read this name`, `research status changed` (changes.ts:42-68), or `changed since the last checkpoint`; no change [U+2014] | numbers ink / ink-2; text cells ink-2, 11px | stored `AssessmentTickerRecord` | The cycle words here (`RED, BACKSIDE` etc.) differ from the live cycle words (`BACKSIDE`, `OFF HIGH`) used on Focus cards and the filters (see Unclear). |

### B.8 Price range control (in the Discovery caption row)

`components/PriceRangeControl.tsx`, rendered inside the Discovery board's caption at `components/DiscoveryBoard.tsx:473-479`, not in the summary line. Shown when discovery exists, ranges are enabled (`rangeEnabled !== false`), and bounds and default are present (DiscoveryBoard.tsx:472). Remembered per browser in `localStorage` `mointel.boardRange`; null means server default (DashboardShell.tsx:239-265). Range format `rangeLabel`: `$0.25–$20`, `$1–$20`, cents only when not whole, U+2013 EN DASH between (boardRange.ts:19-25).

| # | Item | Shown when | Exact text | Colour | Computed from | Controls |
|---|---|---|---|---|---|---|
| 60 | Range button | not editing (64-80) | the shown range, e.g. `$1–$20` (`num`, 11px semibold). Hover: `Choose the price range this board ranks in, within {bounds}.` | default range: `border-line-2 bg-panel-2 text-ink-2`; non-default: `border-accent/50 bg-accent/15 text-accent` (accent = viewer-owned) | shown = pending choice if any, else the served `discovery.priceMin/priceMax` | Click opens the editor. `aria-busy` while pending. |
| 61 | Pending dot | the chosen range is not yet served (`rangePending`) (79) | no text; 6px round dot, `animate-pulse` | `bg-accent` | `market.rangePending` | aria-hidden, so screen readers get only aria-busy. |
| 62 | Reset link | shown range is not the default (81-89) | `reset to {default range}`, e.g. `reset to $1–$20` | ink-3, hover ink | `defaultRange` | Click clears the stored range (server default). |
| 63 | Editor | after clicking the button (94-143) | two text inputs (decimal keypad), pre-filled with the shown min and max; between them `–` U+2013; hidden labels `Lowest price`, `Highest price`; buttons `Apply` (accent) and `Cancel`; hint `{bounds} allowed` (ink-3) | inputs panel-2; Apply `text-accent border-accent/40 bg-accent/10` | `parseRangeInput` (boardRange.ts:41-60) | Enter or Apply submits; Escape or Cancel closes without change. A leading `$` is accepted. Values outside bounds are clamped silently. Errors (`role="alert"`, `text-warn`) replace the hint: `Enter a price for both ends.`; `The low end must be below the high end, within {bounds}.` Applying the default range is stored as "no choice". |

---

### Not covered here (in this position on screen, outside the brief)

- `FeedBanner` (DashboardShell.tsx:542) and `BillingBand` (514) sit between the header and the board. Not inventoried in this section.
- `ReportBody` inside the inline briefing (SessionReports.tsx:264-273) is the same body as the report window and is left to that section.
- The Discovery board caption around the range control (DiscoveryBoard.tsx:440-500, e.g. `Ranking not loaded`, `frozen 20:00`) is left to the board section.

Item count: 63.

### Unclear from the code

1. Filters do not apply to the frozen checkpoint board, and the filter banner hides while it shows, but the summary chips still show lit state and counts of the LIVE board above a frozen board. Whether a user understands the counts and the `{n} matching filter` slot refer to the live board, not the snapshot on screen, cannot be told from code. (The RANKED_HINT comment says the strip "also sits over a frozen checkpoint", boardCounts.ts:26-31, MarketSummary.tsx:57-58, but its counts are computed from `merged.discovery`, the live board.)
2. Filters and focus pins are not persisted and reset on reload, while board range and report range are. Whether that difference is intended for users is not stated in rendered copy.
3. Straddle briefing line (item 31) is unreachable in this build because `board` is hard-coded `null` (DashboardShell.tsx:372-375). Its words exist but no user can see them.
4. Focus empty states use two different sentences for the same situation: `Pin a ticker with ☆ to keep it here.` (no message) vs `Pin a ticker from Discovery with ☆ to keep it here.` (message present). Whether the difference means anything is unclear.
5. Focus card percent change: the baseline (prior close, session open, etc.) is not stated on the card and not opened in `telemetry.percentChange` derivation here.
6. Price source tag values other than SIP/BAR/SNAP: falls back to `demand.feed.toUpperCase()` (telemetry.ts:99); the possible feed names a user could see are not enumerated in the files opened.
7. `★`/`☆` vs the source-tag colour: accent marks both "pinned" and "live Alpaca source" and "chosen range" and "lit chip"; whether users read accent as one meaning ("yours") is a design question the code cannot answer.
8. The snapshot badge hover `Recorded at {completedAt ?? scheduledFor}` prints the raw stored timestamp; its format (likely ISO UTC with `Z`) is not converted to ET or labelled (AssessmentHistory.tsx:171).
9. `Assessment unavailable: {error}` shows a raw technical message such as `HTTP 500` (AssessmentHistory.tsx:127, 145).
10. If `/assessments?id=` returns `assessment: null` with 200, the board shows `Loading assessment…` indefinitely (AssessmentHistory.tsx:150-156); no not-found state exists.
11. `assessment.notes` content is free text from the store; what it says to users is not determinable from this code.
12. The View selector's `Last assessment · {HH:MM}` duplicates the newest entry below it; both select the same id. Whether the duplicate is intended is not stated.
13. Snapshot Cycle column uses the old classification words (`GREEN, FRESH / FRONTSIDE`, `RED, BACKSIDE`) while the live cycle uses `DAY 1`, `FRONTSIDE`, `OFF HIGH`, `BACKSIDE`, `PRIOR RUN`, `NO RUN`. Which vocabulary stored rows carry today is not determinable without the data.
14. Setup grade `D` filters the stored grade `AVOID` and `Not graded` filters stored `UNKNOWN`; what a setup grade is, and what the board shows for AVOID, is defined outside these files.
15. Catalyst grade `C` also contains names with NO catalyst (grade NONE), per its hover; the Freshness filter for such names: no freshness, so they match only All. Whether users expect "C" to include "none" is a copy question.
16. Search matches anywhere in the ticker (substring), so `A` keeps every ticker containing A. The placeholder `Search ticker` does not say so.
17. Off-hours detection depends on the session phase reported by the server (`CLOSED`, `NEXT_DAY_PREP`); when discovery is not yet loaded, phase is null and the inline briefing does not show. Behaviour in the 20:00 to 22:00 window (POST_MARKET) keeps the one-row line (offHours.ts:7-9).
18. Mark-only window 07:00 to 10:00 ET ignores market holidays (reportNotice.ts:109), so on a weekday holiday morning the report does not auto-open.
19. `FeedBanner` and `BillingBand` were not opened beyond line counts; their text is not inventoried in this section.

## C. The board

Source: `A:\mointel-design-inv` at commit 366eeebd. All refs are file:line in that tree. Abbreviations: `DB` = components/DiscoveryBoard.tsx, `DC` = components/DecisionCells.tsx.

Colour tokens (app/globals.css:8-57): `pos` green #2fc46f, `warn` amber #e8ac33, `neg` red #f4574e, `accent` blue #4d93ff, `ink` near-white #e9edf3, `ink-1` #c7cedb, `ink-2` grey #97a1b0, `ink-3` lighter-grey label colour #8792a3. The palette comment (globals.css:3-6) states the intent: "green = fresh/frontside strength, amber = warning, red = backside/danger, blue = informational".

Case note: many elements carry CSS `uppercase`, so the reader sees capitals even where the source string is mixed case. Where that applies the "Exact text" column gives the source string and the Notes say "shown uppercase".

Flag: the empty-cell glyph is U+2014 (written below as [U+2014]). It is the only place U+2014 reaches the screen in this area (format.ts:118,125,131,143; DC:569; DB:1224; ActivitySparkline.tsx:35; why.ts:188,203,218,230,471; setupGrade.ts:79). One sentence also carries it (see Ticker column, after-hours volume hover).

---

### C.0 Board chrome (above the table)

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Board title | always | `Discovery` or `After-Hours Discovery` | ink, 11px semibold, letter-spaced, shown uppercase | DB:447-449; `afterHours = discovery?.board === 'AFTER_HOURS'` DB:438 | AFTER_HOURS board is used in phases AFTER_HOURS and POST_MARKET (lib/market/board.ts:35-42) |
| Ranking caption | payload loaded | `Daily RVOL rank · $1–$20 · top 12 of 1,234 ranked` (day board) or `AH participation rank · ... · top N of M ranked` (evening) | ink-3 | DB:450-456; range from `rangeLabel` lib/dashboard/boardRange.ts:127-129 (en dash U+2013); ends via `formatRangeEnd` :123-125 (`$1`, `$12.50`) | N = min(Top size, rankedCount); M uses toLocaleString |
| Ranking caption, no payload | `discovery === null` | `Ranking not loaded` | ink-3 | DB:456 | |
| Moving count | day board and at least one mover in board rows | ` · 3 moving` | accent (blue) | DB:442, 457-462; `movingCaption` lib/dashboard/view.ts:292-307 | Hover (1 name): `1 name on the board is marked moving: it made a large move from the prior close, whether or not it is also in the RVOL ranking. Under the Rank and RVOL sorts, names outside the RVOL ranking come after the ranked names. Any other sort places every name by its own value.` Plural: `{count} names on the board are marked moving: each made a large move from the prior close, whether or not it is also in the RVOL ranking. Under the Rank and RVOL sorts, ...` (same tail). Appended when movers are shown past the Top N: ` Top {size} also shows {extra} moving name(s) outside it.` Not shown on the after-hours board (DB:442). |
| Price range control (closed) | payload has range bounds and default, and ranges not switched off | `$1–$20` (served range); a pulsing blue dot while a chosen range loads | grey border if default, accent border/fill if not default | DB:472-480; components/PriceRangeControl.tsx:63-91 | Hover: `Choose the price range this board ranks in, within {bounds}.` Extra button when not default: `reset to {default range}` |
| Price range control (editing) | after clicking the range | two inputs (screen-reader labels `Lowest price`, `Highest price`), `–`, `Apply`, `Cancel`, then `{bounds} allowed` | inputs ink; Apply accent; hint ink-3 | PriceRangeControl.tsx:94-143 | Errors (amber, role alert): `Enter a price for both ends.`; `The low end must be below the high end, within {bounds}.` (boardRange.ts:153,160). Escape cancels. |
| Frozen marker | `sessionPhase === 'POST_MARKET'` | `frozen 20:00` (shown uppercase) | warn (amber), 10px semibold | DB:482-489 | Hover: `Extended trading ended at 20:00 ET. These are the session's final after-hours numbers; they are no longer moving.` |
| Sort-override badge | sort key is not `rank` | `sorted by {active label lowercased}` (uppercase by CSS) then ` · {metric}` in normal case, ink-3 | accent | DB:491-516; label from `resolveSortEntry` DB:265-272, metric DB:386-388 | Hover with payload: `The board's own order for this session is {rankingLabel}. You are overriding it. Choose Rank to return.` (`rankingLabel` is `Daily RVOL` or `AH Participation`, lib/market/board.ts:39,47). Without payload: `You are overriding the board order. Choose Rank to return.` Metrics: RVOL `session volume against a 20-session baseline`; Now (unwired capture) `trades in the last settled minute`, live capture `trades in the last 10 seconds`, stopped capture `not live: the trade count stopped updating` (nowReading.ts:214,221); Setup grade `setup grade, A first`. Gap, Move, Price, TMI Float have no metric. |
| Counts | payload loaded | `{eligible} eligible · {tracked} tracked` | ink-3, mono | DB:524-528 | |
| Counts, no payload | `discovery === null` | `counts not loaded` | ink-3 | DB:527 | |
| Universe warning chip | universe STALE, or UNKNOWN once a roll was due | red dot, `Board may be missing names` (uppercase), then ` · universe from {YYYY-MM-DD}` (normal case) | neg (red) border, fill and text | DB:548-562; lib/dashboard/universe.ts:73-104 | Hover STALE: `The symbol universe did not refresh for this session; it is from {date}. A name that gapped overnight may not be on the board at all.` Hover UNKNOWN: `No universe refresh has been recorded for this session; the last was {date}. The board may be short a name that gapped overnight.` (date clause omitted when unknown). No dismiss. |
| `Sort` label | always | `Sort` | ink-3 | DB:565 | |
| Sort buttons | always (Setup grade only when grade is wired) | see C.0a | active: accent text on accent/15 fill with caret; inactive: ink-3 on panel-2, hover ink-2 | DB:567-593 | `aria-pressed` set. Active shows `▲` (asc) or `▼` (desc) after label (DB:585-589) |
| Missing-for-sort count | active sort leaves rows with no value | `{n} unknown`; Move sort `{n} no move`; Now sort `{n} not measured`; Setup grade sort `{n} showing a dash at this checkpoint` | warn (amber), mono | DB:594-610, MISSING_NOUN DB:243-251, SETUP_GRADE_MISSING DB:258-262; count `discoveryMissingCount` view.ts:464-483 | Hover (general): `{n} of {rows} rows have no value for this sort and are listed last, in both directions. The board shows the first {size}, so a row listed last may not be on screen at all.` Hover (Setup grade): `Names with a dash in the Setup grade column: no grade was recorded for them at this checkpoint. Names marked Not graded are not counted here.` Shown also under the default Rank sort when rows lack a rank. |
| Top N buttons | always | `Top 12`, `Top 25`, `Top 50` (shown uppercase) | active accent, inactive ink-3 | DB:63, 612-628 | Default 12 (DB:330). Movers below the cut are appended after row N, up to 15 (view.ts:276-285) |
| Reset widths | any column width customised | `Reset widths` (uppercase) | ink-3 on panel-2 | DB:633-642 | Hover: `Put every column back to its default width` |

#### C.0a Sort buttons (SORT_KEYS, DB:158-222)

| Button | Label shown | Hover (title) | Highlights header | Default direction on first click |
|---|---|---|---|---|
| rank | `Rank` | `The board's own ranking for this session` | none (no Rank column exists) | ascending (DB:427) |
| rvol | day: `RVOL`; evening: `Part` | day: COLUMN_TITLE.rvol (see RVOL column); evening: Part title (see RVOL column) | RVOL/Part | descending |
| changePct | `PM Gap`, `RTH Gap`, `AH Gap`, or `Gap` | `Change from the prior session close, including after hours` / `Change from the prior session's close` / `Change from today's close` / `Change from the most recent session close` (view.ts:558-600) | Price | descending |
| sessionMove | `PM Move`, `RTH Move`, `AH Move`, or `Move` | `Change since this premarket session's first print` / `Change since the regular session's opening print` / `Change since the after-hours session's first print` / `Change within the current session, from its own opening print` (sessionMove.ts:139-156) | Price | descending |
| now | `Now` | unwired capture: `Trades in the most recent settled minute. Which names are trading heaviest right now, which is a different question from RVOL: that is a ratio against a twenty-session baseline and can stay high on a name that has stopped trading.` Live and stopped captures replace it (see Now column) | Now | descending |
| price | `Price` | `Last price` | Price | descending |
| float | `TMI Float` | `TMI Float, from SEC filings. Not shown for every name.` | TMI Float | descending |
| setupGrade | `Setup grade` | `Sorted by setup grade: A first, then B, C, D, Not graded. Names showing a dash are last. The grade is the desk's reading, not a recommendation.` | Ticker | ascending |

Clicking the active button flips direction; clicking another sets that key's default direction (DB:421-429). Rows with no value sort last in both directions (view.ts:121-126). Ties fall back to board rank then ticker A to Z (view.ts:523-529). Now sort puts live 10 s rows before minute-grain rows before rows with no number (view.ts:508-511; nowReading.ts:123-125). Phase-dependent labels: Gap label by `baselineLabel(phase)`; CLOSED and NEXT_DAY_PREP give bare `Gap`/`Move`.

---

### C.1 Column headers (common behaviour)

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Header row | table has rows | header words, shown uppercase, 11px semibold | ink-3 on panel-2; the sorted column: accent text, accent/10 fill, accent/60 bottom border | DB:686-848, Th DB:903-983 | Sticky at top (DB:686) |
| Sorted-column caret | header is the active sort's column | ` ▼` (U+25BC) | accent | DB:960 | Always the down caret, even for an ascending sort (see Unclear). |
| Resize handle | every column except the change gutter, once measured | invisible 6px strip on the header's right edge; a 2px line appears on header hover (line-2), on handle hover (accent/60), on focus or drag (accent) | | components/ColumnResizeHandle.tsx:226-290 | Hover: `Drag to resize {Column}. Double-click to fit.` Screen reader: `Resize {Column} column`, value `{n} pixels`. Keys: Left/Right 8 px, Shift+Left/Right 32 px, Enter fits, Delete resets (lib/dashboard/columnWidths.ts:254-267). Widths saved in this browser (localStorage key `mointel.discovery.columnWidths.v1`, columnWidths.ts:273). |
| Default widths | | change 24, Ticker 128, Price 172, RVOL 68, Now 68, TMI Float 102, Cycle 152; Why and Risk share the rest | | columnWidths.ts:47-57 | |

---

### C.2 Column 1: change gutter (no visible header)

Header: screen-reader-only text `Changed` (DB:688). No hover, no sort.

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Change marker | ticker is in `changedTickers` | `Δ` (U+0394), screen-reader text `changed` | accent, 11px bold | DC:661-671; DB:1120-1122; set in lib/hooks/useDashboard.ts:118-139 | Hover: `This row changed on the most recent update`. Cleared after 2,500 ms (useDashboard.ts:18). Poll every 4 s (useDashboard.ts:15). |
| Empty | not changed | non-breaking space | | DC:662 | |
| Row tint | same condition | whole row flashes accent at 22% fading out over 2.4 s; with reduced motion a static accent 12% tint | accent | DB:1118; app/globals.css:171-190 | |

---

### C.3 Column 2: Ticker

Header: `Ticker` (uppercase). Hover: none (NO_TITLE_NEEDED, lib/dashboard/columnTitles.ts:58). Sort: highlighted when sorted by Setup grade (DB:220). Accessible header name `Ticker`.

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Focus star | signed-in board (not read-only review) | `☆` (U+2606) not in Focus; `★` (U+2605) in Focus | outline ink-3 (hover accent); filled accent | components/FocusToggle.tsx:344-377 | Hover off: `Keep {TICKER} in Focus for this session`. Hover on: `{TICKER} is in Focus. Removing it changes nothing else: it stays in Discovery, stays tracked, and keeps its research.` Screen reader: `Add {T} to Focus` / `Remove {T} from Focus`. Click does not open the row. Hidden entirely in read-only mode. |
| Ticker symbol | always | e.g. `HDSN` | ink, 15px bold | DC:628-630 | Hover: company hint `{Name}. {Country}.` or `{Name}.`; no hover when the desk has no name (lib/dashboard/companyLine.ts:228-251; DB:1134-1137) |
| Setup grade badge | grade wired for the row | see C.3a | see C.3a | DC:631; components/SetupGradeBadge.tsx | Opens a popover on hover, focus, or click (Popover.tsx) |
| Stale mark | `telemetry.stale` | `stale` (shown uppercase) | warn, 9px semibold | DC:632-639 | Hover: `No market event for {N}s. This is the last live print, not a current one.` or `No market event for an unknown time. ...` (lib/format.ts:195-197). Stale threshold comes from the server (`demand.freshness.stale`, lib/dashboard/telemetry.ts:156). |
| Retention note | name is latched and price is outside the served band | `retained > ${max}` or `retained < ${min}` (shown uppercase, e.g. `RETAINED > $20`) | accent, 9px semibold | view.ts:173-193; DC:643-647; DB:1079-1084 | On the evening board uses the after-hours latch (DB:1080) |
| Moving line | row is a mover measured from the prior close | `moving` (shown uppercase) | accent, 9px semibold | view.ts:228-265; DB:1139-1155 | Hover, unranked mover: `On the board for its move, not its RVOL rank. Up 12.3% from the prior close on 1.2M shares since 04:00 ET. RVOL rank 57, outside the ranking.` (or `No RVOL rank.`). Ranked mover: `Also a mover. Up ... RVOL rank 4.` Shares clause omitted when volume unknown; `Down` for negative. |
| After-hours volume | evening board | e.g. `1.2M`; `[U+2014]` when unknown | ink-3, 10px mono | DB:1156-1167; `formatCount` format.ts:142-145, 103-114 (K/M/B, up to 2 decimals) | Hover: `{volume} traded since the close`; with no volume the hover reads `[U+2014] traded since the close` (flag: glyph inside a sentence). |

#### C.3a Setup grade badge (lib/dashboard/setupGrade.ts:209-235; SetupGradeBadge.tsx:27-64)

| Value | Rule | Face | Colour | Popover text | Screen-reader name |
|---|---|---|---|---|---|
| `A` | stored grade A | letter in bordered badge | accent (blue) | `Setup grade A as of {time} ET. The highest grade on these criteria. {basis}` | `Setup grade A` |
| `B` | stored B | badge | neutral (ink-2 on panel-3) | `Setup grade B as of {time} ET. One or more criteria read below the strongest, or could not be read. {basis}` | `Setup grade B` |
| `C` | stored C | badge | dim (ink-3 on panel-2) | `Setup grade C as of {time} ET. A weaker reading: the cycle reads as a backside. {basis}` | `Setup grade C` |
| `D` | stored AVOID (displayed as D, setupGrade.ts:226) | badge | neg (red) | `Setup grade D as of {time} ET. Risk outweighs the setup. {basis}` | `Setup grade D` |
| `Not graded` | stored UNKNOWN | small bordered chip, shown uppercase | ink-3 | `Not graded as of {time} ET. Fewer than three of the five criteria could be read. {basis}` | `Setup grade: not graded` |
| `[U+2014]` (no research) | grade absent or NOT_YET | plain glyph | ink-3 | `The desk has no research on this name at this checkpoint.` | `No setup grade: the desk has no research on this name at this checkpoint` |
| `[U+2014]` (none recorded) | payload carried explicit null | plain glyph | ink-3 | `The desk recorded no setup grade at this checkpoint.` | `Setup grade: none recorded` |

`{time}` is `HH:MM` ET today, or `Mon D, HH:MM` for an earlier day (setupGrade.ts:156-161). `{basis}` groups the five criteria: `Strong: ... Limited: ... Risk: ... Not readable: ...` with criteria names `cycle`, `catalyst`, `relative volume`, `liquidity`, `share supply` (setupGrade.ts:55-61, 163-184). Badge not shown at all when the grade is not wired for the row (DB:1132).

---

### C.4 Column 3: Price · Gap · VWAP

Header: `Price · {Gap label} · VWAP` (uppercase), e.g. `PRICE · PM GAP · VWAP` (DB:733-741). Gap label: `PM Gap` (PREMARKET), `RTH Gap` (RTH), `AH Gap` (AFTER_HOURS, POST_MARKET), `Gap` (other or none) (view.ts:558-600).
Header hover (columnTitles.ts:87-90): `Three numbers. The price is the last trade. {Gap label} is the {baseline title, first letter lowercased}. VWAP is the volume-weighted average price for the current session, so a name trading above it is holding its gains and one below it is giving them back.`
Sorts: Gap, Move, Price all mark this header (DB:169-177, 210).

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Last price | always | `formatPrice`: 0 decimals at 1,000 or more, 2 decimals at 1 or more, 4 decimals below 1; `[U+2014]` with no live price | ink, 15px bold; ink-2 when stale | DC:122-126; format.ts:117-122 | No live price means no price (telemetry.ts:162-189) |
| Headline label | always | Gap label (e.g. `PM Gap`) or, when sorted by Move and the move is OPEN, the Move label (e.g. `RTH Move`); shown uppercase | ink-3, 10px; accent semibold when the board is sorted by any key on this column | DC:103-106, 136-143 | Hover: Gap title (see C.0a), or `Change within the current session, from its own opening print. The board is sorted by this, so it is the figure shown.` (DC:187-188) |
| Headline percent | always | `+18.1%`, `-5.9%`, `0.0%` (1 decimal; `+` only above zero); `[U+2014]` when null | pos if above 0, neg if below, ink-2 if zero, null or stale | DC:108-115, 144-146; format.ts:124-127 | Same hover as the label. Gap value = `telemetry.percentChange` |
| Blue-sky line (replaces VWAP line) | blue-sky status IN_BLUE_SKY with a ceiling, and the row is not halted/resuming and not BACKSIDE | `BLUE SKY · prior {price}` | `BLUE SKY` accent semibold; `· prior ...` ink-3 | DC:117, 149-160; DB:1094-1095, 1174 | Hover: `ABOVE PRIOR CEILING ${ceiling 2dp}` (lib/market/blueSky.ts:406). Other blue-sky states never show on the board. |
| VWAP line | VWAP available | `{PM VWAP / RTH VWAP / AH VWAP} +$0.12 / +1.2%` | label ink-3; figures pos if price at or above VWAP, neg below | DC:352-385; lib/market/vwap.ts:51-53, 228-236 | Dollars: 2 decimals at $1 or more, else 3; sign `+` or `−` (U+2212) (DC:38-41). Hover: `{label} {vwap to 4 decimals}`, plus for partial coverage `. Partial coverage: part of this session arrived as a reconstructed total with no per-minute notional behind it.` |
| `part` mark | VWAP coverage PARTIAL | `part` (uppercase) | warn, 9px | DC:380-382 | |
| VWAP unavailable | no VWAP and live source exists | `VWAP unavailable` | ink-3 | DC:355-360 | With no live source the line is a blank space |
| Third line, Move (default) | session move reading exists and state is OPEN | `{PM Move} +2.3%` | label ink-3; percent pos if 0 or above, neg below | DC:233-350 (318-348) | Hover: `{label} from {open price} at HH:MM ET on {n} trades in the anchoring minute`, or `... . The feed reported no trade count for that minute, so how thin the anchor is cannot be said.` |
| Anchor mark | OPEN with anchor THIN or UNKNOWN | `thin` or `?` (uppercase) | warn, 9px | DC:327-328, 345-347; THIN = trade count at or below the dead line (30 trades, lib/market/vwap.ts:359-365, lib/market/activity.ts:175-181, 276-278) | THICK shows no mark |
| Third line, not traded | state NO_PRINT (or OPEN with no move) | `{PM Move} not traded` | label ink-3; `not traded` warn | DC:306-316 | Hover: `{label}: this session has produced no print, so there is no move within it to measure. Any change on the row happened before it opened.` |
| Third line, nothing | no reading, NOT_STARTED or UNKNOWN | (nothing) | | DC:235, 304 | |
| Third line, Gap (when Move leads) | sorted by Move and move is OPEN | `{PM Gap} +18.1%`; nothing if gap null | label ink-3; pos if 0 or above, neg below | DC:181, 198-215 | Hover: Gap title |

Move labels: `PM Move`, `RTH Move`, `AH Move` (sessionMove.ts:76-80). Move = (price minus session open print) / open print x 100 (sessionMove.ts:224).

---

### C.5 Column 4: RVOL (day) / Part (evening)

Header: `RVOL` on the day board, `Part` on the evening board (shown uppercase) (columnTitles.ts:114-123; DB:751-760). Right aligned.
Header hover, day (columnTitles.ts:68): `Relative volume: this session’s volume so far against the average for the same stock over the previous 20 eligible sessions. It is cumulative and never decays within a session, so a name that ran at 07:15 and stopped can still show a large number at 10:00. Now, beside it, is the correction.`
Header hover, evening (columnTitles.ts:119): `After-hours participation: volume since the 16:00 close against the same stock’s average full-session volume. It is what the evening board ranks on. Daily RVOL is not: it still carries what the day earned and stops moving at the bell.`
Sort: RVOL / Part button. Sort value is Daily RVOL by day, after-hours participation by evening (view.ts:370-388).

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| RVOL multiple | day board, RVOL present | `12.3x` (1 decimal; 0 decimals at 100 or more) | ink, 13px semibold | DC:571-584; format.ts:130-134 | No cell hover |
| Low-confidence RVOL | `rvolConfidence === 'LOW'` | multiple in amber plus `low` (uppercase) | warn | DC:574-582 | No explanation on screen (see Unclear) |
| RVOL missing | RVOL null | `[U+2014]` | ink-3 | DC:569 | |
| Participation multiple | evening board | `3.4x`; `[U+2014]` when null | ink, 13px semibold | DC:564-568; DB:1182 | Never carries `low` |

---

### C.6 Column 5: Now

Header word: `Now` (uppercase), from the sort entry (DB:808). Sub-line under it (9px, normal case, ink-3), by capture state (nowReading.ts:205-226):
- capture unwired: `−1m` (U+2212 minus; `settleMinutes + 1`, lib/dashboard/sparkline.ts:84-86, settleMinutes 0 at activity.ts:180)
- capture live: `last 10s`
- capture stopped: `not live`

Header hover: unwired: the Now sort title (C.0a). Live: `Trades in the most recent completed 10 seconds; the bars are the last minute in 10-second slots. Which names are trading heaviest right now. Not RVOL, which can stay high on a name that has stopped. A muted /min figure has no live count and sorts after every live row.` Stopped: `The live trade count has stopped updating, so nothing is shown rather than a stale count that would look current.`
Accessible header name: `Now, {sub-line}` (DB:792). Sort: Now (tiered, see C.0a). Capture is LIVE when the newest flush is within 30 s of the server's read (nowReading.ts:40-54; NOW_STALE_MS lib/market/nowBuckets.ts:55).

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Count, MINUTE | capture unwired, or row payload has no 10 s field | integer with thousands separator, e.g. `2,979` | ink-2, 11px mono | DB:1212-1224; nowReading.ts:74-95; count = last slot of the activity window (sparkline.ts:290-295) | Hover: `{n} trades in the most recent settled minute. The minute in progress is never counted, because it has not finished.` or, no count: `No minute has been counted for this name yet, which is not the same as no trading.` |
| Count, LIVE | live capture and newest 10 s slot measured | integer | ink-2 | as above | Hover: `{n} trades in the most recent completed 10 seconds.` |
| Count, FALLBACK | live capture but this name's newest slot not measured | integer plus `/min` (9px) | ink-3 (muted) | DB:1214, 1231-1233 | Hover: `No live 10-second count for this name. {n} trades in its most recent settled minute, shown per minute and sorted after every live row.` or `No live 10-second count for this name, and no minute has been counted yet.` |
| Count, NOT_LIVE | capture stopped | `[U+2014]` | ink-2 | DB:1077, 1224 | Hover: `The live trade count has stopped updating, so nothing is shown rather than a stale count.` No sparkline. |
| Count missing | MINUTE/FALLBACK with no count | `[U+2014]` | | DB:1224 | Never prints 0 for an unmeasured minute |
| 10 s sparkline | LIVE | 6 bars (3px wide, up to 14px tall, scale 50 trades per 10 s = full) over 6 dots (2px blue, each slot's last price, row's own price range); unmeasured slot is a gap | bars: pos (up), neg (down), warn (move within spread), ink-3 (all measured slots zero), ink-2 (no direction); dots accent | components/NowSparkline.tsx:25-73; nowReading.ts:135-185; `directionTone` sparkline.ts:256-274 | Hover: `Trades per 10 seconds over the last minute, oldest first: {list, "not measured" for gaps}. Full height is 50 per 10 s, the active line. Dots are each slot's last price; a gap is a slot that was not measured.` Screen reader: `Activity: {list} trades per 10 seconds over the last minute` |
| Minute sparkline | MINUTE or FALLBACK | bars per minute (scale 300 trades/min = full; a measured zero draws a 1px floor) with blue price dots above | same colour rule as above | components/ActivitySparkline.tsx:97-202; sparkline.ts:96-112, 170-207 | Bars hover: `Trades per minute over the 5 minutes ending 1 min ago: {values}. Full height is 300/min, the active line.` Dots hover: `Minute closes, {covered} of {n} minutes traded. Range {lo}-{hi}. Points mark minutes that traded; gaps did not.` Screen reader: `Activity: {values} trades per minute over the 5 minutes ending 1 min ago` |
| Minute sparkline missing | no activity window | `[U+2014]` | ink-3, 10px | ActivitySparkline.tsx:102-111 | Hover: `No minute activity recorded for this name. Not measured, which is different from silent.` |

Direction colour rule: needs at least 2 prices and a known spread; amber if the move from first to last price is within the spread percent; green up; red down; otherwise neutral (sparkline.ts:256-274).

---

### C.7 Column 6: TMI Float (conditional)

Shown when any row has the float wired, or while sorted by TMI Float (DB:356-357, 405, 810-822, 1247-1257). Header: `TMI Float` (uppercase), right aligned.
Header hover = FLOAT_LEGEND + FILED_COUNT_WORDS.legend (floatBound.ts:248-249, 526):
`TMI Float: shares outstanding less insider holdings, computed from SEC filings. An upper bound as of the date of the board or report, when the filings line up. The date beside the number is the filed share count's; where no date shows, it is in the hover. Where a TMI Float cannot be verified, the cell may show the company's filed share count with an icon. Nothing is subtracted from it, so it is not a TMI Float.`
Sort: TMI Float; sorts only PRODUCED bounds that are not filings-only (floatBound.ts:719-723). All faces have a dotted underline and open a 300px popover on hover, focus or click (FloatCell.tsx:51-95). Every accessible name ends `; details on click` (floatBound.ts:226, 326).

| Face | Rule | Exact text | Colour | Computed from | Popover / hover |
|---|---|---|---|---|---|
| Bound | state PRODUCED with positive bound, count date and read date | `≤ 12.4M` (U+2264 prefix; 3 significant digits, K/M/B/T, rounded UP) then count date `9/22` (10px ink-3) | ink | floatBound.ts:344-389; compactBound lib/research/compactBound.ts:22-47 | Rows: headline `TMI Float, shares outstanding less insider holdings: no more than {x} shares as of {D}, when the filings line up.`; `TMI Float: shares outstanding less insider holdings` / `The number above subtracts only the insider holdings the desk can see, ...`; `Filed share count`; `Less insiders' holdings`; per-insider lines (signed-in only) `{owner}: {shares} shares subtracted, held directly.` (`An insider` when unnamed); `Not subtracted`; `Lined up means`; `Filings read on {date}.` (floatBound.ts:195-227, 424-468). Then `Warrants, convertible notes and share-sale programs are not in it, and can add shares.` (FloatCell.tsx:16, 87). `{D}` is the board's date `Mon D, YYYY`, or `the checkpoint`. |
| Bound with caveat icon | filings-only bound (no desk research) | `≤ 12.4M` plus 8px circled-i icon; date leaves the face | ink; icon ink-3 | floatBound.ts:367-377, 541-547, 553; FloatCell.tsx:105-125 | Icon hover: `No more than {x} shares, from the filed share count as of {date}, not counting warrants, convertible notes or share-sale programs already in place. There may be some, and they need verifying; the true figure may be higher.` |
| Bound with warning icon | bound restated for listed split(s) not proven by bars | `≤ 12.4M` plus 8px triangle-! icon; date leaves the face | ink; icon warn | floatBound.ts:368-377, 562-598 | Icon hover: `Filed share count as of {date}, restated for a 1-for-10 split on {date}, as announced. The split list can miss a split.` (plus the filings-only sentence if both) |
| Filed count | CANNOT_VERIFY with a reason, a positive count and a dated count, not BOUND_OUT_OF_RANGE, age not AFTER_DATE | `12.3M sh` (3 significant digits, rounded to nearest) plus icon | ink-2; icon ink-3 (caveat: split NONE and age WITHIN) or warn (warning: anything else) | floatBound.ts:494-501, 666-713, 652-664 | Icon hover starts `The company's filed share count as of {date}, with no insider holdings subtracted. It is not a TMI Float.` then the cannot-verify reason, `The true share count may be higher.` (issuance causes), and on warning: `This count may be in pre-split share units.` / `There may have been a split, needs verification.` / `This count is from {date}, more than 90 days ago.` Source comment says these words are NOT YET PASSED (floatBound.ts:503-506). |
| Unknown | state UNKNOWN | `Unknown` | ink-3 | floatBound.ts:391-402 | Reason: `No filed share count.`; `We could not match this name to an SEC filer, so there is no filed share count to start from.`; `The filed share count is split across several filings, so no single count applies.`; `We could not read a filed share count for this name: SEC's company-facts data returned nothing for it.` (floatBound.ts:272-278) |
| Cannot verify | CANNOT_VERIFY not shown as a filed count, or malformed data | `Cannot verify` | warn (amber) | floatBound.ts:404-415, 280-308 | Reasons: `Cannot verify: the latest filed share count is from {date}, too old to rely on.`; `Cannot verify: shares may have been issued since the filed count.`; `Cannot verify: a share split fell after the filed count's date, or we could not rule one out, so the count may be in different share units.`; `Cannot verify: we have not yet reviewed this company's share supply, so share issuance was not checked.`; `Cannot verify: the computed figure did not pass the desk's own sanity check, so it is not shown.`; `Cannot verify: the desk has not read this company's filings since {date}.`; `Cannot verify: this company's filed share count is from a Form 20-F or 40-F, ...`; generic `Cannot verify.` |
| Not computed | no float record, or float not wired for the row | `Not computed` | ink-3 | floatBound.ts:331-341; DB:1255 | `The desk has not computed a TMI Float for this name.` |
| Refused-panel definition | every face except Bound and Filed count | `TMI Float: shares outstanding less insider holdings` / `The desk can subtract only the insider holdings it can see, so a TMI Float it shows is an upper bound on that figure, ...` | | floatBound.ts:209-210, 471-480 | Source says NOT YET PASSED (floatBound.ts:204-208) |
| Page link (every popover) | always | `Read how float numbers are made:` then link `Are float quotes real?` | link accent | floatBound.ts:242-245; FloatCell.tsx:88-93 | `/are-float-quotes-real`, opens in a new tab |

---

### C.8 Column 7: Why

Header: `Why` (uppercase). Header hover (columnTitles.ts:70): `Two quantities in one cell. The letter is strength: A strong, B moderate or secondary, C weak or dilutive. The colour is freshness, which is a different question: green is today or since the prior session’s close, amber is older. A green A and an amber A are the same strength and different news.` No sort.

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Grade letter | always | `A` (STRONG or LEGITIMATE_POSITIVE), `B` (MODERATE_MIXED_SECONDARY), `C` (WEAK_NEGATIVE_DILUTIVE or NONE), else `[U+2014]` | by tone: pos (FRESH), warn (RECENT, STALE), ink-3 (UNKNOWN freshness, no catalyst, or OLD) | DC:468-473, 389-394; why.ts:175-180, 467-472 | Hover = `why.title` (below) |
| Age | catalyst has an event time | `12m`, `16h` (clock known, under a day), `today`, `3d`; or `since Fri close` when promoted by the prior close | ink-2, 11px (mono unless prior-close reason) | why.ts:104-123, 137-146, 403-404; DC:491-498 | Hover: the event time, e.g. `Sep 17, 8:05 AM ET`, `..., time inferred`, or `Sep 17, time not stated` (catalystView.ts:70-87) |
| `not the move` mark | analysis says the catalyst does not explain the move | `not the move` (uppercase) | warn, 9px | DC:413-417 | No hover |
| `no catalyst found` mark | code NO_FRESH_CATALYST (catalyst status NONE_FOUND and not explaining the move) | `no catalyst found` (uppercase) | warn, 9px | DC:397, 424-431; why.ts:371-372 | Hover: `The desk searched its sources and found no catalyst for this move.` |
| `old` mark | code OLD_CATALYST (freshness STALE and not explaining the move) | `old` (uppercase) | warn, 9px | DC:432-439; why.ts:373 | Hover: `A catalyst exists but it is older than yesterday, and the desk does not think it explains today's move.` |
| Headline | always (second line, clamped to one line; full text in hover only if clipped) | catalyst summary; OLD rows: `No fresh catalyst · latest: {Sep 17} · {summary}` (or `no summary`) | ink-2, 11px | why.ts:386-393, 406; DC:501-505; components/ClampedText.tsx | Blank line (non-breaking space) when no headline |

Why states (why.ts:182-412):

| Code | Rule | Letter | Headline | Letter hover |
|---|---|---|---|---|
| NOT_RESEARCHED | status NOT_ANALYZED | `[U+2014]` dim | `Not researched` | `Not researched, so there is no catalyst grade and no freshness to colour.` |
| RESEARCHING | status ANALYSIS_PENDING | `[U+2014]` dim | `Looking for the catalyst.` | `The desk is looking for the catalyst now. Nothing here is a grade yet.` |
| UNKNOWN | no dossier catalyst | `[U+2014]` dim | `No catalyst established.` | `The desk has not established a catalyst for this name.` |
| GRADED / NO_FRESH_CATALYST | catalyst present | letter coloured by freshness | summary | `Catalyst grade {X}: {meaning}. That is how STRONG it is, not how fresh. The colour is its FRESHNESS: {green because the catalyst is FRESH / amber because the catalyst is RECENT rather than fresh / amber because the catalyst is STALE / grey because the desk could not establish how fresh it is}.` Prior-close promoted rows add: ` It is FRESH because it broke after the prior session's close (since Fri close), so the market has not traded on it yet -- not because it is recent by the calendar. The exact time is below.` No grade: `No catalyst grade established.` Meanings: A `strong, or legitimately positive`, B `moderate, mixed or secondary`, C `weak, negative or dilutive` (why.ts:421-425, 442-465) |
| OLD_CATALYST | catalyst STALE and not explaining move | letter dimmed | `No fresh catalyst · latest: ...` | `Catalyst grade {X}: {meaning}. Dimmed: the latest catalyst is older than yesterday and the desk does not think it explains today's move, so the grade rates an old item, not this move.` (why.ts:415-419) |

Freshness bands (why.ts:286): today FRESH (green), yesterday RECENT (amber), older STALE (amber).

---

### C.9 Column 8: Risk

Header: `Risk` (uppercase). Header hover (columnTitles.ts:72): `What would kill the trade. DIRTY FLOAT: more shares can be sold than the float number says. SUPPLY OVERHEAD: shares a filing permits to be sold that are not in the float: registered resale stock, warrants, convertibles. Permission to sell, not evidence anyone is. STRUCTURE CAUTION or UNKNOWN: a concern found, or the structure could not be established. That is not the same as finding nothing. NO FLAG FOUND: the desk looked and found nothing, which is a result.` No sort.

Cell: 2px left border plus label (11px semibold uppercase), optional value (ink-2 mono), and one detail line clamped to one line (ink-2) (DC:526-540). Colours (DC:512-517): neg red border/text, warn amber, pos green, dim grey (line-2 border, ink-3 text). No hover on the chip; detail line shows full text in hover only if clipped.

| Label | Rule (precedence top to bottom) | Value | Detail line | Tone | File:line |
|---|---|---|---|---|---|
| `NOT RESEARCHED` | status NOT_ANALYZED | none | `The desk has not assessed this name.` | dim | risk.ts:105-114 |
| `RESEARCHING` | status ANALYSIS_PENDING | none | `Structural analysis is running.` | dim | risk.ts:116-125 |
| `ANALYSIS FAILED` | status FAILED | none | `Structure could not be established. Treat it as unknown.` | neg | risk.ts:127-136 |
| `DIRTY FLOAT` | dossier classification DIRTY_FLOAT | `{38.3M} sh supply` if supply found | first sentence of the first structural warning, else `The displayed float understates the shares that can reach the market.` | neg | risk.ts:148-159 |
| `SUPPLY OVERHEAD` | supply ledger has share amounts | `{38.3M} sh` | warning sentence, else `Registered or issuable shares exist. Capacity, not proof of selling.` | warn | risk.ts:163-172 |
| `STRUCTURE CAUTION` | classification CAUTION, or any warning line | none | warning sentence, else `Structure is cautionary rather than clean.` | warn | risk.ts:174-183 |
| `STRUCTURE UNKNOWN` | classification UNKNOWN with no warning | none | `The desk researched this name and could not establish its structure.` | dim | risk.ts:91, 193-202 |
| `NO FLAG FOUND` | otherwise | none | `Researched; no structural problem established.` | pos | risk.ts:204-212 |

Share format: `38.3M` (1 decimal at 10M or more, else 2), `842K`, or whole number (risk.ts:53-57).

---

### C.10 Column 9: Cycle

Header: `Cycle` (uppercase). Header hover (columnTitles.ts:74): `Where the name sits in its own run: NO RUN, DAY 1, FRONTSIDE, OFF HIGH, BACKSIDE, or PRIOR RUN for a move that has already finished. The two prices are the run’s high and the last price, so the give-back is readable without arithmetic.` No sort.

Cell (DB:1267-1305): badge (StatusBadge, 10px semibold uppercase, tinted fill, truncates), then the price line, then a halt badge. Badge tones (StatusBadge.tsx:301-308): pos green, warn amber, neg red, dim grey.

| Badge | Rule | Tone | Hover | File:line |
|---|---|---|---|---|
| `DAY 1` | settled phase DAY_ONE | pos | `DAY 1. First session of this advance, and the high is the most recent settled session. {detail}` | cycle.ts:47-54, 61-73, 450-457, 529-532 |
| `FRONTSIDE` | FRONTSIDE | pos | `FRONTSIDE. Still advancing: the high is the most recent settled session. {detail}` | same |
| `OFF HIGH` (phase) | PULLBACK | warn | `OFF HIGH. The high is an earlier session, but most of the advance is still intact. {detail}` | same |
| `BACKSIDE` | BACKSIDE | neg | `BACKSIDE. Most of the advance has been given back. {detail}` | same |
| `PRIOR RUN` | SHADOW | dim | `PRIOR RUN. The run is over and the name has gone quiet. The old high is still overhead supply. {detail}` | same |
| `NO RUN` | NO_CYCLE and today not qualified | dim | `NO RUN. No qualifying advance on record.` | same |
| `STARTED TODAY` | NO_CYCLE in settled bars but today QUALIFIED, and start hour not trusted | pos | `STARTED TODAY. Today cleared the volume and advance a run needs, measured on today's HIGH against the prior close. The settled test uses the CLOSE, so this may not become a DAY 1 once the session settles. {start detail}` | cycle.ts:159, 171-178, 518-528, 624-650 |
| `STARTED 5AM` (hour varies) | as above and the producer says it watched from the session open | pos | as above with `First ranked at HH:MM ET, RVOL 4.2x at that moment.` | cycle.ts:645-649; format.ts:181-186 |
| `NEW HIGH` (override) | today's high beat the arc (or today superseded) and price within one spread of that high | pos | `Price is within one spread of the high this move is measured against. Settled reading: {phase sentence}` (no `Settled reading:` prefix on STARTED TODAY rows) | cycle.ts:408-419, 467-470, 535-557 |
| `OFF HIGH` (override) | same, price more than one spread below | warn | `Price is more than one spread below the high this move is measured against. Settled reading: {phase sentence}` | same |
| (no badge) | no computed cycle, or prior-high-only reading | | | DB:1269; cycle.ts:560 |

`{detail}` (cycle.ts:90-130): `up 53.0% from 1.20 · high 1.84 on 2026-09-15 · 40.0% of the move given back · 2 sessions since the high · through 2026-09-16 close` (giveback clause only when above 0; `high is the latest session` when 0 sessions). Start detail when hour not trusted: `First ranked at HH:MM ET{, RVOL 4.2x at that moment}, but the desk was not watching from the session open, so that is when it was FIRST SEEN and not necessarily when it started.` or `The desk has no first-ranked time for this name.`

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| High pair | a reading exists (cycle with live price) | `$1.84 → $1.52` (U+2192); 4 decimals under $1, 2 above | ink-3, 10px semibold mono | cycle.ts:312-393, 422-435 | Left = max of cycle high and session high (or today's high when today supersedes); right = live price. No hover. |
| Prior high only | today's start is UNVERIFIABLE | `prior high $5.49 · Sep 15` (or without the date) | ink-3 | cycle.ts:366-368, 424-433 | Badge is hidden. Hover: `The desk cannot establish whether today started a new cycle, so it will not say which high this move is measured against. The prior high is shown because it is overhead supply either way. The cycle frame is 04:00–20:00, but highs before today are stored over a narrower window (they exclude after-hours and may exclude premarket), so a prior high can only be understated, never overstated.` (cycle.ts:589-590; en dash U+2013) |
| `Halted` badge | haltState HALTED | `Halted` (uppercase) | neg | DC:675-676 | Hover: raw halt text from the feed, or `Halted`. Also suppresses BLUE SKY on the price cell. |
| `Resuming` badge | haltState RESUMING | `Resuming` (uppercase) | warn | DC:677-679 | Hover: raw text or `Resuming` |

---

### C.11 Row behaviour

| Item | Behaviour | Computed from (file:line) |
|---|---|---|
| Click | opens the ticker's dossier drawer (`setSelectedTicker`, TickerDrawer) | DB:1115; components/DashboardShell.tsx:653, 752-759 |
| Clicks that do not open the row | focus star, setup grade badge, float cell (popovers), resize handles | FocusToggle.tsx:368-371; Popover.tsx:133-136, 161; ColumnResizeHandle.tsx:262 |
| Keyboard | each row is focusable (`tabIndex 0`, role button). Enter or Space opens; Up/Down move to the previous/next row; Home/End to first/last row. Keys inside the star are ignored by the row. | components/tableKeyboard.ts:13-52 |
| Row accessible name | `{TICKER}[, moving], RVOL 12.3x. A catalyst. NO FLAG FOUND. Open dossier.` (evening: `after-hours participation 3.4x`; catalyst phrase: `{X} catalyst`, `not researched`, `catalyst being researched`, or `no catalyst grade`) | DB:1109-1114; why.ts:489-496 |
| Table caption (screen reader) | `Discovery board, ranked by Daily RVOL. Use the arrow keys to move between rows and Enter to open a ticker.` (or `After-hours discovery board, ranked by AH Participation. ...`) | DB:669-673 |
| Selected row | accent/10 background | DB:1117 |
| Default row | panel/40 background, bottom hairline; hover and keyboard focus panel-2 | DB:1116-1117 |
| Changed row | accent flash (see C.2) | DB:1118 |
| One saturated colour per row | a halt (or resuming) or a BACKSIDE cycle suppresses the BLUE SKY line | DB:1087-1095, 1174 |
| Rank numbers | none shown; the Rank column was removed. Rank survives as the default sort and as `RVOL rank N` inside the moving hover | DB:689-712; view.ts:260-262 |
| Top N and movers | shows the top 12/25/50 of the current sort, then up to 15 moving rows from below the cut, same order, no separator | view.ts:276-285; DB:350 |

---

### C.12 Empty, loading and error states (DB:646-665)

Shown in a dashed-border box instead of the table when no rows are visible. Order of precedence:

| State | Exact text |
|---|---|
| No payload yet (loading) | `Waiting for the first market payload.` |
| Market feed down | `Market feed is not running. Discovery cannot populate until it reconnects.` |
| CLOSED or NEXT_DAY_PREP | `No session in progress. Discovery populates from 04:00 ET on {tradingDate}.` (or `... on the next session.` when no date) |
| Evening board, empty | `Nothing has traded enough since the close to rank on after-hours participation yet.` |
| Otherwise | `No names currently qualify for the discovery universe.` |

Toolbar loading words: `Ranking not loaded`, `counts not loaded` (DB:456, 527). No spinner. The range control shows a pulsing dot while a chosen range is pending (PriceRangeControl.tsx:79).

---

### C.13 Legends under the board (DB:874-895)

| Legend | Shown when | Exact text |
|---|---|---|
| Ranking legend, day | day board | `Daily RVOL = cumulative session volume ÷ average volume over the previous 20 eligible full sessions. High rank means abnormal participation worth investigating. It is not a trade, a catalyst, or a clean structure.` (÷ U+00F7) |
| Ranking legend, evening | evening board | `AH Participation = volume since the {rthClose} ET close ÷ average volume over the previous 20 eligible full sessions. It is deliberately not Daily RVOL: the numerator is one evening, not a trading day. High rank means abnormal after-hours participation worth investigating. It is not a trade, a catalyst, or a clean structure.` |
| Float legend | any row has float wired | FLOAT_LEGEND + filed-count sentence (same as the TMI Float header hover, C.7) |
| Setup grade legend | any row has grade wired | `Setup grade is the desk's own automatic reading of five criteria at the checkpoint shown: cycle, catalyst, relative volume, liquidity and share supply. It is the same for every reader. It is not a prediction and not a recommendation. An A needs a cycle the desk reads as strong and a C needs a cycle it reads as a backside, so a name whose cycle the desk cannot read is never graded A or C. A dash in this column means no grade was recorded for the name at that checkpoint. Not graded means fewer than three of the five criteria could be read.` (setupGrade.ts:89-90) |

All ink-3, 11px. Shown even when the table is empty.

---

### C.14 Glyphs

| Glyph | Code point | Where | Meaning |
|---|---|---|---|
| [U+2014] | U+2014 | price, percent, RVOL, Part, Now count, minute sparkline, Why letter, setup grade, AH volume | empty cell: no value / not measured |
| `Δ` | U+0394 | change gutter | row changed on the latest update |
| `★` / `☆` | U+2605 / U+2606 | ticker cell | in Focus / not in Focus |
| `▲` / `▼` | U+25B2 / U+25BC | active sort button | ascending / descending |
| `▼` | U+25BC | sorted column header | this column orders the board (always down) |
| `·` | U+00B7 | captions, header `Price · Gap · VWAP`, BLUE SKY line, OLD headline, prior high, sort badge | separator |
| `→` | U+2192 | cycle price pair | from the high to the last price |
| `≤` | U+2264 | float bound | no more than |
| `−` | U+2212 | VWAP dollar distance (negative), Now sub-line `−1m` | minus |
| `–` | U+2013 | price range `$1–$20`, prior-high hover `04:00–20:00` | range |
| `÷` | U+00F7 | ranking legend | divided by |
| `?` | U+003F | Move line anchor mark | anchor trade count not reported |
| circled i (SVG) | n/a | float cell | caveat (filings-only bound, or filed count whose checks passed) |
| triangle ! (SVG) | n/a | float cell | warning (restated bound, or filed count with failed/missing checks) |
| red dot | n/a | universe chip | warning marker |
| pulsing blue dot | n/a | range button | chosen range loading |
| 2px blue dots | n/a | Now sparklines | last price per slot/minute |
| 3px bars | n/a | Now sparklines | trade count per slot/minute |
| `’` | U+2019 | header hovers for RVOL, Part, Why, Cycle | apostrophe (curly) |

---

### C.15 Item count

Columns: 9 (change gutter, Ticker, Price/Gap/VWAP, RVOL/Part, Now, TMI Float, Why, Risk, Cycle). Inventoried items (table rows across C.0 to C.14, header rows excluded): 151.

---

### Unclear from the code

1. Change marker `Δ`: it fires when a ticker's `changeSignature` differs between polls (useDashboard.ts:33-35, 118-139), but no producer of `changeSignature` exists in this tree (only the type, lib/data/types.ts:148). Whether the marker can ever appear, and what "changed" covers for a user, cannot be told from the code.
2. Sorted header always shows `▼` and sets `aria-sort="descending"` (DB:942, 960) even when the sort is ascending (Rank, Setup grade default to ascending), while the sort button shows `▲`. Whether the header caret means "sorted here" or "descending" to a user is unclear.
3. The RVOL sort metric `session volume against a 20-session baseline` (DB:164) also appears in the sort badge on the evening board, where the column is `Part` (after-hours participation). The caption may describe the wrong quantity after the bell.
4. `low` mark on RVOL (DC:580-582): `rvolConfidence === 'LOW'` has no hover or legend on the board. What it means to a user is not stated.
5. `thin` anchor mark: its hover gives the trade count but never says what "thin" means; the dead line (30 trades) is not shown anywhere.
6. Why grade `C` is assigned when the catalyst grade is `NONE` (why.ts:470), and the C meaning reads `weak, negative or dilutive`. What a `NONE` grade means to a user is unclear.
7. Why hover on a prior-close-promoted row ends `The exact time is below.` (why.ts:462); on the board nothing sits below the letter. Where "below" points is unclear.
8. The sentence in that same hover uses ` -- ` (two hyphens) as a dash substitute (why.ts:462).
9. `Stale` threshold: decided server-side (`demand.freshness.stale`); the age at which a name becomes stale is not in this code.
10. Mover criteria: the floors (move, volume, cap) are server config not on the payload (view.ts:204-208); the caption says "a large move" without a number.
11. `{tradingDate}` in the CLOSED message and `{rthClose}` in the evening legend are printed raw from the payload; their exact format (likely `YYYY-MM-DD` and `HH:MM`) is not visible here.
12. Universe chip `universe from {date}` takes the UTC calendar day (`toISOString().slice(0,10)`, universe.ts:37), not the ET day; whether a user reads it as ET is unclear.
13. After-hours volume hover with no volume reads `[U+2014] traded since the close` (DB:1163): a glyph inside a sentence.
14. Cycle cell is blank with no explanation when there is no computed cycle (cycleBadge returns null, cycle.ts:560), so "not computed" and "nothing to show" look the same.
15. Retention note prints the raw band number (`retained > $${priceMax}`, view.ts:190-191), so a non-integer bound would print like `$0.5`; whether bounds are always whole dollars is not visible here.
16. Float filed-count words, the refused-panel definition and restated-bound words are marked in source as NOT YET PASSED (floatBound.ts:204-208, 503-506, 556-561); whether they are live copy is a review question, not a code fact.
17. `Part` header hover says "against the same stock’s average full-session volume" while the legend says "average volume over the previous 20 eligible full sessions"; whether these are the same baseline is not stated in this code.
18. Gap baseline for CLOSED and NEXT_DAY_PREP (`Gap`, "Change from the most recent session close") may be today's close or the prior close depending on the server's basis (view.ts:575-591); the board does not say which.

## D. The ticker drawer (dossier)

Source tree: A:\mointel-design-inv at 366eeebd. All paths below are relative to that tree. "CSS uppercase" means the element carries the Tailwind `uppercase` class, so the reader sees capitals whatever the source string's case.

### D.0 Shared building blocks (apply everywhere in the drawer)

| Item | Exact text / behaviour | Colour | Source (file:line) | Notes |
|---|---|---|---|---|
| Section box | Title is an `h3`, 10px, semibold, wide tracking | title `text-accent`; box `border-line`, `bg-panel-2/60` | components/TickerDrawer.tsx:513-525 | Title is CSS uppercase. Optional `titleHover` becomes the title's `title=` hover. |
| Field label | small label above each value | `text-ink-3` | TickerDrawer.tsx:563-567 | CSS uppercase, 9px. |
| Field value | the value; an empty string prints `Not provided` | `text-ink` when present, `text-ink-3` for `Not provided` | TickerDrawer.tsx:569-594 | Numeric fields use the `.num` class (monospace, tabular digits, app/globals.css:143-147). Optional `title=` hover. |
| Prose field | label, optional hint, paragraph; empty prints `Not provided` | `text-ink-2`; `text-warn/90` when tone warn; `text-ink-3` when empty | TickerDrawer.tsx:596-627 | Paragraph capped at 78 characters wide. |
| List field | label, a count beside it when more than one item, bulleted list | `text-ink-2`; `text-warn/90` when tone warn; count `text-ink-3` | components/AutomaticIntelligence.tsx:141-175 | Renders nothing when the list is empty. A trailing `;` on an item is stripped. |
| Status badge (chip) | small bordered label; hover = `title` prop, or the label itself when no title | tone classes below | components/StatusBadge.tsx:9-40 | CSS uppercase, 10px, truncates. |
| Badge tones | pos / warn / neg / accent / neutral / dim | pos: `border-pos/35 bg-pos/12 text-pos`; warn: same with warn; neg: same with neg; accent: same with accent; neutral: `border-line-2 bg-panel-3 text-ink-2`; dim: `border-line bg-panel-2 text-ink-3` | StatusBadge.tsx:9-16 | |
| Percent colour | signed percents | `text-pos` above 0, `text-neg` below 0, `text-ink-2` at 0 or unknown | StatusBadge.tsx:83-88 | |
| Colour tokens (dark default) | ink #e9edf3, ink-1 #c7cedb, ink-2 #97a1b0, ink-3 #8792a3, pos #2fc46f (green), warn #e8ac33 (amber), neg #f4574e (red), accent #4d93ff (blue), panel #0c0f14, panel-2 #11151c, panel-3 #161b23, line #1b212a, line-2 #29313d | | app/globals.css:8-39 | Light theme (`html[data-theme="light"]`) redefines them: pos #0f7a45, warn #8a5a00, neg #c22a22, accent #1d5fd1, ink #0d1218 etc. (globals.css:71-90). |
| Price format | 1000 and up: no decimals; 1 to 999.99: 2 decimals; under 1: 4 decimals; missing: [U+2014] | | lib/format.ts:117-122 | No `$` sign added by this helper; the drawer adds `$` only in some places (noted per row). |
| Signed percent | `+12.3%`, `-4.0%`, missing [U+2014] | | lib/format.ts:124-127 | One decimal. |
| Multiple (RVOL) | `23.4x`; 100 and up `123x`; missing [U+2014] | | lib/format.ts:130-134 | |
| Count (volume, shares) | compact: `4.86M`, `842K`, `1.2B`; missing [U+2014] | | lib/format.ts:102-114, 142-145 | Rounded to 2 decimals then printed as a plain number. |
| ET timestamp | `HH:MM:SS ET` (24-hour) | | lib/format.ts:88-93 | |
| ET day | `YYYY-MM-DD` on the ET calendar | | lib/format.ts:72-77 | |
| Checkpoint-style ET time | `15:42` on the reader's ET day, otherwise `Oct 4, 20:05` (24-hour); callers add ` ET` | | lib/dashboard/setupGrade.ts:156-161 | Used by setup grade, Risk in the evidence, Produced, Morning check. |
| Long date | `Sep 22, 2026` | | lib/dashboard/floatBound.ts:267-270 | |
| Relative age | under 1 hour `5m`; under 1 day `3h`; otherwise `2d`; same ET day with no clock `today` | | lib/dashboard/why.ts:104-123 | Printed as `{stamp} · {age} ago`. |
| ET stamp with 12-hour clock | `Oct 5, 9:30 AM ET` | | lib/dashboard/why.ts:161-173 | Used for Generated, Newest cited source, Event time. |
| Engine words (`humanise`) | named phrases (e.g. `FRESH_FOUND` to `fresh catalyst found`, `SECONDARY_STALE` to `secondary and stale`, `NONE_FOUND` to `no catalyst found in our sources`, `POSSIBLY_ACTIVE` to `possibly active`, `NOT_YET_ACTIVE` to `not yet active`, `REGISTERED_RESALE` to `registered resale`, `SHELF_CAPACITY` to `shelf capacity`, `FORMER_RUNNER` to `former runner`, `FORMER_SUPERRUNNER` to `former superrunner`, `SEC_FILING` to `SEC filing`, `SEC_SUBMISSIONS` to `SEC submissions`, `ISSUER_NEWSROOM` to `issuer newsroom`); anything else: underscores to spaces, lower case; empty: `unknown` | | lib/dashboard/language.ts:21-70 | |
| Model text cleaning | every dossier string and source title has em dashes rewritten (to commas, parentheses or en dash between numbers) and citation tokens like `[Source 115982]` removed before it reaches the drawer | | lib/dashboard/merge.ts:200-225; lib/dashboard/prose.ts:22-34 | So model prose should never show U+2014. |

### D.1 Opening, closing, keyboard

| Item | Shown when | Exact text / behaviour | Source (file:line) | Notes |
|---|---|---|---|---|
| Drawer opens | a board row is selected and the billing screen is not showing | full-height panel from the right, max 860px wide, over a dimmed board (`bg-black/60`) | components/DashboardShell.tsx:752-759; TickerDrawer.tsx:131-146 | Not rendered when `row` is null (TickerDrawer.tsx:129). |
| Dialog name | always | aria-label `{TICKER} dossier`, `role="dialog"`, `aria-modal="true"` | TickerDrawer.tsx:140-145 | |
| Focus on open | always | focus moves to the ticker heading | TickerDrawer.tsx:77-79, 260-267 | On close, focus returns to whatever had it before (the row). TickerDrawer.tsx:124-126 |
| Escape | always | closes the drawer | TickerDrawer.tsx:82-85 | Inside an open setup-grade popover, Escape closes the popover and stops the key event (components/Popover.tsx:141-146, 162-167), so it should not also close the drawer. |
| Tab | always | focus is trapped inside the panel and wraps first to last; includes links, enabled buttons, inputs and `<summary>` | TickerDrawer.tsx:86-118 | |
| Click on the dim backdrop | always | closes the drawer | TickerDrawer.tsx:133-138 | Backdrop is `aria-hidden`. |
| Close button | always | button text `Esc`; aria-label `Close dossier` | TickerDrawer.tsx:329-336 | CSS uppercase. `text-ink-2`, border `border-line-2`; hover border `accent/50` and text `ink`. |

### D.2 Section order (top to bottom) and when each shows

| # | Section title (verbatim, before CSS uppercase) | Shown when | Starts | Source (file:line) |
|---|---|---|---|---|
| 1 | (Header: no title) | always | open | TickerDrawer.tsx:147-153, 229-341 |
| 2 | `Desk Read` | always | open | TickerDrawer.tsx:166; components/DeskRead.tsx:162-249 |
| 3 | `Setup grade` | `row.setupGradeWired` is true | open | TickerDrawer.tsx:168; components/SetupGradeBadge.tsx:72-101 |
| 4 | `Morning check` | unless the morning view is HIDDEN | open | TickerDrawer.tsx:170; components/MorningCheck.tsx:16-66 |
| 5 | `Level Ladder` | always | open (its long list starts collapsed, see D.7) | TickerDrawer.tsx:173-179; components/LevelLadder.tsx:252-369 |
| 6 | `Desk Research` | research record exists but no accepted analysis | open | AutomaticIntelligence.tsx:242-252 |
| 7 | `Why It Is Moving` | accepted analysis exists | open | AutomaticIntelligence.tsx:334-392 |
| 8 | `Risk in the evidence` | accepted analysis exists | open | AutomaticIntelligence.tsx:395-408 |
| 9 | `Structural Intelligence · Desk` (· is U+00B7) | accepted analysis exists | open | AutomaticIntelligence.tsx:410-582 |
| 10 | `Momentum Cycle · Automatic` | accepted analysis exists | open | AutomaticIntelligence.tsx:584-618 |
| 11 | `Cycle, from daily bars` | accepted analysis exists | open | AutomaticIntelligence.tsx:55, 622-648 |
| 12 | `Evidence & Provenance` | accepted analysis exists | open | AutomaticIntelligence.tsx:650-709 |
| 13 | `Structural Analysis` | research status is NOT_ANALYZED | open | TickerDrawer.tsx:198, 213-227 |
| 14 | `Live Market Telemetry` (or `Market Telemetry` while the not-updating banner is up), containing the `Demand · Alpaca ...` section | always | CLOSED (`<details>`) | TickerDrawer.tsx:200-202, 502-511; lib/dashboard/feedBanner.ts:156-158 |

Sections 6 to 12 are all absent when the row has no research record at all (`intel` null, AutomaticIntelligence.tsx:240). Sections 6 and 13 can both show at once (a research record with no analysis and a NOT_ANALYZED status). The code comment says no conflict warning is ever placed in the closed section (TickerDrawer.tsx:155-164).

### D.3 Header

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Focus star | not a read-only review session | `★` (U+2605) when in Focus, `☆` (U+2606) when not | in Focus `text-accent`; not `text-ink-3`, hover accent | components/FocusToggle.tsx:30-52; TickerDrawer.tsx:254-259 | Button. aria-label `Remove {TICKER} from Focus` / `Add {TICKER} to Focus`; aria-pressed. Hover (in Focus): `{TICKER} is in Focus. Removing it changes nothing else: it stays in Discovery, stays tracked, and keeps its research.` Hover (not): `Keep {TICKER} in Focus for this session`. 18px in the drawer. Renders nothing in review mode. |
| Ticker | always | `{TICKER}` | `text-ink`, 26px bold | TickerDrawer.tsx:261-267 | Focus lands here on open. |
| Setup grade badge | `row.setupGradeWired` | a letter `A` / `B` / `C` / `D`, or `Not graded`, or [U+2014] | A: accent badge; B: neutral; C: dim; D: neg. `Not graded`: `text-ink-3` bordered, CSS uppercase, 9px. Dash: `text-ink-3`, no border | components/SetupGradeBadge.tsx:27-57; lib/dashboard/setupGrade.ts:186-235 | A button that opens a popover on hover, focus or click (Popover.tsx). Stored `AVOID` shows as `D`. The dash is built from code point 0x2014 (setupGrade.ts:79). See D.5 for the popover text. aria-labels: `Setup grade {L}`, `Setup grade: not graded`, `No setup grade: the desk has no research on this name at this checkpoint`, `Setup grade: none recorded`. Grade is from the research checkpoint (stored, not computed in the UI). |
| Cycle badge | always | one of `DAY 1`, `FRONTSIDE`, `OFF HIGH`, `BACKSIDE`, `PRIOR RUN`, `NO RUN`, `STARTED TODAY`; or `CYCLE NOT ESTABLISHED`, `ANALYSIS PENDING`, `ANALYSIS FAILED`, `NOT ANALYZED` | DAY 1 / FRONTSIDE / STARTED TODAY: pos; OFF HIGH: warn; BACKSIDE: neg; PRIOR RUN / NO RUN / unresolved states: dim | lib/dashboard/cycle.ts:46-53, 59-71, 151-182; lib/dashboard/deskRead.ts:393-398 | Computed from daily bars (`dossier.computedCycle`), not the model. Hover: the arithmetic line (see D.4 Cycle chip), or for `CYCLE NOT ESTABLISHED`: `Analysis ran but did not establish a cycle boundary for this name.`; otherwise the label itself. TickerDrawer.tsx:271-275 |
| Research status badge | always | `NOT YET ANALYZED`, `ANALYSIS PENDING`, `PARTLY ANALYZED`, `ANALYZED`, `ANALYSIS FAILED` | NOT YET / PENDING: dim; PARTLY / ANALYZED: neutral; FAILED: neg | lib/dashboard/intelligence.ts:49-63, 83-137 | Hover (`detail`): ANALYZED `Accepted desk dossier with all core conclusions established`; PARTLY `Accepted desk research, but {catalyst, structure, cycle} could not be established` or `Accepted desk research, but source coverage was incomplete`; PENDING `Research is underway; nothing accepted yet`; FAILED `Analysis failed and no usable intelligence was accepted`; NOT YET `Discovered by the market feed. No research has been produced for this name.` |
| RVOL rank badge | live data carries a rank | `RVOL #{n}` | accent | TickerDrawer.tsx:282-284; lib/dashboard/telemetry.ts:143 | Market data (Alpaca). Hover is the label. |
| Company line | always | company name with a full stop, e.g. `Acme Corp.`; or `No company name in the desk's research for this name.` (dossier with no name); or `The desk has not researched this name.` (no dossier) | `text-ink-2`, 12px, truncates | lib/dashboard/companyLine.ts:23-31, 58-82; TickerDrawer.tsx:287-288 | From the model's dossier (`companyName`). Hover on the line: the whole line (name plus country) only when a name exists. |
| Country | name and a decodable country exist | country with full stop, e.g. `Cayman Islands.` | `text-ink-3` | companyLine.ts:71-79; TickerDrawer.tsx:289-294 | Model-written `dossier.country` decoded by `countryName`. Hover: `Country as recorded in the desk's research.` |
| Country absent note | a name exists but no country | `Country: not in the desk's research` | `text-ink-3`, 11px | companyLine.ts:28, 78; TickerDrawer.tsx:296 | Own line under the company. |
| Price | always | `formatPrice` (e.g. `5.70`, `0.8123`), or [U+2014] with no live price | `text-ink`, 24px | TickerDrawer.tsx:301-303; telemetry.ts:128-160 | No `$` sign. Live Alpaca price only; no fallback. |
| % change | always | `+14.1%` or [U+2014] | green / red / ink-2 by sign | TickerDrawer.tsx:305-309 | Measured from the reference close (see the D.16 footnote). |
| Price source badge | always | `SIP` (trade), `BAR` (bar or historical bar), `SNAP` (snapshot), else the feed name upper-cased (e.g. `IEX`); with no live data [U+2014] | live: accent; none: dim (`sessionTone('NONE')`) | lib/dashboard/telemetry.ts:95-100, 185; TickerDrawer.tsx:310-324 | Hover: live and current `Live Alpaca market data`; live while the banner is up `Last market data received, {time} ET` or `No market data received since this page opened`; no live data `No live market data for this ticker.` (feedBanner.ts:146-153). |
| Stale badge | live data exists but the ticker has gone quiet | `stale` | warn | TickerDrawer.tsx:325 | Hover is the label (`stale`). Desk Read's stale badge has a fuller hover (D.4). |
| Close button | always | `Esc` | see D.1 | TickerDrawer.tsx:329-336 | |

### D.4 Desk Read (section 2)

Box: border `accent/30`, background `panel-2/80`. Title `Desk Read` (CSS uppercase, accent). Child order per the code comment "HIS ORDER": Why now, Structural warning, Next up / Next down, RVOL row, chips (DeskRead.tsx:201-206). Each block draws a top rule; the first one shown drops it.

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Price | always | `formatPrice`, no `$` | `text-ink`, 17px | DeskRead.tsx:173-175 | Same telemetry as the header. |
| % change | always | signed percent | by sign | DeskRead.tsx:176-178 | |
| Source badge | always | `SIP` / `BAR` / `SNAP` / feed / [U+2014] | live: accent; none: dim | DeskRead.tsx:179-189 | Same hovers as the header badge. |
| Stale badge | ticker quiet | `stale` | warn | DeskRead.tsx:191-197 | Hover: `No market event for {N}s; this is the last live print, not a current one` (or `an unknown time` for the age, lib/format.ts:195-197). |
| Why now | the dossier has a catalyst summary | label `Why now` then the summary, cut at about 240 characters at a sentence end or with `…` (U+2026) | label `text-ink-3`; text `text-ink-2` | DeskRead.tsx:112-160, 207; deskRead.ts:319-353, 434 | Model prose (`dossier.catalyst.summary`). Hover on the text shows the full sentence when it was cut. Label CSS uppercase. |
| Structural warning | the dossier has at least one structural warning | label `Structural warning` then the first warning (condensed as above) | label `text-warn`; text `text-warn/90` | DeskRead.tsx:208; deskRead.ts:435-438 | Model prose (`structure.structuralWarnings[0]`). |
| Coverage qualifier chip | either narrative shows and source coverage was incomplete | `SOURCE COVERAGE INCOMPLETE` | warn border `warn/30`, `text-warn` | DeskRead.tsx:134-141; deskRead.ts:351 | Hover: `Some sources could not be collected, so this may be missing something.` |
| Provenance word | a narrative's provenance is COMPUTED | `price history` | `text-ink-3`, CSS uppercase | DeskRead.tsx:99-103, 129-133 | Narratives are always AUTO today, so this word appears not to print on narratives (deskRead.ts:346-352). |
| Next up | always | label `Next up`; up to 3 levels as `{price} {type}{ dated Mon D}{ · STATE}{ distance}` joined by ` → ` (U+2192); none: `open` | label `text-ink-3`; price `text-ink` bold; type `text-ink-3`; state tag `text-warn`; distance `text-pos` | DeskRead.tsx:73-96, 210; deskRead.ts:244-275 | Price: 3 decimals under $1, else 2, no `$`; a zone prints `low–high` (en dash U+2013). Distance `+0.42` (dollars, 2 decimals) or [U+2014]. Type words as in D.7. Selected by importance and nearness (`selectForBoard`). |
| Next down | always | label `Next down`; same format, distance `-0.42` | distance `text-warn` | DeskRead.tsx:211 | |
| Air pocket note | the ladder found a side empty or 8% or more away | `No mapped resistance above current price`, `No nearby resistance until {p} ({x.x}% away)`, `No mapped support below current price`, `Air pocket below to {p} ({x.x}% away)`; two joined by ` · ` | `text-ink-3`, 10px | DeskRead.tsx:212-216; lib/data/priceLevels.ts:165, 726-740 | |
| RVOL | always | `RVOL` then `23.4x` or [U+2014] | value `text-ink` | DeskRead.tsx:220 | Labels in this row are CSS uppercase. Market data. |
| Rank | always | `Rank` then `#{n}` or [U+2014] | `text-accent` | DeskRead.tsx:221 | |
| Spread | always | `Spread` then `0.84%` or [U+2014] | `text-ink-2` | DeskRead.tsx:222-226 | Percent of price, 2 decimals. |
| Vol | always | `Vol` then compact count | `text-ink-2` | DeskRead.tsx:227 | Session cumulative volume. |
| Hi | always | `Hi` then price | `text-ink-2` | DeskRead.tsx:228 | Session high. |
| Lo | always | `Lo` then price | `text-ink-2` | DeskRead.tsx:229 | Session low. |
| Cycle chip | always | as the header cycle badge | as header | DeskRead.tsx:44-62, 233 | Hover: the arithmetic line, e.g. `up 53.0% from 1.20 · high 2.10 on 2026-10-14 · 12.0% of the move given back · 2 sessions since the high · through 2026-10-16 close` (cycle.ts:88-130); with no title `Cycle: {label}`. Beside it the word `price history` (CSS uppercase, ink-3, hover `price history`) because the cycle is COMPUTED. |
| Catalyst chip | always | `🔥 STRONG` (U+1F525), `🟢 LEGITIMATE POSITIVE` (U+1F7E2), `🟡 MODERATE / MIXED / SECONDARY` (U+1F7E1), `🔴 WEAK / NEGATIVE / DILUTIVE` (U+1F534), `NONE`; or `CATALYST UNKNOWN`, `ANALYSIS PENDING`, `ANALYSIS FAILED`, `NOT ANALYZED` | graded: neutral; others: dim | lib/research/view.ts:47-54; deskRead.ts:400-410 | Model's catalyst grade. Hover: the model's catalyst summary in full; unresolved `Analysis ran but reached no catalyst conclusion.`; in flight `Desk research is under way for this ticker.`; otherwise `Catalyst: {label}`. Max width 220px. |
| Structure chip | always | `CLEAN`, `CAUTION`, `DIRTY FLOAT`; or `STRUCTURE UNKNOWN`, `ANALYSIS PENDING`, `ANALYSIS FAILED`, `NOT ANALYZED` | CLEAN pos; CAUTION warn; DIRTY FLOAT neg; others dim | view.ts:63-68; deskRead.ts:168-179, 412-422 | Model's structure classification. Hover: model's structure summary; unresolved `Analysis ran but reached no structural conclusion.` |
| Research status chip | always | same as the header status badge | same | DeskRead.tsx:237-241 | |
| Retry analysis (owner) | status is ANALYSIS FAILED, and the viewer is the owner on /desk | button `Retry analysis`; while working `Clearing…` (U+2026); after success `Queued` (disabled) | accent border `accent/40`, bg `accent/10`, `text-accent`; CSS uppercase | components/RetryAnalysis.tsx:62-79; DeskRead.tsx:245 | POSTs `{apiBase}/research/retry`. Message beside it: success `Cleared {n} recorded failure(s); {TICKER} will be picked up on the next research cycle.` or `{TICKER} was not blocked; it will be picked up whenever it qualifies.` (lib/research/control.ts:85-87); failure messages `Market state store is not available yet.`, `The research tables do not exist yet.`, `Malformed request body`, `A valid ticker is required`, `not permitted` (403), fallback `Could not clear the failure.`, or a browser network error text. Success message `text-ink-3`; error `text-neg`. Owner rule: app/desk/page.tsx:36; lib/hooks/useDeskMode.tsx:27-37. |
| Retry note (everyone else) | status FAILED and the viewer is not the owner, or review mode | `Analysis did not complete for this name. It runs again if new information about it arrives.` | `text-ink-3`, 11px | RetryAnalysis.tsx:54-60 | |

### D.5 Setup grade (section 3)

| Item | Shown when | Exact text | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Sentence | always in this section | letter: `Setup grade {L} as of {time} ET. {reading sentence} {basis}`; not graded: `Not graded as of {time} ET. Fewer than three of the five criteria could be read. {basis}`; no research: `The desk has no research on this name at this checkpoint.`; none recorded: `The desk recorded no setup grade at this checkpoint.` | `text-ink-1` | setupGrade.ts:63-77, 209-235; SetupGradeBadge.tsx:81-84 | Reading sentences: A `The highest grade on these criteria.`; B `One or more criteria read below the strongest, or could not be read.`; C `A weaker reading: the cycle reads as a backside.`; D `Risk outweighs the setup.` Basis: `Strong: {names}. Limited: {names}. Risk: {names}. Not readable: {names}.` (empty groups dropped; setupGrade.ts:163-184). Time is the checkpoint's completed time, checkpoint-style ET. The same sentence is the header badge's popover. |
| Five criterion rows | a stored grade that is not the dash | label column `cycle`, `catalyst`, `relative volume`, `liquidity`, `share supply` (CSS uppercase, ink-3) then the reading | value `text-ink-1` | setupGrade.ts:55-61, 93-129; SetupGradeBadge.tsx:85-96 | cycle: STRONG `Fresh or frontside.`, LIMITED `Frontside, with a warning.`, RISK `Backside.`, unknown `The cycle could not be read.` catalyst: `A strong or clearly positive catalyst.` / `A moderate or mixed catalyst, or none found in our sources.` / `A weak, negative or dilutive catalyst.` / `The catalyst could not be graded.` relative volume: `Reads heavy on the desk's scale.` / `Reads moderate on the desk's scale.` / `Reads light on the desk's scale.` / `Volume could not be read.` liquidity: `Tight spread, deep dollar volume.` / `In between.` / `Wide spread or thin dollar volume.` / `Spread or dollar volume could not be read.` share supply: `A clean share structure with a small float bound.` / `A caution on the share structure, or clean without a small bound.` / `A dirty float.` / `The share structure could not be read.` |
| Legend | always in this section | `Setup grade is the desk's own automatic reading of five criteria at the checkpoint shown: cycle, catalyst, relative volume, liquidity and share supply. It is the same for every reader. It is not a prediction and not a recommendation. An A needs a cycle the desk reads as strong and a C needs a cycle it reads as a backside, so a name whose cycle the desk cannot read is never graded A or C. A dash in this column means no grade was recorded for the name at that checkpoint. Not graded means fewer than three of the five criteria could be read.` | `text-ink-3`, 11px | setupGrade.ts:89-90; SetupGradeBadge.tsx:98 | Grades are computed by research at the checkpoint and stored; the UI applies no thresholds (setupGrade.ts:1-20). |

### D.6 Morning check (section 4)

All words: lib/dashboard/morningCheckView.ts:37-63 and lib/dashboard/morningCatalystView.ts:31-39. Times are checkpoint-style ET with ` ET` (e.g. `22:00 ET`, `Oct 5, 22:00 ET`).

| Item | Shown when | Exact text | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Section title hover | section shows | `Compares the {evening} recap with the latest morning checkpoint: catalyst grade, catalyst status, catalyst event date and setup grade. Nothing else is compared.`; without an evening time: same sentence with `the evening recap` | | morningCheckView.ts:39-42, 111 | |
| Face (bold line) | always in the section | one of: `No morning check yet`; `Unknown`; `Catalyst and setup grade unchanged since {evening}`; `Revised since {evening}`; `Not re-read since {evening}` | `text-ink`, semibold | MorningCheck.tsx:32; morningCheckView.ts:122-166 | Read from `MarketSnapshot.morningRead` (research checkpoint comparison). Absent frame (not wired): `No morning check yet` with nothing else. Unreadable frame: `Unknown`. |
| Detail | depends on state | `No morning checkpoint has completed for this date.`; `This name was not among the names the {morning} checkpoint read.`; `The desk re-read this name's research after the evening checkpoint. Catalyst grade, catalyst status, event date and setup grade are the same as at {evening}.`; `The desk has not re-read this name's catalyst since the evening checkpoint. The setup grade is the same.` | `text-ink-2` | morningCheckView.ts:46-53 | Unknown and Revised print no detail. |
| Change lines | Revised | `{part}: {from} to {to}`, parts `Catalyst grade`, `Catalyst status`, `Catalyst event date`, `Setup grade` | `text-ink-2` | morningCheckView.ts:57-62, 92-97, 162-165 | Values: grade/status through `humanise`, with `NONE` to `no company event in the desk's evidence`, `CONFLICTING` to `conflicting evidence`, `NONE_FOUND` to `no catalyst found in our sources`; dates as long dates; `AVOID` as `D`; null `not stated`. |
| Compared line | both times known and state is not Unknown | `Compared: {evening} and {morning}.`; for a name only on the evening recap: `Evening recap: {evening}.` | `text-ink-3`, 11px | morningCheckView.ts:43, 54, 117, 139 | |
| Hidden | a name new this morning, or on neither checkpoint, or no evening call | section not rendered at all | | morningCheckView.ts:135-152 | |
| Sub-block label | morning research was written after the evening's (state NEWER) | `Catalyst in the morning research` | `text-ink-3`, CSS uppercase, 9px | MorningCheck.tsx:45-52; morningCatalystView.ts:77-105 | Hover: `The catalyst in the research the {morning} checkpoint used, shown only when that research was written after the research the {evening} recap used.` |
| Sub-block summary | NEWER and catalyst changed | model's catalyst summary (citations and em dashes stripped) | `text-ink` | morningCatalystView.ts:98 | |
| Sub-block facts | NEWER and changed | `Catalyst grade: {value}`, `Catalyst status: {value}` | `text-ink-2` | morningCatalystView.ts:99-102 | |
| Sub-block event date | NEWER and changed | long date, or `No event date` | `text-ink-2` | morningCatalystView.ts:103-104 | |
| Sub-block unchanged | NEWER and unchanged | `Catalyst grade, status and event date are the same as at the {evening} recap. The research was written again after that recap.` | `text-ink-2` | morningCatalystView.ts:37-38 | |
| Written line | sub-block shows | `Research written {Oct 6, 2026, 06:41} ET.` | `text-ink-3`, 11px | morningCatalystView.ts:36, 67-71 | Always dated, 24-hour. |

### D.7 Level Ladder (section 5)

Stored resistance levels are fetched from `{apiBase}/levels?symbol=...` when the drawer opens and every 60 s while it is open (components/ResistanceLevels.tsx:16, 34-81). The ladder is remounted per ticker, so it starts LOADING and collapsed for each name.

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Blue-sky line | always | one of `BLUE-SKY DATA UNAVAILABLE`, `BLUE-SKY LEVEL UNVERIFIED`, `BLUE SKY ABOVE ${ceiling}`, `ABOVE PRIOR CEILING ${ceiling}`, `NOT BLUE SKY · OVERHEAD AT ${ceiling}` | left bar and text: IN_BLUE_SKY (`ABOVE PRIOR CEILING`) accent; BLUE_SKY_ABOVE ink-1; NOT_BLUE_SKY ink-2; UNVERIFIED / UNAVAILABLE ink-3 | LevelLadder.tsx:163-196; lib/market/blueSky.ts:352-425 | CSS uppercase, 12px. Ceiling `$x.xx`. BLUE SKY ABOVE = within 25% below the ceiling, or no live price (blueSky.ts:62, 377-420). From stored daily bars. |
| Blue-sky detail | a window or reason exists | verified: `Highest prior-session high across {n} split-adjusted sessions, {from} to {to}. May not be an all-time high.`, or `Highest prior-session high since the {1-for-N reverse split / N-for-1 split} effective {date}. Older highs back to {date} are not compared with today's price.`, or `Highest prior-session high on today's share basis. Older highs back to {date} sit behind a share consolidation, so they are not compared with today's price.` Unverified reasons: `No daily history is retained for this ticker.`; `The retained history mixes adjustment bases, so a prior high cannot be compared with today.`; `The retained history is split-adjusted but was fetched on more than one date, and no split basis is established for it, so a split between those fetches could have restated part of it and not the rest.`; `The retained history is split-adjusted, but its split factors disagree across its fetch dates, so part of it sits on a stale basis.`; `The retained history is not split-adjusted, so a pre-split high cannot be compared with today.`; `A share consolidation stands between the highest stored price and today. With no high established on today's share basis, no ceiling is compared with today's price.`; `Only {n} prior session(s) are retained; at least 40 are needed before a ceiling means anything.` (or the share-basis form `...at least 40 are needed to set a ceiling.`); `The ${p} high on {date} is far above that session's own close and reads as a bad print rather than a traded level.`; `The ${p} high on {date} is an isolated spike: no other retained session came within 10% of it.` | `text-ink-3`, 11px | blueSky.ts:183, 205-216, 300-339, 444-460 | Dates here are raw `YYYY-MM-DD`. |
| Blue-sky hover | a deep high sits behind a known split factor | `Highest stored high: about ${x} as it traded on {date}, before share consolidations totaling {N-to-1}. Not comparable to today's price. Reference only.` (or `before a change in the share basis`) | | lib/dashboard/blueSkyView.ts:35-46 | |
| Empty ladder | no ladder levels and no stored levels | `No key levels available for this ticker.` | `text-ink-2` | LevelLadder.tsx:273-282 | Blue-sky line, note and footer still print. |
| Open-air note above | ladder's nearest resistance is missing or 8%+ away, and no stored level sits nearer | `No mapped resistance above current price` or `No nearby resistance until {p} ({x.x}% away)` | `text-ink-3` | LevelLadder.tsx:296-312; priceLevels.ts:729-734 | |
| Stored-levels note | per fetch state | `Loading stored levels…` (U+2026); `Stored levels could not be loaded.`; `No levels stored for this name. Levels are kept for names on the board and refreshed every few minutes.`; split: `Older levels are not shown: a split is not yet reflected in our stored history.` plus, when empty, `None of today’s 5-minute candles is above the price.` (U+2019 apostrophe); empty row: `No prior high above the price in the history we hold, back to {Mon D, YYYY}.` or without the date | `text-ink-3` | LevelLadder.tsx:236-243, 313; lib/dashboard/resistance.ts:113-151 | A 404 (route not wired) prints nothing. A failed refresh keeps the rows already shown. |
| Show-all toggle | more than 10 stored levels above the price | `Show all {n} levels above` / `Show the nearest 10` | `text-accent`, semibold, underline on hover | LevelLadder.tsx:316-325; resistance.ts:122, 259-268 | Button with `aria-expanded`. Starts collapsed (nearest 10 shown). |
| Ladder zone row (above or below) | each ladder level or cluster | price (`0.812` under $1, else `5.70`; a zone `low–high` with U+2013); type word (+ ` zone` when clustered; + ` dated Mon D` when dated); state tag; distance `+0.42 / 7.9%` above or `-0.42 / 7.9%` below (or [U+2014]); note column | price ink-1; type ink-2 CSS uppercase; state `text-warn` CSS uppercase; distance pos above, warn below; note ink-3 | LevelLadder.tsx:118-161 | Type words: `HOD`, `LOD`, `PM high`, `PM low`, `RTH high`, `AH high`, `PD high`, `PD low`, `PD close`, `VWAP`, `whole $`, `half $`, `resistance`, `support`, `reclaim`, `trigger`, `hist. resistance`, `blue sky`, `level` (priceLevels.ts:199-219). State tags: `LOST SUPPORT`, `PRICE ABOVE`, `AT LEVEL` (priceLevels.ts:239-243). Note column: a single level's note (`session high`, `session low`, `premarket high`, `after-hours high`, `PM VWAP` / `RTH VWAP` / `AH VWAP`, `prior ceiling, {date}`, `prior session close`, `current session close`, `derived round number`), or a zone's members `{price} {type} · {price} {type}`; clipped, full text on hover only when clipped (components/ClampedText.tsx). Inputs fed: session high/low (or premarket high before the open), after-hours high, session VWAP, verified blue-sky ceiling, reference close, whole and half dollars (lib/dashboard/merge.ts:271-304; priceLevels.ts:458-579). |
| Stored resistance row | each stored level shown | price; word `resistance` (CSS uppercase); timeframe tags `daily · 15m · 5m`; distance `+0.42 / 7.9%` (or `-` when price has crossed it); detail `{n} candle top(s) · {low} to {high} · over 12 months back` | price ink-1; tags ink-3; distance pos above, warn below | LevelLadder.tsx:205-224; resistance.ts:196-252 | Hover on the row: `{n} candle tops, candles ending {Mon D, HH:MM ET} to {Mon D, HH:MM ET}` (or `, candle ending ...`). From stored 5m/15m/daily candles (`lib/market/resistance.ts`). No strength marks by ruling. |
| Current price row | always (non-empty ladder) | price or [U+2014]; words `current price` (CSS uppercase); `0.84% sprd`; then `at {type} · {type}` or `Inside {p} {type} / {p} {type}` | price `text-ink` 14px; left bar `border-accent`; others ink-2/ink-3 | LevelLadder.tsx:330-349; priceLevels.ts:714-718 | |
| Air pocket below | nearest support missing or 8%+ away | `No mapped support below current price` or `Air pocket below to {p} ({x.x}% away)` | `text-ink-3` | LevelLadder.tsx:354-356 | |
| Not normalised | level text could not be parsed | `Not normalised: key levels: {text}` | `text-ink-3`, 10px | LevelLadder.tsx:359-363; priceLevels.ts:540-542 | Source is the Sheet key levels, which no longer feed the ladder (merge.ts:301-303). |
| Footer | stored row exists | `From ${p} at the {HH:MM ET} 5-minute close. Read: today’s 5m candles, 15m from {Mon D}, daily from {Mon D}, {YYYY}.` | `text-ink-3` | LevelLadder.tsx:271, 366; resistance.ts:161-180 | U+2019 apostrophe in `today’s`. |

### D.8 Desk Research (section 6: research exists, no analysis yet)

| Item | Shown when | Exact text | Colour | Source | Notes |
|---|---|---|---|---|---|
| Status badge | section shows | `NOT YET ANALYZED`, `ANALYSIS PENDING`, `COLLECTING SOURCES`, `ANALYZING`, `PARTIAL INTELLIGENCE`, `ANALYSIS FAILED` (and in principle `INTELLIGENCE AVAILABLE`, `RESEARCH CONFLICT`) | dim | AutomaticIntelligence.tsx:245; lib/research/view.ts:35-44, 118-145 | From the research job lifecycle. A different word set from the header status badge. |
| Body | section shows | `Source collection and interpretation are in progress. Nothing here yet should be read as a catalyst, a structure or a cycle classification.` | `text-ink-2` | AutomaticIntelligence.tsx:246-249 | Shown even when the job FAILED. |

### D.9 Why It Is Moving (section 7)

All values are from the model's accepted dossier (`dossier.catalyst`) unless noted.

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Grade badge | always | `🔥 STRONG`, `🟢 LEGITIMATE POSITIVE`, `🟡 MODERATE / MIXED / SECONDARY`, `🔴 WEAK / NEGATIVE / DILUTIVE`, `NONE`, `UNKNOWN` | dim (every grade) | AutomaticIntelligence.tsx:336; view.ts:47-54 | Emoji code points: U+1F525 fire, U+1F7E2 green circle, U+1F7E1 yellow circle, U+1F534 red circle. |
| Status line | always | `{status} · {freshness} · confidence {confidence}`, e.g. `fresh catalyst found · fresh · confidence high` | `text-ink-3`, 11px | AutomaticIntelligence.tsx:337-340 | Status words via `humanise`: `fresh catalyst found`, `secondary and stale`, `no catalyst found in our sources`, `conflicting`, `unknown`. Freshness: `fresh`, `recent`, `stale`, `unknown`. Confidence: `high`, `medium`, `low`, `unknown`. |
| Newest cited source | always | `Newest cited source {Oct 5, 9:30 AM ET · 2d ago}`; with no dated cited source `unknown` | label ink-3; value ink-2 | AutomaticIntelligence.tsx:326, 355-362; merge.ts:49-73 | Newest `publishedAt` among the catalyst's cited sources (exact stamps preferred). See Unclear for the unreachable `none dated`. |
| Summary | always | model prose, or [U+2014] | ink-2 | AutomaticIntelligence.tsx:364 | |
| Why traders may care | always | model prose, or [U+2014] | ink-2 | AutomaticIntelligence.tsx:365-369 | |
| Event time | always | EXACT: `{Oct 5, 9:30 AM ET} · {age} ago`; INFERRED: `{stamp}, time inferred`; date only: `{Oct 5}, time not stated`; none: `No event time` | ink | AutomaticIntelligence.tsx:35-42, 373; lib/dashboard/catalystView.ts:32-38, 70-103 | The clock prints only when a cited source with that exact instant is EXACT (or INFERRED). Hover on INFERRED only: `The source does not state a time. This time was taken from something next to the event, such as the time the filing was accepted.` |
| Sources the desk read | at least one cited source resolves | label `Sources the desk read`; one link per source, `{date}, {body}` | link `text-ink-1`, dotted underline | AutomaticIntelligence.tsx:181-210, 375; catalystView.ts:113-132; lib/dashboard/sourceLabel.ts:84-119 | Date `Oct 5` (or `Oct 5, 2025` in another year), ET. Body: exhibit `EX-99.1 to 8-K`; SEC filing `8-K` or `8-K, {lower-case description}` when the description says more than the form; else the title; else the source type in words. Duplicate labels get ` (2)`, ` (3)`. Opens in a new tab (`noopener noreferrer`). |
| Plausibly explains move | always | `yes`, `no`, `unknown` | ink | AutomaticIntelligence.tsx:376-385 | Model's judgement. |
| Unresolved | the model listed unknowns | list of model sentences | ink-2 | AutomaticIntelligence.tsx:386-391 | Count beside the label when more than one. |

### D.10 Risk in the evidence (section 8)

| Item | Shown when | Exact text | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Title hover | always | `One sentence from the desk's research: its reading of a risk the evidence shows for this name. It is the desk's reading and not a recommendation.` | | lib/dashboard/evidenceRiskView.ts:33-34 | |
| Sentence | PRODUCED | model's risk sentence, then `(as of {time} ET)` | sentence ink-1; as-of ink-3 | AutomaticIntelligence.tsx:396-400; evidenceRiskView.ts:84-95 | Time is the research version's generatedAt, checkpoint-style. Read through `evidenceRiskState` (lib/research/interpret/evidenceRisk.ts:201-209). |
| Sources | PRODUCED with resolvable cited sources | label `Sources the desk read` and links as D.9 | | AutomaticIntelligence.tsx:401 | |
| Unknown | no sentence, or no valid generatedAt | `Unknown` | ink-2 | evidenceRiskView.ts:36-37, 71-86 | Hover: `The desk is not showing a risk for this name. That is not a finding that there is no risk.` |
| Not recorded | research schema older than the field | `Not recorded` | ink-2 | evidenceRiskView.ts:38-39, 64-81 | Hover: `This name's research was written before the desk recorded this field.` |

### D.11 Structural Intelligence · Desk (section 9)

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Summary block: Structure | dossier has a structure | label `Structure` then badge `CLEAN` / `CAUTION` / `DIRTY FLOAT` / `UNKNOWN` | CLEAN pos; CAUTION warn; DIRTY FLOAT neg; UNKNOWN warn | AutomaticIntelligence.tsx:77-82; deskRead.ts:168-179, 293-314 | Model's classification. Block border `line`, bg `panel/60`. |
| Summary block: TMI Float | same | label `TMI Float` then face: `≤ 12.3M` (U+2264), or `{12.3M} sh` (filed count), `Unknown`, `Cannot verify`, `Not computed`; beside a plain bound its count date `m/d` (e.g. `9/22`) | bound `text-ink` semibold; filed count ink-2; others ink-3 | AutomaticIntelligence.tsx:89-100; floatBound.ts:323-416, 666-713 | SEC upper bound computed by research from SEC filings (shares outstanding less insider holdings) and stored; the drawer shows the board cell's face only (no popover here). Not wired: always `Not computed`. Bound rounded up (lib/research/compactBound.ts). |
| Float icon | filed-count face, or a bound marked filings-only or restated | 8px SVG: circled `i` (caveat) or triangle `!` (warning) | caveat ink-3; warning `text-warn` | components/FloatCell.tsx:105-125 | Hover (native title) carries the full sentences, e.g. `The company's filed share count as of {date}, with no insider holdings subtracted. It is not a TMI Float.` plus the reason and warnings (`The true share count may be higher.`, `This count may be in pre-split share units.`, `There may have been a split, needs verification.`, `This count is from {date}, more than 90 days ago.`); filings-only bound `No more than {x} shares, from the filed share count as of {date}, not counting warrants, convertible notes or share-sale programs already in place. There may be some, and they need verifying; the true figure may be higher.`; restated `Filed share count as of {date}, restated for {a 1-for-10 split on Sep 3, 2026}, as announced. The split list can miss a split.` (floatBound.ts:507-597). When an icon shows, the face carries an aria-label with the same words. |
| Float leaves-out line | same | `What a float leaves out: warrants, convertible notes and share-sale programs. Each can add shares.` | ink-3, 11px | AutomaticIntelligence.tsx:66, 103 | Same sentence on every drawer. |
| Known / potential supply | ledger has blocks | label `Known / potential supply`; rows: type (e.g. `REGISTERED RESALE`), amount (`1,234,567 sh` or `$5,000,000`, or [U+2014]), status lower-cased (`known active`, `possibly active`, `not yet active`, `unknown`) | type ink-1; amount ink-2; status ink-3 | AutomaticIntelligence.tsx:105-121; deskRead.ts:279-311 | Model's supply ledger (from filings). Type keeps the raw engine word with spaces; hover on the type = same text. Dollar capacity is never converted to shares. |
| Key warning | dossier has a structural warning | first structural warning, verbatim | `text-warn/90` | AutomaticIntelligence.tsx:123-127 | Not repeated in the Warnings list below. |
| Structure badge / Displayed float / Float confidence (fallback) | only when there is no structure summary | badge with structure label; `Displayed float` number or `unknown`; `Float confidence` humanised | dim badge | AutomaticIntelligence.tsx:418-435 | See Unclear: appears unreachable. |
| Shares outstanding | always | `1,234,567 (2026-09-30)` or `unknown` | ink | AutomaticIntelligence.tsx:438-448 | The model's figure (`structure.sharesOutstanding`; evidenceRisk.ts:121 names it `modelCount`). Browser-locale thousands separators. |
| Analysis confidence | always | `high`, `medium`, `low`, `unknown` | ink | AutomaticIntelligence.tsx:449 | Model's confidence in the structure analysis. |
| Summary | always | model prose, or [U+2014] | ink-2 | AutomaticIntelligence.tsx:452 | |
| Float sentence | a supply pair exists | desk reading: `Float is at most {n} {shares outstanding / shares issued / shares}{, split-adjusted}`; `Float not bounded under 10,000,000: {n} {quantity}`; `Float bound unverifiable: {n} {quantity}{ dated YYYY-MM-DD}`. Where the float is wired and the board cell refuses or marks the number, the cell's own sentence instead (e.g. `Cannot verify: shares may have been issued since the filed count.`, `The desk has not computed a TMI Float for this name.`, `No filed share count.`, the bound popover paragraph `Taking float as shares outstanding less insider holdings, it is no more than ...`) | PROVEN `text-pos`; all others ink-3 | AutomaticIntelligence.tsx:281, 467-474; lib/dashboard/drawerFloat.ts:27-50; lib/dashboard/supply.ts:182-227; floatBound.ts:272-310 | Hover on the desk's own sentence: PROVEN `Float cannot exceed the share count{ as of date}, whoever holds the rest.`; NOT PROVEN `A share count above the ceiling does not mean the float is large; it means this cannot settle it.`; unverifiable `The share count predates our price history, so we cannot certify no split occurred in between.` Share count from SEC company facts in the research bundle (lib/research/interpret/bundle.ts:276-288, pipeline.ts:419-428). Full Cannot-verify reason list: floatBound.ts:286-306. |
| Supply against shares outstanding | a supply pair exists | label `Supply against shares outstanding`; floor line: `no live supply proven`, or `at least {x.x}% of shares outstanding: {n} proven live across {k} block(s)`, or `{n} proven live, exceeding every share outstanding ({x}%)`; filed max line `up to {x.x}% if every filed block is live: {n} across {k} blocks`; denominator `{n} shares outstanding as of {date}`; `Not counted: {k} blocks with no share count / unverifiable split basis / a different split basis` | floor: settles `text-neg`, proven ink-1, else ink-3; filed max ink-2; denominator and exclusions ink-3; left rule `border-line` | AutomaticIntelligence.tsx:454-491; supply.ts:72-142 | Hover on the whole block: `floor counts only proven-live supply; total counts every filed block on the same split basis as the share count; excluded blocks are in neither` (lib/research/supply.ts:274-276). Percent: 1 decimal, none at 1000% and up. |
| No-denominator note | no supply pair but the ledger has blocks | `No filed share count, so this supply cannot be expressed as a ratio.` | ink-3 | AutomaticIntelligence.tsx:492-494; supply.ts:155-158 | |
| Supply groups (six, always all shown) | always | group labels: `8-K / 6-K`, `Registration / Prospectus`, `Offerings / ATM / PIPE`, `Warrants / Convertibles`, `Other share structure`, `Sources cited for share structure` | labels ink-3 CSS uppercase | AutomaticIntelligence.tsx:498-555; lib/dashboard/supplyGroups.ts:25-32, 85-128 | Built from the model's supply ledger and cited filings. |
| Group line | a block in the group | `{type} · {status}{ · 1,234,567 shares / · $5,000,000 capacity}{ · registration}` then ` · sources ` and source links separated by `; ` | text ink-1; sources ink-3 dotted underline | supplyGroups.ts:68-80; AutomaticIntelligence.tsx:508-538; sourceLabel.ts:36 | Words humanised (`registered resale · possibly active`). Registration group may open with `Known registration status · {words}`. |
| Group links | cited filings matching the group | source labels as D.9 | ink-1 dotted underline | AutomaticIntelligence.tsx:539-550 | 8-K / 6-K group takes forms starting 8-K or 6-K; Registration takes S-, F-, 424B, POS, SF- forms; the last group takes the structure's own citations. |
| Empty group | nothing in a group | `Nothing recorded for this group.` | ink-3 | supplyGroups.ts:35-37 | Hover: `The desk's research holds nothing here. Either it found none or it did not read for this group; the record does not say which.` |
| Warnings | warnings beyond the first | list | `text-warn/90` | AutomaticIntelligence.tsx:328-330, 563-569 | |
| Reverse splits | model listed history | list | ink-2 | AutomaticIntelligence.tsx:570-575 | |
| Unresolved | model listed unknowns | list | ink-2 | AutomaticIntelligence.tsx:576-581 | |

### D.12 Momentum Cycle · Automatic (section 10)

Model's own cycle block (`dossier.cycle`), except Former runner (see row).

| Item | Shown when | Exact text | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Classification badge | always | `GREEN, FRESH / FRONTSIDE`, `YELLOW, FRONTSIDE WARNING`, `RED, BACKSIDE`, `UNKNOWN` | dim | AutomaticIntelligence.tsx:585; view.ts:56-61 | |
| Reasoning | always | model prose, or [U+2014] | ink-2 | AutomaticIntelligence.tsx:586 | |
| Current cycle high | always | the number as stored (e.g. `2.1`), or `unknown` | ink | AutomaticIntelligence.tsx:589-593 | No `$`, no fixed decimals. |
| Current giveback | always | `12.3%` or [U+2014] | ink | AutomaticIntelligence.tsx:594-598 | |
| Historical resistance | always | the number as stored, or `unknown` | ink | AutomaticIntelligence.tsx:599-603 | |
| Former runner | always | `none`, `former runner`, `former superrunner`, `unknown` | ink | AutomaticIntelligence.tsx:604; lib/research/interpret/pipeline.ts:384-386; lib/market/cycle.ts:515, 644-648 | Overwritten from daily bars when bars exist (largest prior advance; 200% or more is superrunner); otherwise the model's value. |
| Recent major runs | model listed runs | list | ink-2 | AutomaticIntelligence.tsx:605-610 | |
| Cycle warnings | model listed warnings | list | `text-warn/90` | AutomaticIntelligence.tsx:611-617 | |

### D.13 Cycle, from daily bars (section 11)

All from `dossier.computedCycle` (daily bars, lib/market/cycle.ts). Words: lib/dashboard/cycleFacts.ts:31-52.

| Item | Shown when | Exact text | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Message | no history, or no current run | `Cannot tell: not enough daily history.` / `No current run in the history we hold.` | ink-2 | cycleFacts.ts:85-103 | |
| Phase | a current run | label `Phase`, value `DAY 1` / `FRONTSIDE` / `OFF HIGH` / `BACKSIDE` / `PRIOR RUN` | ink | cycleFacts.ts:116; AutomaticIntelligence.tsx:624 | Hover: `The desk's reading of where the current run stands, computed from daily bars. It describes the move so far and is not a forecast.` |
| How it is measured | a current run | the arithmetic line, e.g. `up 53.0% from 1.20 · high 2.10 on 2026-10-14 · 12.0% of the move given back · 2 sessions since the high · through 2026-10-16 close` (or `high is the latest session`) | ink | cycleFacts.ts:117; cycle.ts:88-130 | Raw ISO dates; prices without `$`. |
| Cycle high | a current run | `${price}, {Mon D, YYYY}` | ink, numeric | cycleFacts.ts:118-123 | Hover: `Highest price since the current run began, from daily bars through {date}'s close.` |
| Flush from high | a current run | `{x.x}% below the cycle high, at {date}'s close` | ink | cycleFacts.ts:124 | |
| Prior runs | always | label `Prior runs`; lines `{Mon D, YYYY} to {Mon D, YYYY}: up {x}% from the base close to the high, high was {n} sessions ago` (or `high was the latest session`; one-day run `{date}, start and high on the same day`); first line may start `Current run: `; empty `No earlier run in the history we hold.` | lines ink-1; empty ink-2 | cycleFacts.ts:70-83, 91-131; AutomaticIntelligence.tsx:628-647 | Hover on the label and lines: `A run starts on a day the stock rose at least 20% on at least 5 times its usual volume.` Current-run line hover: `Listed because the desk's cycle reading has this run ended: it gave back a large share of its advance, or trading in it went quiet.` |

### D.14 Evidence & Provenance (section 12)

| Item | Shown when | Exact text | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Generated | always | `{Oct 5, 9:30 AM ET} · {age} ago`, or `unknown` | ink | AutomaticIntelligence.tsx:58-63, 305, 651 | Research version's generatedAt. |
| Produced | setup grade wired and has a checkpoint time | `{15:42 / Oct 4, 20:05} ET` | ink | AutomaticIntelligence.tsx:304, 652; lib/dashboard/produced.ts:21-42 | The older of the research time and the checkpoint time. Hover: `The older of when the desk's research was written and when the checkpoint it rests on ran.` |
| Model | always | the model identifier as stored, or `unknown` | ink | AutomaticIntelligence.tsx:653 | |
| Analysis version | always | `v{id} (schema {n})` (schema `?` when missing), or [U+2014] | ink | AutomaticIntelligence.tsx:654-661 | |
| Coverage warning | source coverage was incomplete | `Source coverage was incomplete. The conclusions above are correspondingly limited.` | `text-warn`, dashed border `warn/40`, bg `warn/8` | AutomaticIntelligence.tsx:662-666 | Coverage is a collection fact, not the model's (bundle.ts:581-583). |
| Sources list | evidence exists | label `Sources`; each link `[{id}] {SEC form or source type} · {accession} · {title}` then `{authority} · {YYYY-MM-DD}` and ` (date only)` | link ink-1 dotted underline; trailing text ink-3 | AutomaticIntelligence.tsx:668-708 | Authority humanised: `sec`, `exchange`, `company ir`, `newswire`, `market data`, `secondary`. Day on the ET calendar. Prints the internal id and accession number, unlike the other source lists. New tab, `noopener noreferrer`. |

### D.15 Structural Analysis (section 13)

| Item | Shown when | Exact text | Colour | Source |
|---|---|---|---|---|
| Badge | status NOT_ANALYZED | `Not yet analyzed` (CSS uppercase) | dim | TickerDrawer.tsx:217 |
| Body | same | `{TICKER} was discovered by the market feed on abnormal participation. The research desk has not produced a catalyst, cycle, structure or float assessment for it. Nothing here should be read as a clean structure, a legitimate catalyst, or a frontside classification. It says only that demand was detected and deserves investigation.` | ink-2 | TickerDrawer.tsx:219-224 |

### D.16 Live Market Telemetry (section 14, starts closed)

Summary line: `Live Market Telemetry`, or `Market Telemetry` while the not-updating banner is up (feedBanner.ts:156-158). 10px, CSS uppercase, `text-ink-3`, hover `text-ink-2`. Inside is a Section. All values are Alpaca market data (`row.demand`).

| Item | Shown when | Exact text | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| No data | no live data for the ticker | section title `Demand · Alpaca`; text `No live market data for this ticker.` | ink-3 | TickerDrawer.tsx:350-363 | |
| Section title | live data | `Demand · Alpaca {FEED}` e.g. `Demand · Alpaca SIP` | accent | TickerDrawer.tsx:366 | Feed: `SIP`, `IEX`, `SIMULATOR`, `TEST`. |
| Demand detected | live data | `Demand detected` | accent | TickerDrawer.tsx:368 | |
| High-res stream | subscribed to trades/quotes/LULD | `High-res stream` | neutral | TickerDrawer.tsx:369-371 | Hover `Subscribed to trades, quotes and LULD bands` |
| Retained for session | latched | `Retained for session` | neutral | TickerDrawer.tsx:372-378 | Hover `Qualified inside the discovery price range and kept tracked for the rest of the session. An engine detail, surfaced here for audit only.` |
| RVOL confidence: low | baseline confidence LOW | `RVOL confidence: low` | warn | TickerDrawer.tsx:379-385 | Hover `Baseline built from {n} eligible sessions` |
| Halt badge | HALTED or RESUMING | `Halted` / `Resuming` | neg / warn | components/DecisionCells.tsx:675-681 | Hover: the raw halt text, or the label. |
| Ticker quiet | freshness stale | `Ticker quiet` | warn | TickerDrawer.tsx:387-393 | Hover `No market event for this ticker recently; the feed itself may still be healthy` |
| Price | always | price (no `$`) | ink | TickerDrawer.tsx:397 | |
| % Change | always | signed percent | ink | TickerDrawer.tsx:398 | Not coloured by sign here. |
| Reference Close | always | label `Reference Close (prior RTH)` or `Reference Close (today's RTH)`; value `{price} · {YYYY-MM-DD}` or `Unknown` | ink | TickerDrawer.tsx:399-411 | |
| Session Volume | always | compact count | ink | TickerDrawer.tsx:412 | |
| Daily RVOL | always | `23.4x` | ink | TickerDrawer.tsx:413 | |
| RVOL Rank | always | `#{n}` or `Unranked` | ink | TickerDrawer.tsx:414-418 | Rank Change line removed by ruling (TickerDrawer.tsx:419-432). |
| Session High / Session Low | always | price | ink | TickerDrawer.tsx:434-435 | |
| Bid / Ask | always | `{bid} × {ask}` (U+00D7), or `No quote` | ink | TickerDrawer.tsx:436-444 | |
| Spread | always | `{spread} ({x.xx}%)`, `Invalid / crossed`, or [U+2014]; a missing percent prints `([U+2014]%)` | ink | TickerDrawer.tsx:445-455 | Level 1 quote. |
| LULD Band | always | `{lower} – {upper}` (U+2013), or `Not published` | ink | TickerDrawer.tsx:456-464 | Limit Up / Limit Down band. |
| Halt State | always | raw `TRADING`, `HALTED`, `RESUMING`, `UNKNOWN` | ink | TickerDrawer.tsx:465; lib/market/types.ts:53 | |
| Price Source | always | raw `sip-trade`, `sip-bar`, `sip-snapshot`, `sip-historical-bar`, `simulator`, `test-stream`, or [U+2014] | ink | TickerDrawer.tsx:466; types.ts:55-61 | |
| Last Market Event | always | `{HH:MM:SS ET} ({n}s)` or `None` | ink | TickerDrawer.tsx:467-475 | |
| Sessions group label | always | `Sessions` | ink-3, CSS uppercase | TickerDrawer.tsx:532-561; lib/dashboard/sessionsView.ts:36-39 | |
| Regular session close | always | `${price}, {Mon D, YYYY}`; `Today's regular session has not closed`; `Unknown` | ink | sessionsView.ts:103-128 | Hover: `The regular-session close from the daily bar for {date}.`; `The last trade the desk saw around the bell on {date}. The daily bar's close can differ.`; `The close for {date} as the Sheet recorded it.`; `A close for {date}. The desk did not record where it came from.`; `The desk has no regular-session close recorded for {date}.` |
| After hours | always | before the bell `Today's after hours begins after the regular-session close`; no trade `No after-hours trade recorded`; else three parts `${price}, {+x.x%} from the close, {n} shares` | produced parts ink; unknown parts ink-3 | sessionsView.ts:130-185 | Part words: `Unknown`, `No final close`, `No close`. Hovers: `Measured from the close shown above, for {date}.`; `The change is measured from the daily bar's close for {date}, which the desk does not have.`; `The desk has no close to measure the change from.`; `Counts only trades after the bell.`; `The desk did not see every trade after the bell on {date}, so a volume would leave out some.`; `The desk did not see every trade after the bell on {date}, so it cannot show an after-hours price or change.`; `The desk's after-hours figures for {date} include no trade.` |
| Footnote | live data | `Baseline: {n} eligible full sessions, {split-adjusted / unadjusted, }average {count} shares, calculated {Oct 6, 16:11 ET}. Percent change is measured from the {prior / current} session's close ({Mon D, YYYY}), taken from {the daily bar / the Sheet / a source the desk did not record}. Prior session close ${p}. Level 1 spread only. This is not depth.` | ink-3, 10px | TickerDrawer.tsx:485-491; sessionsView.ts:192-230 | Clauses drop out when their data is missing. |

### D.17 Glyph index

| Glyph | Code point | Where | Meaning |
|---|---|---|---|
| ★ | U+2605 | header focus star | ticker is in Focus |
| ☆ | U+2606 | header focus star | ticker not in Focus |
| [U+2014] | U+2014 [flag] | missing price, percent, RVOL, counts; header/Desk Read source badge with no live data; Desk Read Rank and Spread; setup-grade dash; ladder distance; supply amount; Summary / Reasoning / Why traders may care fallback; Current giveback; Analysis version; Spread `([U+2014]%)`; Price Source | value absent. Setup grade dash: no grade recorded (two different hovers). |
| – | U+2013 | ladder zone `low–high`; Desk Read zone price; LULD band | a price range |
| → | U+2192 | Desk Read Next up / Next down | separates successive levels |
| × | U+00D7 | Bid / Ask | separates bid and ask |
| · | U+00B7 | section titles, status line, stamps with ages, tags, notes | separator |
| … | U+2026 | `Clearing…`, `Loading stored levels…`, condensed Desk Read text | in progress / text cut |
| ≤ | U+2264 | TMI Float face | upper bound ("no more than") |
| ’ | U+2019 | `today’s` in the level notes and footer | apostrophe (curly, unlike the straight apostrophes elsewhere) |
| 🔥 🟢 🟡 🔴 | U+1F525, U+1F7E2, U+1F7E1, U+1F534 | catalyst grade chip and badge | strong, legitimate positive, moderate/mixed/secondary, weak/negative/dilutive |
| circled i (SVG) | none | TMI Float icon, caveat | filed count with checks passed, or bound with a caveat |
| triangle ! (SVG) | none | TMI Float icon, warning | filed count failing a check, or restated bound |

### Unclear from the code

1. "Newest cited source" has a fallback `none dated` (AutomaticIntelligence.tsx:359), but `timeWithAge` always returns a string (`unknown` when missing, :58-63), so `none dated` looks unreachable and the reader sees `unknown`. Which word is intended?
2. The header and Desk Read source badge shows [U+2014] when there is no live price (telemetry.ts:185). That is a chip holding only a dash; its meaning comes from the hover only.
3. Live Market Telemetry prints raw engine values for `Halt State` (`TRADING`, `UNKNOWN`) and `Price Source` (`sip-trade`, `sip-historical-bar`). What a user should take from them is not stated anywhere in the drawer.
4. `Model` prints the stored model identifier as-is (AutomaticIntelligence.tsx:653). What a reader should do with it is not clear.
5. Two cycle readings sit in adjacent sections with different word sets: `Momentum Cycle · Automatic` (model: `GREEN, FRESH / FRONTSIDE` etc.) and `Cycle, from daily bars` (`FRONTSIDE`, `OFF HIGH` etc.). Code comments say the model classification is being deleted (deskRead.ts:381-392). Which one a user should trust is not explained on screen.
6. `Current cycle high` and `Historical resistance` (model) print `String(number)` with no `$` and no fixed decimals (AutomaticIntelligence.tsx:591, 601), unlike every other price.
7. The `Known / potential supply` list shows the raw type with spaces in capitals (`REGISTERED RESALE`) and the status lower-cased (`known active`), while the supply groups below humanise the same blocks (`registered resale · possibly active`). Two vocabularies for one block.
8. The fallback `Displayed float` / `Float confidence` / structure badge (AutomaticIntelligence.tsx:418-435) render only when `structureSummary` is null, which happens only when the dossier has no structure, yet the section is reached only with an accepted analysis. It looks unreachable.
9. Ladder state tags (`LOST SUPPORT`, `PRICE ABOVE`, `AT LEVEL`), level dates (` dated Aug 13`) and `Not normalised:` depend on support/resistance-role and Sheet levels, which merge.ts:288-303 no longer feeds (and `historicalResistance` is always null, lib/data/cycleLevels.ts:67-76). They appear unreachable today; `RTH high` too (`rthHigh: null`).
10. The `Supply against shares outstanding` block hover (lib/research/supply.ts:274-276) uses the words "floor" and "total", which the visible copy never prints, and starts lower-case.
11. A missing spread percent prints `([U+2014]%)` (TickerDrawer.tsx:449).
12. The `Desk Research` body says collection "is in progress" even when the badge reads `ANALYSIS FAILED` (AutomaticIntelligence.tsx:242-251).
13. `Desk Research` and `Structural Analysis` can both show for one name, and the header's status badge (`NOT YET ANALYZED`) and the Desk Research badge (`COLLECTING SOURCES` etc.) use two different word sets for research status.
14. The catalyst grade badge in `Why It Is Moving` is dim for every grade, while the same grade in the Desk Read chip is neutral. Whether the difference means anything is not stated.
15. `% Change` in Live Market Telemetry is not coloured by sign; the header and Desk Read percents are.
16. `Analysis confidence` (structure) and `confidence` (catalyst status line) are model self-ratings; the drawer does not say what high/medium/low rest on.
17. The `Sources` list in Evidence & Provenance prints the internal source id `[123]` and the SEC accession number; the other source lists in the drawer deliberately do not (sourceLabel.ts:17).
18. The Desk Read provenance word `price history` has a hover that repeats itself (`price history`), adding nothing.
19. Escape inside an open setup-grade popover: by the code (Popover.tsx stops propagation; the drawer listens on `document`) it closes only the popover. Not verified in a browser.

## E. Below the board, and the session reports

Source tree: `A:\mointel-design-inv` at 366eeebd. All references are file:line in that tree. "CSS uppercase" means the class `uppercase` transforms the text on screen; the source string is shown as written. Colour tokens are in `app/globals.css:9-39` (dark, the default) and `:73-90` (light, `html[data-theme="light"]`): `desk`, `panel`, `panel-2`, `panel-3` (surfaces), `line`, `line-2` (rules), `ink` > `ink-1` > `ink-2` > `ink-3` > `ink-4` (text, brightest to dimmest), `pos` (green), `warn` (amber), `neg` (red), `accent` (blue). The `num` class (`app/globals.css:143`) is monospace with tabular figures.

Order in the main column, below the board (`components/DashboardShell.tsx:685-715`): Desk Events feed, then Graveyard, then the Normalization notices footer. The report window is a separate overlay (`DashboardShell.tsx:718-737`). The one-row briefing line and the inline briefing above the board (`BriefingLine`, `InlineBriefing`) belong to another section; they are named here only where they open the window or share its body.

---

### E1. Desk Events feed (`components/DeskEventFeed.tsx`)

Always rendered (`DashboardShell.tsx:685-689`); it never hides itself. Input: `market.snapshot?.events ?? null` (null means there is no market snapshot at all).

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Section title | Always | `Desk Events` (CSS uppercase, wide tracking) | `text-ink-2` | `DeskEventFeed.tsx:71-73` | h2 |
| Count | Always | the number of lines currently shown, e.g. `7` | `text-ink-3`, `num` | `:74`, `visible.length` | Counts the current view (Relevant or All), not the whole store |
| Background count | Relevant view only, and only if some events were filtered out | `{n} background`, e.g. `5 background` | `text-ink-3`, `num`, 10 px | `:77-79`; `hidden = ranked.length - material.length` (`:66`) | |
| View toggle | Always | two buttons: `Relevant`, `All` (CSS uppercase) | selected: `bg-accent/15 text-accent`; unselected: `bg-panel-2 text-ink-3`, hover `bg-panel-3 text-ink-2` | `:80-100` | Default is Relevant (`useState(false)`, `:61`). Not remembered across reloads |
| Empty: no snapshot | No lines to show and events is null | `The desk has no snapshot, so it cannot say what has happened.` | `text-ink-3` | `:104-107` | |
| Empty: nothing yet | No lines, events array empty | `No deterministic events yet this session.` | `text-ink-3` | `:108-109` | |
| Empty: filtered | No lines in view, but events exist (all background) | `No events for the names currently in view.` | `text-ink-3` | `:110` | Only in Relevant view |
| Event line (button) | One per event in view | four parts on one row: time, ticker, type label, message | see rows below | `:113-153` | List scrolls inside a box of max 108 px height (`:113`). Whole row is a button; click opens the ticker drawer via `onSelect(item.event.symbol)` (`:118`). Hover `bg-panel-2` |
| Time | Each line | `HH:MM:SS ET`, 24-hour, e.g. `09:31:07 ET` | `text-ink-3`, `num` | `formatEtTimestamp(item.event.ts)` (`lib/format.ts:88-93`, clock formatter `:5-11`) | Unparseable time shows the empty-cell glyph U+2014 (`DeskEventFeed.tsx:122`), the one permitted em-dash use |
| Ticker | Each line | event symbol, e.g. `ABCD`; for checkpoint events the symbol is `DESK` | `text-ink` bold; `text-ink-3` if the name is background | `:124-130`; `DESK` from `worker/desk-assessments.ts:746` | |
| Type label | Each line | see type table below (CSS uppercase) | per type, below; background names always `text-ink-3` | `TYPE_LABEL` `:21-30`, `TYPE_TONE` `:10-19` | Unknown type prints its raw code |
| Message | Each line | the stored message, em dashes cleaned at display | `text-ink-2`; `text-ink-3` if background | `withoutEmDash(item.event.message)` (`:143-148`, `lib/dashboard/prose.ts:22-38`) | Truncated with ellipsis to one line; `title=` hover shows the full cleaned message |

Event types (label, colour, and the message the writer stores):

| Type code | Label shown | Colour (non-background) | Stored message form (source) | Notes |
|---|---|---|---|---|
| NEW_HOD | `NEW HOD` | `text-pos` | `New session high $X.XX` (4 decimals under $1) (`lib/market/engine.ts:2177`) | |
| HALT | `HALT` | `text-neg` | `Halted` or `Halted [U+2014] {raw}` (`engine.ts:2211`); shown as `Halted, {raw}` after cleaning | source contains U+2014, flagged |
| RESUME | `RESUME` | `text-accent` | `Trading resumed` or `Resumption pending (quotations)` (`engine.ts:2223`) | |
| RVOL_RANK_ENTRY | `RVOL RANK ENTRY` | `text-accent` | `Entered Top {N} at #{rank}` plus ` [U+2014] RVOL {x.x}x` (`engine.ts:1931-1933`); shown with a comma | source contains U+2014, flagged |
| AH_RANK_ENTRY | `AH RANK ENTRY` | `text-accent` | `Entered after-hours Top {N} at #{rank}` plus ` [U+2014] {+x.x}% AH` (`engine.ts:2113-2115`); shown with a comma | source contains U+2014, flagged |
| DISCOVERY_QUALIFIED | `DISCOVERY` | `text-ink-2` | `Entered the tracked discovery population at $X.XX` plus ` [U+2014] RVOL {x.x}x` (`engine.ts:1890-1891`); shown with a comma | source contains U+2014, flagged |
| CATALYST_SOURCE_CHANGE | `SOURCE CHANGE` | `text-accent` | `{n} new public source(s), highest authority {AUTH}` where AUTH is a raw code: SEC, EXCHANGE, COMPANY_IR, NEWSWIRE, MARKET_DATA, SECONDARY (`lib/research/catalyst/collector.ts:1149-1155`, `lib/research/types.ts:210-216`) | raw enum codes reach the screen |
| DESK_ASSESSMENT | `ASSESSMENT` | `text-ink-2` | `{label} ({HH:MM} ET) [U+2014] {n} names on {ranking}` plus ` · generated late by {s}s` plus `: T1, T2, T3` (`worker/desk-assessments.ts:747-750`); ranking is `Daily RVOL` or `AH Participation` (`lib/market/board.ts:39,47`); labels from `lib/desk/schedule.ts:115-125` | source contains U+2014, flagged; symbol is `DESK` |

Relevance and order (`lib/dashboard/events.ts`): each event's symbol is PRIMARY (in the viewer's Focus list), TOP_RANKED (inside the board's top N, default 12), TRACKED (any row the desk holds), else BACKGROUND (`events.ts:79-84`; universe built at `DashboardShell.tsx:348-356`). Relevant view = everything not BACKGROUND, plus HALT, RESUME, SOURCE CHANGE and ASSESSMENT wherever they occur (`events.ts:54-61,104`). Sort: relevance then type weight (halts, resumes, assessments first; NEW HOD last), ties newest first (`events.ts:35-46,92-112`). So the list is NOT in time order.

Glyphs: U+2014 (empty-cell glyph, unreadable time). U+00B7 middle dot inside the assessment message (` · generated late`).

---

### E2. Graveyard (`components/Graveyard.tsx`, `lib/dashboard/graveyard.ts`)

Always rendered (`DashboardShell.tsx:696-700`). Collapsed by default (`Graveyard.tsx:49`); not remembered across reloads. Rows: every desk row (`merged.rows`), filtered.

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Header toggle (button) | Always | disclosure glyph + `Graveyard` + counts | title `text-ink` (CSS uppercase) | `Graveyard.tsx:56-123` | Whole header is one button; `aria-expanded` set. Click opens/closes |
| Disclosure glyph | Always | `▸` U+25B8 closed, `▾` U+25BE open | `text-ink-3` | `:62-64` | aria-hidden |
| Count: dead | Header, when wired | `{n} dead` | `text-ink-3`, `num` | `graveyardSummary().dead` (`graveyard.ts:180`): names on the board when they died that are DEAD now | Always printed when wired, including `0 dead` |
| Count: revived | Header, when > 0 | ` · {n} revived` | `text-ink-3` | `graveyard.ts:181-183`: died at least once and ACTIVE now | |
| Count: churn | Header, when > 0 | ` · {n} died 2+` | `text-warn` | `Graveyard.tsx:84-86`; `DEATH_CHURN_THRESHOLD = 2` (`graveyard.ts:24`) | |
| Count: running | Header, when > 0 | ` · {n} running` | `text-neg` | `graveyard.ts:187-190`: revived and up 25% or more since the price at its latest death (`RAN_THRESHOLD_PCT = 25`, `:36`) | The loudest count |
| Count: never active | Header, when > 0 | ` · {n} never active` | `text-ink-3` | `graveyard.ts:198-200`: dead or died before, but not on the board when it died | These names are counted, not listed |
| Not recording | Header, when not wired | `not recording yet` | `text-ink-3` | `Graveyard.tsx:121`; wired = at least one row carries `demand.activity` (`graveyard.ts:171-173,193`) | |
| Floor caveat | Open and wired | `Counts are a floor. A name that goes quiet and returns inside one minute leaves no gap to detect, so revivals are undercounted rather than over.` | `text-ink-3` | `Graveyard.tsx:139-142` | |
| Empty (wired) | Open, wired, no rows | `No name has gone quiet long enough to leave the board this session.` | `text-ink-2` on `panel`, dashed `line-2` border | `:149-151` | |
| Empty (not wired) | Open, not wired | `Activity is not being recorded yet, so nothing can be listed here. This is not an empty graveyard. The measurement is not reaching this surface.` | same | `:152` | |
| Table caption | Open with rows (screen readers only) | `Names dropped from the active board, most recently dead first. Rows that have revived stay listed and are marked.` | sr-only | `:176-179` | |
| Column headers | Open with rows | `Ticker`, `Dead for`, `Rank held`, `Peak trades`, `State` (CSS uppercase) | `text-ink-3` | `:182-194`, `Th` `:289-308` | `Rank held` column is removed entirely when the board was re-ranked inside the viewer's price range (`ranksOmitted`, from `discovery.ordinalsOmitted`, `DashboardShell.tsx:699`) |
| Row (clickable) | One per entry | | row `bg-panel/40`, hover `bg-panel-2` | `Graveyard.tsx:211-287` | Click, Enter or Space opens the ticker drawer; arrow Up/Down, Home, End move between rows (`components/tableKeyboard.ts:18-46`) |
| Row aria-label | Each row | `{TICKER}, dead {deadFor}, held rank {n or unknown}. Open dossier.`; without the rank clause when ranks are omitted | | `Graveyard.tsx:220-225` | |
| Ticker cell | Each row | ticker | `text-ink` semibold, `num` | `:230-232` | |
| Dead for | Each row | `{m}m` under an hour, `{h}h {m}m` otherwise, e.g. `6m`, `1h 12m`; U+2014 when no or bad time | `text-ink-2`, `num` | `deadFor()` `graveyard.ts:140-150`, measured from `deadSince` to now | First reading is about `6m`, never `0m` (comment `Graveyard.tsx:234-240`) |
| Rank held | Each row, unless ranks omitted | the rank it held when it died, e.g. `4`; U+2014 if none | `text-ink-2` | `entry.deadAtRank` (`:250-254`) | |
| Peak trades | Each row | `{count}/min`, compact (`1.2K/min`, `340/min`); U+2014 if none | `text-ink-2` | `formatCount(deadAtPeakTrades)` (`:256-258`, `lib/format.ts:103-109,142-145`) | |
| State: revived | Died and ACTIVE now | `revived` (CSS uppercase) | `text-accent` | `:262-266` | |
| State: running | Revived and up 25%+ since latest death | `running +{n}%`, whole percent, e.g. `running +31%` | `text-neg` | `:267-274`; `moveSinceDeath` `graveyard.ts:158-162` | hover: `Running again since the drop, measured from the price captured at its latest death. The drop looks like a miss rather than churn.` |
| State: died N times | deathCount >= 2 | `died {n}×` (U+00D7 multiplication sign) | `text-warn` | `:275-282` | hover: `Deaths this session, kept across revivals. A name dying repeatedly is direct evidence the drop threshold is too tight.` |

Which rows are listed (`graveyard.ts:217-244`): rows with a recorded activity, that were on the board when they died (`diedWhileRanked`, else a stored death rank, `:69-74`), and are DEAD now or have died before. Order: most recently dead first, then rank held, then ticker (`:246-256`). A revived name stays listed for the session. The drop rule itself (five consecutive dead minutes) is stated only in comments (`Graveyard.tsx:31`, `graveyard.ts:5`); the user never sees it.

Glyphs: U+25B8, U+25BE (toggle), U+00B7 (count separator), U+00D7 (`died 2×`), U+2014 (empty cell).

---

### E3. Normalization notices footer (`components/DashboardShell.tsx:702-715`)

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Footer | `data.meta.warnings.length > 0` | collapsible `<details>`, closed by default | `bg-panel`, top rule `line` | `DashboardShell.tsx:702-715` | |
| Summary | as above | `Normalization notices ({n})` (CSS uppercase, 10 px) | `text-ink-3` | `:705-707` | Click opens the list (native details) |
| Notice list | when opened | each warning string verbatim, one per line | `text-ink-3`, 11 px | `:708-712` | |

In this build no provider ever fills `warnings`: both payload builders set `warnings: []` (`lib/data/index.ts:87`, `lib/data/providers/none.ts:35`; `none` is the only provider in `lib/data/providers/`). So this footer cannot appear in this build.

---

### E4. Session reports: kinds, schedule, states

Payload: `GET {apiBase}/reports`, polled every 60 s (`lib/hooks/useSessionReports.ts:13,35,54`). A 404 makes the whole report surface absent (no line, no window); other failures keep the last good payload (`:39-50`). Slot states are recomputed from the clock every render, not from the poll (`:8-12`).

Report kinds and titles (`lib/dashboard/sessionReports.ts:67-74`), with the slot due time (`lib/desk/reports/api.ts:58-74`), source checkpoint (`lib/desk/reports/pipeline.ts:65-71`), and serve-by time after which it is marked late (`pipeline.ts:93-108`). All ET.

| Kind | Title shown | Watch sentence target | Slot due | Built from checkpoint | Late after |
|---|---|---|---|---|---|
| INTO_RTH | `Into-the-open briefing` | `into the open` | 09:25 | 09:25 open spike assessment | 09:30 |
| INTO_POWER_HOUR | `Power-hour briefing` | `into the last hour` | 14:30 | 14:30 RTH reassessment | 15:00 |
| AFTER_HOURS | `After-hours briefing` | `into after-hours` | 16:00 | RTH close | 20:00 |
| EVENING | `Evening briefing` | `into the next premarket` | 20:05 (written from 20:20, `pipeline.ts:82-84`) | 20:05 after-hours close | 20:30 |
| PREMARKET | `Premarket briefing` | `into the premarket` | no slot of its own | 22:00 recap | 04:00 next day |

The 22:00 PREMARKET report is shown as the EVENING report's "10 pm edition": the API re-files it under the same date's EVENING slot with its kind changed to EVENING (`api.ts:102-114`). So the title `Premarket briefing` and the target `into the premarket` are not reachable through the API in this build (see Unclear). The slots listed are last night's AFTER_HOURS and EVENING plus today's INTO_RTH, INTO_POWER_HOUR, AFTER_HOURS and EVENING, per configured range (`api.ts:58-74`). Ranges come from config; default is one range, `$1–$20` (en dash U+2013) (`lib/desk/reports/ranges.ts:14`).

Slot states (`sessionReports.ts:718-768`):
- DUE: its due time has not come.
- CHECKING: due, no report yet, within 30 minutes of due (`REPORT_GRACE_MS`, `api.ts:27`).
- PUBLISHED: due, a report exists, and no later slot is due yet.
- MISSED: past due + 30 minutes with no report.
- OVER: a later slot has become due (a past report, shown under Earlier today).
- "late" is not a state: a PUBLISHED report carrying `late: true`.
The "current" report is the latest slot that is due, or the first slot if none is due yet.

Missed reasons, printed after a missed slot (`missedCauseText`, `sessionReports.ts:777-792`); `{time}` is the checkpoint's scheduled time as `h:mm am/pm ET`, falling back to the schedule label:
- `No {time} assessment ran.`
- `The {time} assessment did not finish.`
- `The report could not be written.`
- `The report could not be checked, so it is not shown.`
- `Every line failed its check, so nothing is shown.`
- `No report was attempted.`
A missed slot with no recorded cause prints no reason.

Line text per state (`briefingLineText`, `sessionReports.ts:1012-1030`), used on the briefing line and in the window's Earlier today list:
- DUE: `{Title} · due {h:mm am/pm} ET`, or `{Title} · not yet due`
- CHECKING: `{Title} · being checked`
- MISSED, or OVER with no report: `No {title in lower case} for this session` (e.g. `No power-hour briefing for this session`)
- PUBLISHED or OVER with a report: `{Title} · {h:mm am/pm} ET` (publish time), or the bare title

Time formats in reports (`etStamp` `sessionReports.ts:479-486`, `etClockText` `:971-975`): 12-hour, lower-case am/pm, ET, e.g. `8:31 pm ET`; prefixed `Oct 7, ` when the time is on a different ET day from the reader's clock. Relative age (`agoText` `:998-1007`): `just now`, `{n}m ago`, `{n}h ago`, `{n}d ago`. Session date (`sessionText` `:990-995`): `Mon, Sep 28`.

---

### E5. Report window (`ReportWindow`, `components/SessionReports.tsx:352-499`)

Opens when: the viewer clicks `Read` or `Earlier today` on the briefing line (other section), or automatically once per page load when the current report is published and not yet opened in this browser, except on weekdays 07:00 to 09:59 ET, where only the mark shows (`lib/dashboard/reportNotice.ts:111-130`; `DashboardShell.tsx:418-427`). Requires a chosen report range (`DashboardShell.tsx:489,718`). Opening marks the current report read in this browser (`DashboardShell.tsx:401-411`; stored under `mointel.reportsRead`, last 20 kept, `:58-59,403`).

Layout: fixed overlay, dimmed board behind (`bg-black/60`), panel from the right, up to 960 px wide, prose held to 760 px (`SessionReports.tsx:393-405,451`). Dialog, aria-label `Session briefing`. A ticker opened from the report stacks above it and closes back to it.

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Header label | Always | `Briefing` (CSS uppercase) | `text-ink-3` | `:408-410` | |
| Range choice | More than one range configured | one radio button per range label, e.g. `$1–$20`, `$20–$50` | selected `border-accent/50 bg-accent/15 text-accent`; others `bg-panel-2 text-ink-2` | `:411-430` | radiogroup aria-label `Briefing range`. Choice stored in `mointel.reportRange` (`DashboardShell.tsx:397-400`). Hidden with the default single range |
| Print | Always | `Print` | `text-ink-3`, hover `text-ink` | `:431-437`, `window.print()` | Prints only the report: the rest of the page is hidden in print (`app/globals.css:256-266`), white paper, black text, header and Earlier today hidden (`print:` classes) |
| Close | Always | `×` U+00D7 | `text-ink-3`, hover `text-ink` | `:438-445` | aria-label `Close briefing`. Also closes on Escape and on a click on the dimmed backdrop (`:394-399`; `lib/hooks/useModalFocus.ts:44-48`). Escape is ignored while a ticker window is open on top |
| Shown report | Always | the report body (E6) | | `:452-462` | Which report: the one picked under Earlier today, else the first slot with a report (current first, then newest earlier), else the current slot (`:385-388`) |
| No-report heading | Shown slot has no report | the line text for that slot (E4), or `No briefings for this range yet` | `text-ink-2` | `:463-467` | |
| Earlier today heading | At least one OVER slot | `Earlier today` (CSS uppercase) | `text-ink-3` | `:469-473` | nav aria-label `Earlier today` |
| Earlier today entries | same | each slot's line text (E4), plus ` · {missed reason}` when there is one | entry `text-ink-2`, reason `text-ink-3` | `:474-491` | Lists the current slot and every OVER slot except the one shown. Click shows that report in the window. Includes last night's after-hours and evening slots |

Focus: the report heading takes focus on open; Tab is kept inside the window; focus returns to what opened it on close (`useModalFocus.ts:33-76`).

---

### E6. Report body (`ReportBody`, `SessionReports.tsx:505-663`)

The same body renders in the window and in the inline briefing (other section).

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Title | Always | report title (E4), e.g. `Evening briefing` | `text-ink`, bold 18 px | `reportTitle(report.kind)` `:547` | Focus target |
| Session | Session date parses | ` · for Mon, Sep 28` | `text-ink-2` | `sessionText(targetTradingDate ?? tradingDate)` `:524,548` | |
| Session over | Slot is OVER | `session over` (CSS uppercase, 10 px) | `text-ink-3` | `:549-553` | |
| built on | Always | `built on ` then one link per checkpoint, joined by ` + ` | label `text-ink-3`; link `text-ink-2` underlined | `:558-575`; `checkpointText` `sessionReports.ts:955-964` | Link text: completed time then lower-cased schedule label with its clock removed, e.g. `9:26 am ET open spike assessment`, `10:02 pm ET recap`, `8:06 pm ET after-hours close`. hover: `Open the frozen board this checkpoint recorded`. Click closes the window and shows that checkpoint's frozen board in place of the live board (`DashboardShell.tsx:731-734`) |
| written | Always | `written {h:mm am/pm ET}` plus ` ({n}m ago)`; `time unknown` if unparseable | `text-ink-3` | `:576-588` | |
| Late | `report.late` | `late` (CSS uppercase) | `text-warn` | `Late` `:319-328` | hover: `Published after its scheduled time. It describes the checkpoint it was built from, not the moment it appeared.` |
| covers | Always | `covers $1–$20` plus ` · {coverage}` | `text-ink-3` | `rangeLabel(report.range)` `:53-56,592`; `coverageText` `sessionReports.ts:939-946` | Coverage forms: `{a} of {b} names had live trade data`, with `; not recorded for {n} more` when some are unknown; omitted when the report names no ticker or none had a recorded feed. Range is the one frozen into the report, not today's config |
| Edition line | 10 pm edition (has `revisionOf`) or the slot has older editions | one sentence, below | `text-ink-2`, 12 px | `revisionLine` `sessionReports.ts:555-598`, else `replacesLine` `:626-634` | see the edition strings below |
| Summary label | v6 report (has `narrative` key) | `Summary` (CSS uppercase) | `text-ink-3` | `OPENING_WORDS.label` `sessionReports.ts:164-167`; `ReportOpeningBlock` `SessionReports.tsx:777-801` | |
| Summary text | v6 with a narrative | the narrative prose | `text-ink`, 16 px | `reportOpening` `sessionReports.ts:183-192` | |
| No summary | v6 with no narrative | `No summary in this report.` | `text-ink-3`, 13 px | `OPENING_WORDS.none` | Same words whether it was struck or never written |
| Recap footnotes | v6 recap reports carrying footnotes | up to three lines, below | `text-ink-3`, 12 px | `narrativeFootnoteLines` `sessionReports.ts:201-225` | Under the summary or its absence |
| Watch sentence (lead) | v5/v6 reports | `We're watching {n} name(s) {target}.` or `Nothing on watch {target}.` | `text-ink`, 15 px | `reportLead`/`watchLine` `sessionReports.ts:102-125` | v4 reports print their stored headline instead (or nothing if struck) |
| v5 overall line | v5 report with an `overall` line | the stored line | `text-ink`, 15 px | `:614-616` | |
| Section labels | v6 reports | `{LABEL} · {count}` (CSS uppercase), count = names in it | `text-ink-3` | `reportGroups`/`sectionLabel` `sessionReports.ts:148-152,644-655`; labels `lib/desk/reports/sections.ts:24-31` | Labels in order: `RECENT NEWS FOUND`, `SOURCES CONFLICT`, `OLDER OR SECONDARY NEWS`, `NO CATALYST FOUND IN OUR SOURCES`, `RESEARCH COULD NOT TELL`, `NOT RESEARCHED AT THIS CHECKPOINT`. Sentences about no name go in a final group with no label. v5 reports show one unlabelled list |
| Name cards | Each named ticker | see E7 | | `:631-641` | |
| Loose sentence | Line with no ticker | writer's sentence, figures set apart | `text-ink-2`, 15 px; figures `text-ink` medium | `Prose`/`Figures` `:804-827`; `figureSegments` `sessionReports.ts:687-706` | Figures = numbers with $, %, x, thousands commas, decimals, or million/billion/thousand/M/B/K |
| Empty report | No blocks and the watch count is not 0 | `No line in this report.` | `text-ink-3` | `emptyReportLine` `sessionReports.ts:664-673` | |
| Float footer | v6 with at least one name | `This report states no float, and the desk cannot independently verify a float for any name in it.` | `text-ink-3`, 12 px | `FLOAT_FOOTER` `sessionReports.ts:145` | |

Recap footnote strings (`sessionReports.ts:206-224`), first line by count of names with volume but no regular-session close:
- unknown: `How many names had volume but no recorded regular-session close is unknown.`
- 0: `No names had volume but no recorded regular-session close.`
- 1: `1 name had volume but no recorded regular-session close, so it is not in the move counts.`
- n: `{n} names had volume but no recorded regular-session close, so they are not in the move counts.`
Second line, rows the split check left out:
- unknown: `How many rows were left out of the move counts and the named leaders by the split check is unknown.`
- 0: `No rows were left out of the move counts and the named leaders by the split check.`
- 1: `1 row was left out of the move counts and the named leaders because the data suggested a stock split. The check can also leave out a real move of the same size.`
- n: `{n} rows were left out of the move counts and the named leaders because the data suggested a stock split. The check can also leave out a real move of the same size.`
Third line, only when the recap stored `basis: 'prior_or_close'`: `Counted names are those that started or ended the day inside this report's price range.`

Edition strings (10 pm edition, `revisionLine` `sessionReports.ts:567-597`). `{now}` is `at 10:02 pm` (or `Oct 7, 10:02 pm` on another day); `{was}` is the 8:30 edition's time, e.g. `8:31 pm`:
- `Revised {now} ET: {1 name has | n names have} a line written for this edition and the others carry their {was} line.` (the `and the others carry...` clause dropped when every name changed), optionally followed by ` The summary was written for this edition.`
- with no summary in this edition: the sentence above followed by ` This edition has no summary, and the {was} edition had one.` or ` This edition has no summary.`
- `Published again {now} ET; every line is carried from the {was} edition. Neither edition has a summary.`
- `Revised {now} ET: this edition has no summary, and the {was} edition had one. Every line is carried from the {was} edition.`
- `Published again {now} ET; every line is carried from the {was} edition. This edition has no summary.`
- `Published again {now} ET; every line and the summary are carried from the {was} edition.`
- `Revised {now} ET: the summary was written for this edition; every line is carried from the {was} edition.`
Other editions (`replacesLine`, `:626-634`): `Replaces the edition published at {time} ET.` / `Replaces the editions published at {t1} ET, {t2} ET.` (`at` dropped when the first time carries a date).

---

### E7. Name card (`NameCard`, `SessionReports.tsx:671-768`)

| Item | Shown when | Exact text / glyph | Colour | Computed from (file:line) | Notes |
|---|---|---|---|---|---|
| Card | Each named ticker | | `bg-panel-2`, border `line`; print white | `:693` | One card per name; its later lines join the first card (`reportBlocks` `sessionReports.ts:415-442`) |
| Ticker (button) | Always | ticker, mono 17 px bold | `text-ink`, hover `text-accent` | `:695-701` | Click opens the ticker drawer above the window |
| Company line | Known | `{name}. {country}. {business}.` with missing parts dropped | `text-ink-2`, 13 px | `companyText` `sessionReports.ts:251-258` | Citation tokens removed |
| Qualifier: minute data | Name had no live trade feed | `minute data` (CSS lowercase, 10 px) | `text-ink-3` | `:703-707` | hover: `This name had no live trade feed, so the report used minute bars for it. A quiet sentence about it may mean we did not see its trades, not that there were none.` |
| Qualifier: feed not recorded | Feed unknown for this name, and some other name's feed was recorded | `feed not recorded` | `text-ink-3` | `:708-712`; `feedUnknownShown` `sessionReports.ts:922-924` | hover: `This report could not record whether this name had a live trade feed. It does not mean the name had none.` |
| Qualifier: not in your range | Known live price outside the viewer's board range, and the board range differs from the report's | `not in your range` | `text-ink-3` | `:713-717`; `outsideBoardRange` `sessionReports.ts:856-866` | In this build `board` is always null (`DashboardShell.tsx:375`), so this never shows |
| Qualifier: line written for this edition | 10 pm edition, this name re-written | `Line written for this edition` (CSS lowercase) | `text-ink-3` | `cardRevisionMark` `sessionReports.ts:605-619` | hover: `This line was written for the {time} ET edition, not carried from the {time} one.` |
| Research written again | Evening card whose line used newer research | `Research written again at {h:mm am/pm} ET, after this checkpoint.` or `Research written again {Oct 7}, {h:mm am/pm} ET, after this checkpoint.` | `text-ink-3`, 12 px | `researchWrittenAgainNote` `sessionReports.ts:466-472` | |
| Tag row: Catalyst grade | v6, the name has a grade | `Catalyst` (CSS uppercase) then the grade letter | label `text-ink-3`; grade in the board's Why tone: `pos`/`warn`/`neg`/`ink-3` | `TagRow` `:837-852`; `WHY_TONE` `components/DecisionCells.tsx:389-394`; `cardShowsGrade` `sessionReports.ts:235-238` | Grade hover is the board's Why hover. Hidden when the grade is the empty-cell glyph U+2014 |
| Tag row: warn marks | as the board's Why cell | `not the move`, `no catalyst found in our sources`, `old` (CSS uppercase, 9 px) | `text-warn` | `WhyMarks full` `DecisionCells.tsx:410-440` | hovers: `The desk searched its sources and found no catalyst for this move.`; `A catalyst exists but it is older than yesterday, and the desk does not think it explains today's move.` On the card the long form is used; the board uses `no catalyst found` |
| Tag row: Risk chip | v6 | risk label (CSS uppercase) and optional value, left border | `RISK_TONE`: `neg`, `warn`, `pos`, or `line-2`/`ink-3` (`DecisionCells.tsx:512-517`) | `:853-859` | hover: the risk detail line. Risk labels and values come from the board's `resolveRisk` (board section). No float number ever (`lib/desk/reports/tags.ts:14-15`) |
| Price path | Path stored and valid | three points, each price over a label, separated by `→` U+2192 | first two `text-ink`; third point semibold in `text-pos` (up), `text-neg` (down), `text-ink` (flat) | `pathView` `sessionReports.ts:323-368`; render `:727-755` | Labels: intraday `prior close`, `high`, `at {h:mm am/pm} ET` (or `at the checkpoint`); evening/recap `prior close`, `AH high`, `AH close`. Prices `$` plus 2 decimals, 4 under $1, 0 at $1000+ (`lib/format.ts:117-122`). Arrows aria-hidden. Labels CSS uppercase |
| Path change | with path | `+85.5% vs prior close`, `−12.3% vs prior close` (U+2212 minus), or `flat vs prior close` | same tone as third point | `sessionReports.ts:362-365` | One decimal |
| From high | with path | `18.9% under the high` / `under the AH high`, or `at the high` / `at the AH high` | `text-ink-2` | `sessionReports.ts:366` | |
| Sentences | Name has text | the writer's checked sentences, figures set apart | `text-ink-2`; figures `text-ink` | `:757-765` | Divider above when a path or company line exists. Prose is frozen; no live price is merged in |

---

### E8. New-report notice, tab title, read state (shared with the briefing line)

From `lib/dashboard/reportNotice.ts`; rendered on the briefing line (other section) but defined here because it governs the window:
- Mark label `New` or `Revised` (`:72,79`); hover `Published {time} ET. Not opened in this browser.` / `Revised edition published {time} ET. Not opened in this browser.` (or without the time).
- Screen-reader announcement (`DashboardShell.tsx:607-609`): `New report: {Title}, published {time} ET.` / `Revised report: {Title}, published {time} ET.`
- Dismiss button `Dismiss`, hover `Marks this report as read in this browser. You can still open it from this line.` (`:85-88`).
- Browser tab title gets the prefix `(1) ` while a report is marked (`:91-96`; `DashboardShell.tsx:429-431`).
- A 10 pm edition that changed nothing counts as read if its 8:30 edition was read (`:38-44`).

---

### Glyph summary for section E

| Glyph | Code point | Where | Meaning |
|---|---|---|---|
| [U+2014] | U+2014 | event time, Graveyard Dead for / Rank held / Peak trades | empty-cell glyph: value unknown (his named exception) |
| ▸ ▾ | U+25B8, U+25BE | Graveyard header | collapsed / expanded |
| · | U+00B7 | Graveyard counts, line texts, `for {date}`, `covers`, section labels, missed reasons | separator |
| × | U+00D7 | report window close; `died 2×` | close; "times" |
| → | U+2192 | name card price path | then (prior close then high then last) |
| – | U+2013 | range labels `$1–$20` | range |
| − | U+2212 | path change `−12.3%` | minus |
| + | ASCII | `built on` between checkpoints | and |

Item count: 100 table rows (79 user-visible items, 8 event types, 5 report kinds, 8 glyphs) plus 36 enumerated strings (missed reasons, line states, footnotes, edition sentences, notice words).

### Unclear from the code

1. `Premarket briefing` and `into the premarket` (`sessionReports.ts:68,82`): the API re-files every PREMARKET row as EVENING (`api.ts:111-114`) and makes no PREMARKET slot, so these strings appear unreachable in this build. Whether any path still shows them cannot be told from the client code; the `InlineBriefing` comment (`SessionReports.tsx:158`) still calls it "the premarket briefing built from the 22:00 recap".
2. Clicking a Desk Events line for a checkpoint event sends the symbol `DESK` to the ticker drawer (`DeskEventFeed.tsx:118`, `worker/desk-assessments.ts:746`). There is probably no `DESK` row, so the drawer likely opens nothing, but the selected ticker is still set (which also marks the report window as covered, `DashboardShell.tsx:735`). What the user sees on that click is not established from the code read.
3. The `SOURCE CHANGE` message prints a raw authority code (`COMPANY_IR`, `MARKET_DATA`, etc., `collector.ts:1151-1155`). Whether that is intended user copy is not stated.
4. Desk Events count (`:74`) counts the current view only; with Relevant selected and background hidden, it is not the session's total. Whether the user is meant to read it as a total is not stated.
5. `Earlier today` (window, `SessionReports.tsx:470-472`) lists last night's after-hours and evening slots too (`api.ts:64-67`), which are not "today" on the calendar.
6. `checkpointText` lower-cases the schedule label (`sessionReports.ts:959-961`), so `RTH reassessment` and `RTH close` print as `rth reassessment` and `rth close` in the `built on` link. Whether that is intended is not stated.
7. `minute data` and `feed not recorded` are styled `lowercase`, so the 10 pm qualifier `Line written for this edition` also renders in lower case (`SessionReports.tsx:866`). Intent not stated.
8. `not in your range` can never show in this build because `board` is hard-coded null (`DashboardShell.tsx:372-375`, "CUT-ONLY"). Same for the STRADDLE briefing-line state (`chooseReportRange` returns STRADDLE only with a board range).
9. The range radio group appears only with more than one configured range; production `REPORT_RANGES` is environment config not in the tree, so whether users ever see it is unknown.
10. Normalization notices: no code path in this build fills `meta.warnings`, so the footer is unreachable; what a notice would say is unknown.
11. The Graveyard's `0 dead` with no other counts versus `not recording yet` depends on whether the store round-trips `activity`; whether production rows carry it at 366eeebd is not visible from the code.
12. The Graveyard "running" test needs a live price (`telemetry.price`); a name with no live price can never show `running` and is still counted as revived. Whether users should read "revived" as "not running" is not stated.
13. Risk chip labels, values and Why grade letters in the report tag row come from `lib/dashboard/why.ts` and `risk.ts` (board vocabulary), not opened here; see the board section.
14. Report prose (sentences, narrative, v4 headline, v5 overall) is model text that passed the checker; its wording is not in the client code. Whether it can contain U+2014 depends on `lib/desk/reports/dashes.ts`, not opened.
