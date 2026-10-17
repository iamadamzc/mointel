# Sign-in by email link: the privacy and terms changes, and the rules for the SES form

**Commercial-tmi (7th tenure), 2026-10-17 (UTC). A draft. Nothing here is adopted, built or live.** His yes: "sign-in by EMAIL LINK ships with the purchase launch, beside Google, sent through Amazon SES from tmitrader.com" (Integration chat, uuid f9e7ab7b, 2026-10-17T01:40:16.319Z, as Integration relays it; I did not open his turn). Integration asked me for the privacy and terms changes, with AWS named as the sender and what we store and for how long, and to read Ops's SES production-access words before they go to AWS.

**Bracketed items are facts the build decides.** I do not know them and have not guessed: each names who answers. The strings below are final once the brackets are filled and he says yes to the exact words. They go in the same motion as the purchase set (terms of sale `325ad20b`, strings `325ad20b`, Marketing `dd60a775` and `32d1dd33`).

**What I read to write this:** the live privacy policy and terms at `origin/main`, the approved strings file, Marketing's two files, and the live sign-in page and landing copy at `d772ba25` (`app/signin/page.tsx`, `lib/public/landingCopy.ts`). I found no design for the email link in the repo yet.

## NEEDS YOU

Nothing is his to decide here except the exact words, once the brackets are filled. The facts below come from Ops and Web.

## 1. Facts I need before the words are final

For Ops (SES) and Web (the sign-in route):
1. **The link's life.** How many minutes it works, and that it works once. (I use `[TOKEN LIFE]`.)
2. **What is stored about a link.** The link itself, or only a fingerprint of it. When it is deleted. (`[TOKEN STORAGE]`)
3. **What is stored about a send.** Address, time sent, time used, anything from SES such as a delivery or bounce note, an IP address. For how long. (`[SEND LOG]`, `[SEND LOG RETENTION]`)
4. **Who gets a link.** Does an address with no access get an email? (If it does, the policy must say so; if it does not, the sign-in page cannot say whether an address exists.) (`[WHO GETS A LINK]`)
5. **One account or two.** A person who signs in with Google and by link on the same address: the same account? The terms say access is tied to an address; the policy today says an email is not an identifier because "email addresses change hands". (`[ONE ACCOUNT]`)
6. **Cookies.** Does the link flow set a cookie other than `mointel_session`? The policy says two cookies today, one of them only for Google. (`[COOKIES]`)
7. **Bounces and complaints.** What the desk does with them, and whether Amazon keeps a list of addresses it will not send to. (`[SUPPRESSION]`)
8. **The sender.** The address mail comes from, and the reply address. (`[SENDER]`)

## 2. Privacy policy: the changes

Each block gives where it goes, what it replaces, and the new words.

**Section 1, the paragraph that begins "This policy covers tmitrader.com".**
- Now: "It does not cover what Google does with your Google account, which is governed by Google's own privacy policy."
- Replace with: "It does not cover what Google does with your Google account, or what your own email provider does with the emails we send you. Each is governed by its own policy."

**Section 2, after the Google sign-in list ("...we request nothing beyond them."), add a paragraph:**
"**When you sign in by email link.** You type your email address and we send a link to it. The link works once, and only for [TOKEN LIFE] minutes. We keep your email address, [TOKEN STORAGE], and the times the link was sent and used. We ask for no name and no picture. [WHO GETS A LINK]"

**Section 2, "Cookies".** [COOKIES: if the link flow sets no new cookie, no change. If it sets one, it is described here in the same plain terms as the other two.]

**Section 4 ("Why we hold it"), first bullet.**
- Now: "**To let you in.** Your Google identifier and email are how we recognise your account across sessions and devices."
- Replace with: "**To let you in.** Your Google identifier, or your email address if you sign in by link, is how we recognise your account across sessions and devices."

**Section 4, "To reach you about the service" bullet.**
- Now ends: "We do not send marketing email."
- Replace the end with: "We do not send marketing email. The emails we send are sign-in links and notices about your access or your account."

**Section 5 table, add a row:**
"Amazon Web Services, Inc. (Amazon SES) | Your email address and the sign-in link we send you | It sends the email for us, from tmitrader.com"

**Section 5, under the table, add a sentence:** "[SUPPRESSION: if Amazon keeps addresses that bounced or were reported as spam, say so here in one sentence.]"

**Section 6, add two bullets:**
- "**Sign-in links**: a link stops working after [TOKEN LIFE] minutes or when it is used, whichever comes first. [TOKEN STORAGE: what remains, and for how long]."
- "**Who we sent an email to, and when**: [SEND LOG RETENTION]."

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
- Replace with: "Your access is tied to the email address you sign in with, whether by Google or by link. It does not transfer to another person, another company, or another desk. [ONE ACCOUNT: if Google and link on the same address are one account, this sentence is true as written. If they are two accounts, this section says so.]"

**Section 3, first paragraph, add one sentence at the end:** "A sign-in link works for whoever opens it. Do not forward it."

## 4. Words approved earlier that now say "Google" and need Marketing's redraft

These are approved text. Each needs his yes to the new words, so they come back as strings. I have not rewritten them; Marketing does, and I read.
- Marketing's refusal screen (`purchase-flow-words`, section 6, stranger): "...tied to the Google account you sign in with" becomes "tied to the email address you sign in with".
- Marketing's front-page rows (`purchase-flow-words`, section 7): "Sign in with Google" in the line under the buttons and in the section 12 body becomes "Sign in with Google or an email link".
- Live now (`d772ba25`): `lib/public/landingCopy.ts:267` "Access is by invite, and sign-in is handled by Google." and `:276`; and `app/signin/page.tsx`, which says "Sign in to the desk with Google. One identity provider, no password to set and none for us to store." and carries a block of what Google hands the desk. The sign-in page needs a second way in and its own plain description of the link.
- The front-page FAQ "What do you collect?" (Web's review) needs two more changes than Marketing's one-line row. Besides "if you sign in by email link, your email address", it must say what payment adds: "When you pay, your card number goes to Stripe, not to us; we keep a record of each charge." And its count of cookies follows `[COOKIES]`.
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
