# Sign-in and FINRA set-up: your steps for today

*Written 2026-10-02 by Integration for Adam. Every console step below was read today on Google's and FINRA's own help
pages, not written from memory. Sources are listed at the bottom.*

## Three rules for the whole guide

1. **Never paste a secret into any chat.** Secrets go in one place only: `A:\mointel\.env.local`.
2. **One line per key, written `NAME=value`.** No quotes, no spaces around the `=`. Add the new lines at the end of the
   file.
3. **When a part is done, tell Ops in Ops's chat** (`Ops-tmi`). Ops copies the keys to the server; you never touch the
   server.

---

## Part 1. The Google sign-in client (do this first, and early)

Google says a change to the redirect address **"may take 5 minutes to a few hours to take effect."** So do this part
well before tonight.

1. Open **https://console.developers.google.com/auth/overview**, signed in as **your tmitrader.com Workspace
   account** (so the sign-in app belongs to the business, not your personal Gmail).
2. If it asks you to pick a project, **create a new one** named `TMI Trader`. (Keeps sign-in separate from the Google
   Sheet robot account.)
3. Click **Get Started** and fill in:
   - **App name:** `TMI Trader`
   - **User support email:** your tmitrader.com address (Google allows the signed-in account's address, or a Google
     Group it manages, such as a support@ group).
   - **Audience:** **External.** *Not Internal.* A Workspace account is offered "Internal", and Google says Internal
     refuses everyone outside the organization with an `org_internal` error. That would lock out every customer and
     your own Gmail, and the throwaway test would be refused by Google instead of by the desk, proving nothing.
   - **Contact information:** your tmitrader.com address.
   - Agree to Google's policy and finish.

   *Google shows the app name on its sign-in screen only after a verification review. Until then people see the domain
   (tmitrader.com). That is fine for tonight.*
4. Open the **Branding** page:
   - **Authorized domains:** add `tmitrader.com`. (Google says to add this *before* the redirect address.)
   - **Application home page:** `https://tmitrader.com`
   - **Privacy policy link:** `https://tmitrader.com/privacy`
   - **Terms of service link:** `https://tmitrader.com/terms`
   - **Skip the logo.** Google says a logo on a published external app goes through a verification review before it
     shows, and tonight does not need one.
5. Open the **Audience** page. **Leave Publishing status at "Testing" and add no test users.** Google's own page says
   that when an app asks only for name, email and profile (ours asks for exactly those three), people do not need to
   be on the test list, see no warning, and their sign-ins do not expire after 7 days.
6. Open **https://console.developers.google.com/auth/clients** and click **Create Client**:
   - **Application type:** **Web application**
   - **Name:** `tmitrader production`
   - **Authorized JavaScript origins:** leave empty.
   - **Authorized redirect URIs:** add exactly
     `https://tmitrader.com/auth/callback/google`
     (Google matches it letter for letter: https, lower case, **no slash at the end**.)
   - Click **Create**.
7. **The client secret is shown ONCE.** Google: *"it will not be visible or accessible again."* Before closing that
   window, put both values into `A:\mointel\.env.local`:
   ```
   GOOGLE_CLIENT_ID=<the Client ID>
   GOOGLE_CLIENT_SECRET=<the Client secret>
   ```
   These are the exact names the sign-in code reads. **Do not add `OAUTH_REDIRECT_URI`**: the deploy script sets that
   for the server itself and removes any local copy.
   *If you close the window without the secret, make a new client; the old secret cannot be shown again.*
8. Tell Ops: **"Google client done, keys are in .env.local."**

## Part 2. Who gets in first

9. Tell Ops: **"Seed iamadamzc@gmail.com as the first allowed address."** Ops adds it only on your word.

   **Tonight you must sign in with exactly this address.** If you sign in with any other Google account, the correct
   answer is "refused", and that is not a bug.

   *Which account owns the Google project (Part 1) and which address is allowed in are separate things. If you would
   rather sign in to the desk with your tmitrader.com address, tell Ops to seed that one instead, and use it tonight.*

## Part 3. A throwaway Google account

10. Create a new Google account that **will never be invited**. Do not give its address to anyone to seed. It exists
    only to prove the desk turns away someone who is not on the list. (No seat can create accounts; this one is yours.)

## Part 4. The FINRA credential

FINRA gives a personal ("Individual") account two credential types: **Public** and **Mock**. You want **Public**. Mock
only reaches sample data.

11. Open **https://gateway.finra.org/app/dfo-console** (the **Console** button on developer.finra.org) and log in with
    the account you registered.
12. If the **My Credentials** tab already shows a **Public** credential, skip to step 15.
13. Click **ADD API CREDENTIAL**:
    - **Type:** **Public**
    - **Name:** anything that reminds you what it is for, for example `tmi short interest`.
    - **Total Fee Per Month** should read **$0** for Public.
    - Agree to the FINRA API Terms of Service and click **CREATE**.
14. Two emails arrive (check spam). One carries the **API Client ID**. The other, ending "Action Required", has a
    **Create API Client Secret** button. **That link expires in 24 hours.** On the page it opens:
    - **User ID:** the **API Client ID** (FINRA says: NOT the user ID you log in with).
    - **Password:** a secret you choose. This becomes the API Client Secret.
    - Click **SAVE**. The credential is now active.
15. Put both into `A:\mointel\.env.local`:
    ```
    FINRA_API_CLIENT_ID=<the API Client ID>
    FINRA_API_CLIENT_SECRET=<the secret you chose>
    ```
16. Tell Ops: **"FINRA keys are in .env.local."** Ops then checks whether FINRA's short-interest data actually covers
    Nasdaq and NYSE small caps. If it does not, this source is closed for those names.

**Good to know:**
- The API secret **expires after one year**; FINRA emails you 30 and 7 days before. Your FINRA login password must be
  changed every 120 days.
- FINRA's docs say personal accounts are *"not intended for commercial purposes at this time."* That is part of the
  exposure you already accepted; nothing new to decide.
- There is a small file `A:\mointel\docs\finra.txt`, kept out of git. Nobody here has opened it. If it holds a FINRA
  ID or secret, move the value into `.env.local` and delete the file.

---

## Part 5. Tonight, after 20:00 ET (Ops asks your yes in Ops's chat at each step)

The 20:12 ET snapshot and the ladder release come first. Then sign-in, in this order:

| Step | What happens | Needs |
| --- | --- | --- |
| a | Ops ships the sign-in pages (not live on the site yet) plus a small check page, `https://tmitrader.com/auth/probe`, **switched off** | a deploy, your yes |
| b | Ops **switches it on** | a separate yes |
| c | **You sign in twice** (below) | about 10 minutes of you |
| d | Web's change that makes the desk use sign-in ships | a second deploy, your yes |

**Step b is the one that goes missing quietly.** A check page that is switched off looks exactly like one that was
never shipped, so Ops confirms the sign-in page answers before trusting anything the check page says.

**Step c, what you do:**

1. **Your own browser:** go to `https://tmitrader.com/signin`, sign in with `iamadamzc@gmail.com`, then open
   `https://tmitrader.com/auth/probe`. You should see `{"state":"admitted"}`.
2. **A private window:** the same, signed in with the **throwaway** account. You should see `{"state":"refused"}`.
   **Do not skip this one, even if the night runs late.** A desk that lets everyone in looks identical to a working
   one from your own account. This is the only test that tells them apart.
3. Ops checks the third case itself (no sign-in at all should read `anonymous`).

If a browser asks for the desk password at any point, enter it as usual. **The desk password stays on all night.**

**Wait for Ops to say the Google keys are on the server before you open `/signin`.** If you click the Google button
before that, you get a plain page reading "Sign-in is temporarily unavailable." That means the keys are not on the
server yet, not that the release is broken.

**What tonight proves, and what it does not:**
- **Proves:** the desk admits someone invited, refuses someone not invited, and treats someone not signed in as a
  stranger.
- **Does NOT prove:** that a stranger *without* the desk password can complete sign-in. The desk password stops them
  before the app sees them. That can only be tested on the night the desk password comes off, which is a separate
  night, on your word. **So after tonight, nobody should say "sign-in works."**

## Part 6. The short-interest label is not tonight

The label waits on Ops's coverage check (Part 4). When it does ship, it ships **together** with the FINRA attribution
lines, the one-sentence terms change, and your adoption of that terms change, in one release. Never the label alone.

---

### Sources read today

- Google: *Using OAuth 2.0 for Web Server Applications* (developers.google.com/identity/protocols/oauth2/web-server);
  *Get started with the Google Auth Platform* (support.google.com/cloud/answer/15544987); *Manage OAuth App Branding*
  (/15549049); *Manage App Audience* (/15549945); *Manage OAuth Clients* (/15549257).
- FINRA: *Documentation*, sections API User Types, API Credential Types, Creating an API Credential
  (developer.finra.org/docs).
- This repo: `lib/auth/config.ts` (key names), `lib/auth/oauth.ts` (scopes `openid email profile`),
  `deploy/aws/sync-env.sh` (redirect set on the server), `docs/web/2026-10-01-gate-probe-design.md` (tonight's check),
  `docs/threads/ops.md` (the cut-over order).
