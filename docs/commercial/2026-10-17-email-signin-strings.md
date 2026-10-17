# Sign-in by email link: the privacy and terms changes, and the rules for the SES form

**Commercial-tmi (7th tenure), 2026-10-17 (UTC). A draft. Nothing here is adopted, built or live.** His yes: "sign-in by EMAIL LINK ships with the purchase launch, beside Google, sent through Amazon SES from tmitrader.com" (Integration chat, uuid f9e7ab7b, 2026-10-17T01:40:16.319Z, as Integration relays it; I did not open his turn). Integration asked me for the privacy and terms changes, with AWS named as the sender and what we store and for how long, and to read Ops's SES production-access words before they go to AWS.

**Bracketed items are facts the build decides.** I do not know them and have not guessed: each names who answers. The strings below are final once the brackets are filled and he says yes to the exact words. They go in the same motion as the purchase set (terms of sale `325ad20b`, strings `325ad20b`, Marketing `dd60a775` and `32d1dd33`).

**What I read to write this:** the live privacy policy and terms at `origin/main`, the approved strings file, Marketing's two files, and the live sign-in page and landing copy at `d772ba25` (`app/signin/page.tsx`, `lib/public/landingCopy.ts`). I found no design for the email link in the repo yet.

## NEEDS YOU

Nothing is his to decide here except the exact words, once the brackets are filled. The facts below come from Ops and Web.

## 1. The facts

**Received** (Ops's approved scope, relayed by Integration, 2026-10-17; I did not open the scope):
- A link lasts 15 minutes and works once. Asking for another link supersedes the earlier one.
- For each link the desk keeps a record: the address, the times, whether it was used or superseded, and a hashed IP. These records are deleted 30 days after the link is created.
- The IP is never stored raw in these records: it is a salted hash, used only for the per-IP request limit.
- The address stays on the account (the email identity row) for the account's life, as the Google email does today.
- The mail is sent by Amazon SES from signin@tmitrader.com (MAIL FROM mail.tmitrader.com). Replies go to info@andromedagenius.com. No tracking pixels and no link rewriting.
- SES in us-east-1 is out of the sandbox, so no production-access form goes to Amazon.
- From Marketing's relay of Ops's build facts (`docs/marketing/email-link-signin-words-2026-10-17.md` at `ed752ff9`; I did not open the scope): only the newest link works; limits are 3 per 15 minutes and 10 per 24 hours per address and 10 per hour per IP; the request page gives the same answer for every address ("If that address can sign in, we've sent a link"), so it never reveals whether an address has an account; the link opens a one-button page; one account per verified address (so Google and link sign-in on one address are one account).

**Received since** (Ops's approved scope and Ops's messages, relayed by Integration and by Ops, 2026-10-17; the scope is a design and nothing is built yet, so these are commitments and not measurements):
- The link itself is never stored: only a SHA-256 fingerprint of its random token. The record (fingerprint, address, created, expires, used and voided times, salted IP hash) is deleted 30 days after creation.
- Per send the desk keeps the address, the time sent, the time used or voided, and a salted hash of the requesting IP (never the raw IP; used only for the per-IP limit). No SES delivery or bounce note is stored in v1.
- An address with no account still gets the email (anyone may sign in and then buy); the access gate decides at use. Every request that passes the rate limits writes a record, for any address.
- One cookie only: `mointel_session`, as with Google sign-in. The confirm page posts the token in the form body.
- Amazon's account-level suppression list is on for bounces and complaints, so Amazon will not send again to an address that hard-bounced or complained. The desk does not read or act on bounces in v1.
- The request page, and the "We couldn't send the email" line (shown only when Amazon's call itself fails), do not reveal whether an address has an account; only the rate-limit wait reveals a recent request.

Nothing remains in brackets except the pending reply address (`info@andromedagenius.com`, pending whether `signin@` is a real mailbox), which the strings do not depend on.

## 2. Privacy policy: the changes

Each block gives where it goes, what it replaces, and the new words.

**Section 1, the paragraph that begins "This policy covers tmitrader.com".**
- Now: "It does not cover what Google does with your Google account, which is governed by Google's own privacy policy."
- Replace with: "It does not cover what Google does with your Google account, or what your own email provider does with the emails we send you. Each is governed by its own policy."

**Section 2, after the Google sign-in list ("...we request nothing beyond them."), add a paragraph:**
"**When you sign in by email link.** You type your email address and we send a link to it. Anyone can ask for a link to any address; only whoever can open that mailbox can use it. The link works once, and only for 15 minutes; asking for another link ends the earlier one. We never keep the link itself, only a one-way fingerprint of it. For each request we keep a record: the address typed, that fingerprint, the times it was made, used or replaced, and a scrambled, one-way form of the IP address it came from (we never store the address itself in these records), which we use only to limit how many links can be asked for at once. We keep this record for every address typed, whether or not it has an account, and delete it 30 days after the link was made. Your email address stays on your account for as long as you have one. We ask for no name and no picture. Whatever address you type, the page gives the same answer, so it never tells anyone whether an address has an account. Our emails carry no tracking pixels and no rewritten links."

**Section 2, "Cookies".** No change. Signing in by email link sets only `mointel_session`, the same cookie as a Google sign-in, so the policy's two cookies stay two.

**Section 4 ("Why we hold it"), first bullet.**
- Now: "**To let you in.** Your Google identifier and email are how we recognise your account across sessions and devices."
- Replace with: "**To let you in.** Your Google identifier, or your email address if you sign in by link, is how we recognise your account across sessions and devices."

**Section 4, "To reach you about the service" bullet.**
- Now ends: "We do not send marketing email."
- Replace the end with: "We do not send marketing email. The emails we send are sign-in links and notices about your access or your account."

**Section 5 table, add a row:**
"Amazon Web Services, Inc. (Amazon SES) | Your email address and the sign-in link we send you | It sends the email for us, from signin@tmitrader.com"

**Section 5, under the table, add a sentence:** "If an email to you bounces or is reported as spam, Amazon keeps your address on a list and stops sending to it. We do not read that list or keep a note of it."

**Section 6, add one bullet:**
- "**Sign-in link records**: deleted 30 days after the link was made. They hold the email address typed, a one-way fingerprint of the link, the times, whether the link was used or replaced, and a scrambled form of the IP address."

(Your email address itself stays with your account, which section 6 already covers: "for as long as you have one".)

**Section 7, "Correct it".**
- Now: "Your name and email come from Google; change them there and they change here at your next sign-in."
- Replace with: "If you sign in with Google, your name and email come from Google; change them there and they change here at your next sign-in. If you sign in by email link, your email address is the one you typed; to change it, write to us."

**Section 9, "Security".**
- Now: "We do not store passwords, because there are none to store: sign-in is handled entirely by Google."
- Replace with: "We do not store passwords, because there are none to store: you sign in with Google, or with a link we email you."

## 3. Terms of service: the changes

**Section 2, third bullet.**
- Now: "You sign in with a Google account. You need to be entitled to use that account."
- Replace with: "You sign in with a Google account, or with a link we email you. You need to be entitled to use that account or that email address."

**Section 3, second paragraph (this replaces the wording already approved in the strings file, which said "Google account").**
- Approved version was: "Your access is tied to the Google account you sign in with. It does not transfer to another person, another company, or another desk."
- Replace with: "Your access is tied to the email address you sign in with, whether by Google or by link. It does not transfer to another person, another company, or another desk."

**Section 3, first paragraph, add one sentence at the end:** "A sign-in link works for whoever opens it. Do not forward it."

## 4. Words approved earlier that now say "Google" and need Marketing's redraft

These are approved text. Each needs his yes to the new words, so they come back as strings. I have not rewritten them; Marketing does, and I read.
- Marketing's refusal screen (`purchase-flow-words`, section 6, stranger): "...tied to the Google account you sign in with" becomes "tied to the email address you sign in with".
- Marketing's front-page rows (`purchase-flow-words`, section 7): "Sign in with Google" in the line under the buttons and in the section 12 body becomes "Sign in with Google or an email link".
- Live now (`d772ba25`): `lib/public/landingCopy.ts:267` "Access is by invite, and sign-in is handled by Google." and `:276`; and `app/signin/page.tsx`, which says "Sign in to the desk with Google. One identity provider, no password to set and none for us to store." and carries a block of what Google hands the desk. The sign-in page needs a second way in and its own plain description of the link.
- The front-page FAQ "What do you collect?" (Web's review) needs two more changes than Marketing's one-line row. Besides "if you sign in by email link, your email address", it must say what payment adds: "When you pay, your card number goes to Stripe, not to us; we keep a record of each charge." Marketing's FAQ row (`a163817c`) now carries both, and says "the cookies it needs to sign you in" with no count, which is true because the link flow sets only `mointel_session`.
- The terms of sale (`325ad20b`) say nothing of Google and need no change.
- Marketing's draft of the sign-in page, the "check your email" screen, the email and the errors is `docs/marketing/email-link-signin-words-2026-10-17.md` at `050d1dac`; my read of it is read 152.

## 5. The SES production-access request: what I check when Ops sends the words

These words go to Amazon and describe the business. I read them before they are sent, against these rules.
- **True and the same as the site.** Amazon's reviewers can open tmitrader.com. The request must say nothing the privacy policy and terms contradict. Today the policy says Google only, and the live pages name an Inc. that is not the seller (read 151). The policy changes above should be live, or at least adopted by him, before the request goes, or the form and the site disagree.
- **Transactional only.** Sign-in links requested by a person typing their own address, and notices about access or payment. No marketing, no lists, no newsletter, no purchased or scraped addresses. This matches the privacy policy's "We do not send marketing email".
- **What the business is,** in the words already approved on the site: an information service for people trading the US market, sold by the day or by plan. No "signals", "alerts", "recommendations", "tips", "profit", "edge", "guaranteed", or any claim the site is forbidden to make (`docs/marketing/what-it-is-not.md`). No data-vendor names.
- **Volume.** An honest estimate of daily sends, small. Nothing inflated to look larger.
- **Bounces and complaints.** Describe only what Ops has built or will build before the first send. Do not claim a handler that does not exist.
- **The seller.** Andromeda Genius LLC, not Inc.
- **Nothing signed or promised for him.** The form is submitted from his AWS account; he sends it.

## 6. Order

The privacy and terms changes join the purchase motion: adopted together after his attorney's read, when the billing page exists. The SES request is Ops's, sent by him, and I read its words first. Nothing is built or sent until the words and the facts above are in.
