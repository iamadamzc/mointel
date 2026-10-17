---
title: Privacy policy
status: adopted
adopted: 2026-09-11
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

This policy covers tmitrader.com and the desk behind it. It does not cover
what Google does with your Google account, which is governed by Google's own
privacy policy.

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

**When you use the desk.** We record which account you are and what you did
(signing in, signing out, and the requests your browser makes) so that the
service works and so that we can tell a fault from an attack.

**In server logs.** Like every website, our servers write an access log. It
contains your IP address, the address of the page requested, your browser's
user-agent string, and the time.

**Cookies.** Two, and neither of them follows you anywhere else.

- `mointel_session`: set when you sign in, and how the desk recognises you on
  your next request. **It ends at 20:00 New York time, the close of after-hours
  trading, rather than lasting a fixed number of days.** Sign in at 04:00 and it
  covers the whole session; sign in at 19:00 and it covers an hour. A sign-in
  after 20:00 runs until 20:00 the following day, because a session that has
  already expired is not a session. It follows the calendar day rather than the
  trading day, so a Saturday sign-in ends at 20:00 that Saturday.
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
- We do not ask for your date of birth, your address, your phone number, or
  any government identifier.
- We do not knowingly collect anything from anyone under 18. The desk is not
  built for, or offered to, people under 18.

## 4. Why we hold it

- **To let you in.** Your Google identifier and email are how we recognise
  your account across sessions and devices.
- **To run the service.** Logs and request records are how we find faults,
  restore service, and detect abuse of an account or of the server.
- **To reach you about the service.** We may email you about access, outages,
  material changes to this policy, or the end of the service. We do not send
  marketing email.

## 5. Who else sees it

Nobody buys this data, because we do not sell it, rent it or trade it. It is
handled by us and by the companies that run the machinery underneath:

| Who | What they handle | Why |
| --- | --- | --- |
| Google LLC | Your sign-in | It is the identity provider you chose when you clicked the button |
| Amazon Web Services, Inc. | The server and its logs | It is where the service runs, in us-east-1 |
| Google LLC | Email we exchange with you | Our mailbox runs on Google Workspace |

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

Backups are the honest exception. A full-server snapshot is kept for 7 days,
so deleted data can survive that long in one. Server-log entries live 14 days,
and a snapshot taken on a log's last day carries it up to 7 days further
(about three weeks at the outside). We do not restore a backup to bring deleted
data back.

## 7. Your rights

Whoever and wherever you are, you can:

- **See what we hold.** Ask, and we will send you your account record.
- **Correct it.** Your name and email come from Google; change them there and
  they change here at your next sign-in.
- **Delete it.** Ask, and we close the account and delete the record. This
  cannot be undone, and it ends your access.
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
a US company, for people trading the US market. It runs on servers in us-east-1
and your data is stored there.

**We do not offer it to the public anywhere.** Access is by invitation, which is
how the scope above stays a fact rather than a sentence: we choose who is
invited.

If you are outside the United States and your own country's law gives you rights
over your data, write to us and we will honour them. We would rather do that
than argue about which law applies.

## 9. Security, stated without boasting

Traffic to this site is encrypted in transit. Access to the server is limited
to the people who run it. We do not store passwords, because there are none to
store: sign-in is handled entirely by Google.

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
