---
title: Privacy policy
status: adopted
adopted: 2026-09-11
drafted: 2026-09-10
last_changed: 2026-09-11
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
  BANNER RETURNS until he adopts again. A draft that renders as adopted is the
  failure this field exists to prevent.

  Every [BRACKET] below is a fact this seat does not hold. They are listed,
  with who can answer each, in docs/web/README.md.
-->

# Privacy policy

TMI Trader is an information service for people who trade US small-cap
equities. This policy says what we learn about you, why we hold it, who else
sees it, and how to make us delete it. It is written to be read, not to be
survived.

## 1. Who runs this service

TMI Trader is operated by **Andromeda Genius, Inc**, of 5460 Babcock Rd,
Suite 120 PMB 95234, San Antonio, TX 78240, United States. You can reach a
person at info@andromedagenius.com. In this policy, "we" means that operator;
"you" means the person signing in; and "the desk" means the signed-in service
at tmitrader.com.

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

**When you use the desk.** We record which account you are and what you did —
signing in, signing out, and the requests your browser makes — so that the
service works and so that we can tell a fault from an attack.

**In server logs.** Like every website, our servers write an access log. It
contains your IP address, the address of the page requested, your browser's
user-agent string, and the time. [CONFIRM WHETHER ANY OTHER FIELD IS LOGGED.]

**Cookies.** Two, and neither of them follows you anywhere else.

- `mointel_session` — set when you sign in, and how the desk recognises you on
  your next request. **It ends at 20:00 New York time, the close of after-hours
  trading, rather than lasting a fixed number of days.** Sign in at 04:00 and it
  covers the whole session; sign in at 19:00 and it covers an hour. A sign-in
  after 20:00 runs until 20:00 the following day, because a session that has
  already expired is not a session. It follows the calendar day rather than the
  trading day, so a Saturday sign-in ends at 20:00 that Saturday.
- `[FLOW COOKIE NAME]` — set when sign-in *starts*, before you have approved
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
  positions, your orders or your balance, and the desk cannot place a trade —
  it has no code that could.
- We do not ask for permission to post, send or publish anything as you.
- We do not run advertising trackers, analytics scripts or third-party tag
  managers on this site. The pages load nothing from anyone else's servers —
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
  marketing email. [CONFIRM: is there any mailing list at all?]

## 5. Who else sees it

Nobody buys this data, because we do not sell it, rent it or trade it. It is
handled by us and by the companies that run the machinery underneath:

| Who | What they handle | Why |
| --- | --- | --- |
| Google LLC | Your sign-in | It is the identity provider you chose when you clicked the button |
| [HOSTING PROVIDER] | The server and its logs | It is where the service runs, in [REGION] |
| [EMAIL PROVIDER, IF ANY] | Email we send you | Service messages only |

We will hand over data if we are legally required to — a court order, a
lawful demand from an authority with the power to make one. If that happens
and we are permitted to tell you, we will.

If the service is ever sold or transferred, your data goes with it, and we
will tell you before it does.

## 6. How long we keep it

- **Your account** — for as long as you have one, and for [PERIOD] after you
  ask us to close it, after which it is deleted.
- **Server logs** — [PERIOD], then deleted.
- **Email we exchanged with you** — [PERIOD].

Backups are the honest exception: deleted data can persist in a backup for
up to [PERIOD] before the backup itself expires. We do not restore a backup
to bring deleted data back.

## 7. Your rights

Whoever and wherever you are, you can:

- **See what we hold.** Ask, and we will send you your account record.
- **Correct it.** Your name and email come from Google; change them there and
  they change here at your next sign-in.
- **Delete it.** Ask, and we close the account and delete the record. This
  cannot be undone, and it ends your access.
- **Take it with you.** Ask, and we will send it in a machine-readable file.
- **Object, or ask us to restrict what we do.** Ask, and we will answer.

Write to info@andromedagenius.com. We answer within [PERIOD] and we do not
charge for it.

**We do not sell your personal information, and we do not share it for
cross-context behavioural advertising** — including as California defines
those terms. Nobody is refused access, charged differently, or given a worse
service for exercising any right on this list.

## 8. Where the service is, and who it is for

TMI Trader is operated from the United States, by a US company, for people
trading the US market. It runs on servers in [REGION] and your data is stored
there.

**We do not offer it to the public anywhere.** Access is by invitation, which is
how the scope above stays a fact rather than a sentence: we choose who is
invited.

If you are outside the United States and your own country's law gives you rights
over your data, write to us and we will honour them. We would rather do that
than argue about which law applies.

## 9. Security, stated without boasting

Traffic to this site is encrypted in transit. Access to the server is limited
to the people who run it. We do not store passwords, because there are none to
store — sign-in is handled entirely by Google.

No service is immune. If a breach affects your data we will tell you what
happened, what was exposed and what to do, as quickly as we can establish the
facts, and we will not wait until the story is comfortable.

## 10. Changes to this policy

If we change something that matters, we will change the date at the top of
this page and tell signed-in users by email before it takes effect. Minor
corrections — a typo, a clearer sentence — are made without notice, and the
history of this file is kept.

## 11. Contact

info@andromedagenius.com reaches a person, not a queue.

Andromeda Genius, Inc
5460 Babcock Rd, Suite 120 PMB 95234
San Antonio, TX 78240
United States
