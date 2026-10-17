---
title: Privacy policy
status: adopted
adopted: 2026-10-17

drafted: 2026-09-10
last_changed: 2026-10-17
---

<!--
  THE ONE SOURCE OF TRUTH FOR THE PRIVACY POLICY.

  /privacy renders THIS FILE at request time. Do not copy any of it into a
  template, a component or a second page: two copies of a policy is two
  policies, and the one that renders is not necessarily the one anyone edited.

  ADOPTED BY THE TRADER 2026-09-11, his word: "1, approved." Recorded by Web on
  his instruction -- the adoption is his act, this line is only its record.
  `adopted:` now carries a date, so the page renders NO draft banner.

  RE-ADOPTED BY THE TRADER 2026-10-17 for the purchase launch, his words, Integration chat bf3b407e, checked at his turn: "yes to all five" (uuid c7584eb1, 2026-10-17T13:00:25.931Z); "1, a. 2, 7 years. 3, adopt now." (uuid 5a0d0d6c, 13:20:44.136Z); "1, yes. 2, yes. 3, yes - bu tit has no audeince" (uuid 167c7bd1, 13:33:27.549Z). Adopted without an attorney's read, by his choice.

  IF THIS TEXT IS MATERIALLY REDRAFTED, `adopted` GOES BACK TO null AND THE
  BANNER RETURNS until he adopts again.

  AND THE RULE IS ABOUT THE TEXT, NOT THE PAGE. A change to how this file is
  RENDERED -- a table gaining a scroll wrapper, type sizes, the dateline's
  layout -- is presentation and does NOT touch `adopted`. Only the words do.

  AND PUNCTUATION THAT PRESERVES THE MEANING IS NOT MATERIAL EITHER. HIS RULING,
  2026-09-30, asked before the change shipped and answered in his words: "not
  material, keep adopted." So `adopted` stayed at 2026-09-11 through the em-dash
  sweep that rewrote 27 marks in this file and the privacy policy.

  THE PRECEDENT IS NARROWER THAN IT LOOKS, AND THE NARROWING IS THE USEFUL PART.
  It covers a mark replaced by one that does the same work: an aside taking
  parentheses, a label taking a colon, an amplifying list taking a comma. It does
  NOT cover punctuation that moves a clause boundary, and two marks in that sweep
  would have done exactly that if replaced carelessly -- "The desk -- its
  interface, its wording, ... -- is ours" becomes a LIST of things that are ours
  if the paired dashes become commas, which changes what the clause grants. Those
  took parentheses precisely so this would stay a punctuation change.

  SO THE TEST FOR A FUTURE EDITOR IS NOT "is it only punctuation". It is "does
  any sentence now say something different, or bind differently". If yes, it is a
  redraft whatever it looks like in a diff, and `adopted` goes to null.

  Flipping `adopted` to null for a presentation change would put a DRAFT BANNER
  BACK ON AN IN-FORCE LEGAL DOCUMENT, which is worse than whatever the change
  was fixing. The banner says "do not rely on this"; a renderer does not make
  that true. A draft that renders as adopted is the
  failure this field exists to prevent.

  AND THE CONVERSE HAS A SEQUENCING COST: when the text IS materially
  redrafted, the banner is public for however long the adoption takes. Draft
  and adoption are one motion, not a commit that waits for a reply.

  Every [BRACKET] below is a fact this seat does not hold, and EVERY ONE OF
  THEM RENDERS TO THE PUBLIC. They are listed, with who can answer each, in
  docs/web/README.md.

  A BRACKET IS A MISSING VALUE. IT IS NEVER A QUESTION TO ANOTHER SEAT.
  Two [CONFIRM: ...] notes were written in this file in the same syntax and
  rendered on the live, adopted policy from 2026-09-16 until 2026-09-18 --
  a note to myself, published, on the document whose whole argument is candour.
  Removed; they were annotations on claims, never claims, so no wording of the
  policy changed and `adopted` is untouched.

  Questions for another seat go in docs/web/README.md, which nobody serves.
-->

# Privacy policy

The Momentum Intelligence Trading Desk (TMI) is an information service for
people who trade US small-cap equities. This policy says what we learn about
you, why we hold it, who else sees it, and how to make us delete it. It is
written to be read, not to be survived.

## 1. Who runs this service

**The Momentum Intelligence Trading Desk** (TMI) is developed and operated by
**Andromeda Genius LLC**, of 5460 Babcock Rd, Suite 120 PMB 95234, San Antonio,
TX 78240, United States. You can reach a person at desk@tmitrader.com. In this policy,
"we" means that operator; "you" means the person signing in; and "the desk"
means the signed-in service at tmitrader.com.

The service was called TMI Trader until 18 September 2026; the name
changed, nothing else did.

This policy covers tmitrader.com and the desk behind it. It does not cover what Google does with your Google account, or what your own email provider does with the emails we send you. Each is governed by its own policy.

## 2. What we collect

**When you sign in.** Signing in with Google gives us four things, and only
because you approve it on Google's own screen:

- Your name, as it appears on your Google account.
- Your email address, and Google's assertion of whether it has been verified.
- A link to your Google profile picture.
- A permanent identifier that Google uses for your account and reuses for no
  one else. This is what actually identifies you to us; your email address is
  not, because email addresses change hands.

We ask Google for the scopes `openid`, `email` and `profile`. Those three are
the smallest set that lets someone sign in at all, and we request nothing
beyond them.

**When you sign in by email link.** You type your email address and we send a link to it. Anyone can ask for a link to any address; only whoever can open that mailbox can use it. The link works once, and only for 15 minutes; asking for another link ends the earlier one. We never keep the link itself, only a one-way fingerprint of it. For each request we keep a record: the address typed, that fingerprint, the times it was made, used or replaced, and a scrambled, one-way form of the IP address it came from (we never store the address itself in these records), which we use only to limit how many links can be asked for at once. We keep this record for every address typed, whether or not it has an account, and delete it 30 days after the link was made. Your email address stays on your account for as long as you have one. We ask for no name and no picture. Whatever address you type, the page gives the same answer, so it never tells anyone whether an address has an account. Our emails carry no tracking pixels and no rewritten links.

**When you use the desk.** We record which account you are and what you did
(signing in, signing out, and the requests your browser makes) so that the
service works and so that we can tell a fault from an attack.

**When you pay.** Stripe, our payment processor, collects your card details and billing postal code on its own page. We never receive your card number. To take payment we create a customer record for you at Stripe, with your email address and our number for your account, and we keep a link to it with your account. Stripe gives us a customer reference, a payment-method reference, and the result of each charge: the date, the amount, the plan, and whether it was paid or declined. We keep those so the desk can show your billing history and run your plan.

**When you start a free trial.** When you press Start free trial, we create a customer record for you at Stripe, with your email address and our number for your account, and we keep a link to it with your account. It exists even if you do not finish or the trial cannot start. You then enter a card on Stripe's page. Stripe checks it, and we ask Stripe to remove it from your account at once; the trial never charges it. We never receive your card number. Stripe gives us a code that identifies the card. We keep that code, Stripe's reference number for the check, and the time the trial started, with your account, so the same card cannot start a second trial. We keep them for as long as we offer the free trial, including after you close your account. Stripe keeps a record of the card, including its brand, last four digits and expiry date, under its own privacy policy.

**If a free trial cannot start.** The card is still removed from your account at once, the trial never charges it, and we do not keep a code for it. We keep a short record of the attempt: Stripe's reference for the check, your account, the reason it could not start, and the time. We delete this record 30 days after the attempt. Your customer record at Stripe and our link to it are not part of this record; section 6 says how long they are kept.

**In server logs.** Like every website, our servers write an access log. It
contains your IP address, the address of the page requested, your browser's
user-agent string, and the time.

**Cookies.** Two, and neither of them follows you anywhere else.

- `mointel_session`: set when you sign in, and how the desk recognises you on
  your next request. **It ends at 20:00 New York time, the close of after-hours
  trading, rather than lasting a fixed number of days.** Sign in at 04:00 and it
  covers the whole session; sign in at 19:00 and it covers an hour. A sign-in after 20:00 can run until 20:00 the next trading day, because a session that has already expired is not a session. It follows the trading day rather than the calendar day, so a sign-in on a Saturday, a Sunday or a market holiday can run until 20:00 on the next trading day: up to 72 hours over a weekend, and longer over a holiday weekend.
- `mointel_oauth`: set when sign-in *starts*, before you have approved
  anything at Google. It holds two single-use random values that let us check
  that the reply coming back from Google belongs to the request you actually
  made. It lasts at most ten minutes, and it is discarded when the sign-in
  finishes, whether that sign-in succeeded or not.

Both are marked `HttpOnly` and `Secure`: no script on the page can read either,
and they are only ever sent over an encrypted connection.

**There are no advertising cookies and no analytics cookies on this site**,
which is why you were not asked to dismiss a banner.

## 3. What we do not collect

- We do not ask Google for access to your Gmail, Drive, Calendar, Contacts,
  photos or any other Google service, and we could not read them if we tried.
- We have no connection to your brokerage. We do not see your account, your
  positions, your orders or your balance, and the desk cannot place a trade:
  it has no code that could.
- We do not ask for permission to post, send or publish anything as you.
- We do not run advertising trackers, analytics scripts or third-party tag
  managers on this site. The pages load nothing from anyone else's servers:
  no fonts, no scripts, no images.
- We do not ask for your date of birth, your phone number, or any government identifier. When you pay, Stripe asks for your card details and billing postal code on its own page.
- We do not knowingly collect anything from anyone under 18. The desk is not
  built for, or offered to, people under 18.

## 4. Why we hold it

- **To let you in.** Your Google identifier, or your email address if you sign in by link, is how we recognise your account across sessions and devices.
- **To run the service.** Logs and request records are how we find faults,
  restore service, and detect abuse of an account or of the server.
- **To reach you about the service.** We may email you about access, outages,
  material changes to this policy, or the end of the service. We do not send marketing email. The emails we send are sign-in links and notices about your access or your account.
- **To take payment.** Stripe's references and the record of each charge are how we charge your card, show you what you paid, and end a plan when you cancel.
- **To stop the free trial being taken twice.** The card code is kept for this and for nothing else.

## 5. Who else sees it

Nobody buys this data, because we do not sell it, rent it or trade it. It is
handled by us and by the companies that run the machinery underneath:

| Who | What they handle | Why |
| --- | --- | --- |
| Google LLC | Your sign-in | It is the identity provider you chose when you clicked the button |
| Amazon Web Services, Inc. | The server and its logs | It is where the service runs, in us-east-1 |
| Google LLC | Email we exchange with you | Our mailbox runs on Google Workspace |
| Stripe, Inc. | Your email address, your card details, billing postal code, the record of each charge, and the check of a card for a free trial | It is the payment processor. The card number never reaches our servers. |
| Amazon Web Services, Inc. (Amazon SES) | Your email address and the sign-in link we send you | It sends the email for us, from signin@tmitrader.com |

If an email to you bounces or is reported as spam, Amazon keeps your address on a list and stops sending to it. We do not read that list or keep a note of it.

We will hand over data if we are legally required to: a court order, a
lawful demand from an authority with the power to make one. If that happens
and we are permitted to tell you, we will.

If the service is ever sold or transferred, your data goes with it, and we
will tell you before it does.

## 6. How long we keep it

- **Your account**: for as long as you have one. After you ask us to close
  it, we have not set a period; ask and we will tell you what we hold.
- **Server logs**: 14 days, then deleted.
- **Email we exchanged with you**: we have not set a period; ask and we will
  tell you what we hold.
- **The record of each charge**: kept for 7 years after the charge.
- **A free trial that could not start**: deleted 30 days after the attempt. It holds Stripe's reference for the check, your account, the reason it could not start, and the time.
- **The card code from a free trial**: kept for as long as we offer the free trial, including after you close your account.
- **Your customer record at Stripe, and our link to it**: for as long as you have an account. If you ask us to delete your account, we delete both. Stripe keeps its record of each charge under its own privacy policy.
- **Sign-in link records**: deleted 30 days after the link was made. They hold the email address typed, a one-way fingerprint of the link, the times, whether the link was used or replaced, and a scrambled form of the IP address.

Backups are the honest exception. A full-server snapshot is kept for 7 days,
so deleted data can survive that long in one. Server-log entries live 14 days,
and a snapshot taken on a log's last day carries it up to 7 days further
(about three weeks at the outside). We do not restore a backup to bring deleted
data back.

## 7. Your rights

Whoever and wherever you are, you can:

- **See what we hold.** Ask, and we will send you your account record.
- **Correct it.** If you sign in with Google, your name and email come from Google; change them there and they change here at your next sign-in. If you sign in by email link, your email address is the one you typed; to change it, write to us.
- **Delete it.** Ask, and we close the account and delete the record. This cannot be undone, and it ends your access. The exceptions are the card code from a free trial, Stripe's reference for the check, and the date, which we keep for the reason in section 2: otherwise the same card could start a second trial. We also keep the record of each charge, for the period in section 6. Stripe keeps its own record of each charge under its own privacy policy.
- **Take it with you.** Ask, and we will send it in a machine-readable file.
- **Object, or ask us to restrict what we do.** Ask, and we will answer.

Write to desk@tmitrader.com. We answer promptly, and within 30 days at
the latest, and we do not charge for it.

**We do not sell your personal information, and we do not share it for
cross-context behavioural advertising**, including as California defines
those terms. Nobody is refused access, charged differently, or given a worse
service for exercising any right on this list.

## 8. Where the service is, and who it is for

The Momentum Intelligence Trading Desk is operated from the United States, by
a US company, for people trading the US market. It runs on servers in us-east-1, and the data we hold about you is stored there.

**It is for sale to the public.** It is made for people trading the US market.

If you are outside the United States and your own country's law gives you rights
over your data, write to us and we will honour them. We would rather do that
than argue about which law applies.

## 9. Security, stated without boasting

Traffic to this site is encrypted in transit. Access to the server is limited
to the people who run it. We do not store passwords, because there are none to
store: you sign in with Google, or with a link we email you.

No service is immune. If a breach affects your data we will tell you what
happened, what was exposed and what to do, as quickly as we can establish the
facts, and we will not wait until the story is comfortable.

## 10. Changes to this policy

If we change something that matters, we will change the date at the top of
this page and tell signed-in users by email before it takes effect. Minor
corrections (a typo, a clearer sentence) are made without notice, and the
history of this file is kept.

## 11. Contact

desk@tmitrader.com reaches a person, not a queue.

Andromeda Genius LLC
5460 Babcock Rd, Suite 120 PMB 95234
San Antonio, TX 78240
United States
