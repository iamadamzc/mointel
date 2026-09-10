# Sign-in providers — what Google and Apple actually require, from their own pages

**Written by Commercial, 2026-09-10, against `02bf90d`.** Integration's
commission after the trader named the providers — *"google and apple for
authentication and maybe email link"* — and then ruled *"1, phase 2"* (Apple
is phase two) and *"2, yes, oath consent. is that required?"* (he meant
Google's OAuth consent screen, and whether it is required is the live
question). Public documentation only. **Nothing was registered, no project or
account was created, no terms were agreed.** Every page cited was read on
2026-09-10 by a research pass and then re-read by this seat the same day;
where Google's pages contradict each other the contradiction is reported,
not resolved, as Integration asked.

---

## 1. GOOGLE — "is the OAuth consent screen required?"

**Short answer, in the terms he used.** The consent screen is not a thing you
opt into; it is the configuration Google shows users when they sign in, and
it exists from the first OAuth client. What he is asking about is
**verification** of it. For an app that asks only for identity — the `openid`,
`email` and `profile` scopes — **Google's pages agree on how it behaves and
disagree on whether it is permitted:** it works for any Google user without
verification, showing the domain instead of the app's name and logo; three
pages say that is allowed and two say production apps must verify. The
mechanics, the contradiction and the demands are below, as two gates.

### Gate A — what it takes to run Google sign-in at all

- **A Google Cloud project with an OAuth client and a configured consent
  screen.** The Sign In With Google setup page (last updated 2026-04-06):
  *"For the authentication, default scope (email, profile, openid) is
  sufficient, you don't need to add any sensitive scopes."*
- **A new project starts in publishing status "Testing."** Manage App
  Audience (Google Cloud help, ©2026): *"Projects configured with a
  publishing status of Testing are limited to up to 100 test users listed in
  the OAuth consent screen"*; *"Authorizations by a test user will expire
  seven days from the time of consent."* **And the exception that is this
  product's case:** *"The only exception to this behavior is if your app
  requests a subset of the following: name, email address, and user profile
  (through the userinfo.email, userinfo.profile, openid scopes or their
  OpenID Connect equivalents). For such requests, your users do not need to be
  in the trusted user list, they will not see a warning message, and their
  authorizations will not expire after 7 days."*
- **Contradiction, reported not resolved.** The production-readiness
  overview (last updated 2026-05-22) describes the same Testing exception as:
  *"If the app only requests basic identity scopes (openid, email, profile),
  any user can access without being on the allowlist. Users see a warning UI
  indicating the app is in testing, rather than the standard unverified app
  screen."* One page says no warning, the other says a testing warning. Both
  agree any Google user can sign in.
- **Scopes.** Identity scopes are not sensitive or restricted on any current
  page read; the sensitive/restricted machinery — reviews, the "unverified
  app" screen, the lifetime cap — is stated to attach to *"scopes categorized
  as sensitive or restricted"*, which these are not.
- **Cost: not stated.** No Google page read states a price, or the word
  free, for Sign in with Google, OAuth clients, the consent screen or brand
  verification. The only fee sentence anywhere is about restricted-scope
  security assessments by third-party assessors: *"Google does not charge
  the developer any fees for security assessment … The cost for such a
  service is agreed on between the developer and the assessor."* The console
  checkup *"reports if your app does not have an associated Cloud billing
  account"* and the platform overview says associating one is
  *"recommended"*; nothing read says one is required for OAuth.

### Gate B — what it takes to publish ("In production") and be verified

- **Publishing.** *"A project's publishing status is considered In
  production after selecting the Publish app button."* *"Projects configured
  with a publishing status of In production are available to any user with a
  Google Account."*
- **Whether verification is required for an identity-only app — the
  contradiction, verbatim, three pages against two:**
  - OAuth App Verification Help Center (©2026): *"If your app utilizes only
    non-sensitive scopes, it is not mandatory for your app to complete the
    app verification process."* And: *"if you want your app to display an
    app name and logo on the OAuth consent screen, you will need to complete
    a lighter-weight verification process known as 'brand-verification'."*
  - Manage OAuth App Branding (©2026): *"Your brand must be verified if you
    want your application logo and application name to be visible to users
    on the consent screen. Without verification, only your application
    domain will be visible to users."*
  - Production-readiness overview (2026-05-22), row Published / External /
    Unverified: *"Any Google user can access. Strongly discouraged. Because
    the app has not completed brand verification, the app's name and logo
    are not displayed on the consent screen."*
  - **Against:** OAuth 2.0 Policies (last modified 2026-08-05): *"For
    production apps, brand information must be verified."* And Get started
    with the Google Auth Platform (©2026): *"All production apps, including
    those that request access to scopes categorized as sensitive or
    restricted, must complete Google's OAuth app verification before being
    granted access."*
  - **Reading, stated as a reading:** the pages agree on the mechanics — an
    unverified identity-only production app functions for any Google user,
    showing `tmitrader.com` where the name and logo would be — and disagree
    on whether Google's policy permits leaving it that way. The brand
    verification page (2026-08-19) frames the consequence as trust rather
    than blocking: *"If your app's branding information remains unverified,
    it might result in decreased user trust of your request for their data,
    which can lead to fewer user authorizations and more revocations later."*
- **The user cap, precisely.** Two caps exist and neither is concurrent.
  Testing: *"up to 100 test users"* on the allowlist, from which identity-only
  apps are exempt. Unverified apps using sensitive or restricted scopes: *"100
  new users in total, after the app presents the unverified app screen"*;
  *"The user cap applies over the entire lifetime of the project, and it
  cannot be reset or changed."* **Neither cap is stated to apply to an
  identity-only app.**
- **When brand verification is required, in Google's own criteria** (brand
  verification page, 2026-08-19), *all* of: *"your app's configuration is
  set for a user type of External and a published status of Published"* and
  *"You want your app to display a logo or display name on the OAuth consent
  screen."* Exceptions listed: personal use; development, testing or staging
  tiers; service-owned data only; internal use only; domain-wide
  installation.
- **What the consent screen and brand verification demand:**
  - App name, support email, and optionally a logo — the name and logo are
    shown only once verified.
  - **Home page, privacy policy and terms links:** *"These links are required
    for all external production apps. You will not be able to submit your
    app for verification if it is missing these links."* Policies: *"Every
    production app that uses OAuth 2.0 must have a publicly accessible home
    page. The homepage must include a description of the app's
    functionality, as well as links to terms of service and a privacy
    policy."* Verification requirements: *"The homepage must be hosted on a
    verified domain you own"*; *"Your homepage can not be only a login
    page"*; *"The Privacy Policy should be hosted within the domain that
    hosts your homepage"* and linked from both the homepage and the consent
    screen, the same link in both places.
  - **Domain ownership — the part that is now concrete because
    tmitrader.com is owned.** *"You must verify that you own all domains
    listed in your Authorized domains section of the OAuth consent screen
    editor."* *"An account listed as a project owner or editor on your GCP
    account must verify ownership of the authorized domain using Google
    Search Console."* *"All domains used in your project, whether in the
    branding page or client configuration pages must be pre-registered
    here."* Search Console's Domain-property method is a DNS record: *"Add a
    DNS record to your domain provider's record list to prove ownership"* —
    a TXT (or CNAME) record with *"the Host/Name property, either leave this
    blank, or set as '@'"*; *"For manually installed records, it can take up
    to two or three days for your provider to start serving the record"*;
    *"To stay verified, don't remove the DNS record from your provider, even
    after verification succeeds."* On this desk that record lives in Route
    53, which Ops holds; the verifying Google account must be a project owner
    or editor.
  - **Button branding:** Verification requirements: *"Sign-in branding
    guidelines are recommended for apps requesting only 'profile or email'
    scopes."* Branding Guidelines (2026-07-07): *"Following these guidelines
    on displaying the Sign in with Google button is required for app
    verification."* Recommended on one page, required-for-verification on
    the other; reported as such.
- **Time, dated 2026-09-10.** Brand verification page: the automated
  process *"usually completes in a few minutes"*; manual review *"usually
  takes 2-3 business days"*; results *"valid for 7 days"* — publish within
  that window or the status becomes *"Need to re-verify."* FAQ table: Brand
  Verification *"2-3 Business days"*; Sensitive Scope *"10 Business days"*
  (the sensitive-scope page itself says *"3-5 business days"* — a second
  contradiction, not applicable to identity scopes); Restricted *"6
  weeks"*; *"these estimates are not guaranteed and will vary based on
  developer responsiveness."*

### What Google asserts in the ID token — for Ops's identity model

OpenID Connect page (last updated 2026-06-15): `sub` — *"An identifier for
the user, unique among all Google Accounts and never reused"*; `email` —
*"Provided only if you included the email scope"*; `email_verified` — *"True
if the user's email address has been verified; otherwise false"*; and
*"Don't use the email field as a unique identifier for a user. Always use
the sub field."* This is exactly the shape Ops scoped — an internal user id,
`google:sub` linked to it, linking on a provider-asserted verified email —
and Google's `email_verified` is the assertion that model resolves on.

### What could not be established from public pages

- Whether the Cloud Console blocks publishing, or adding an authorized
  domain, when the domain is not Search-Console-verified — console behaviour
  behind a login.
- A single authoritative answer on whether an identity-only production app
  is obliged to verify; the contradiction above is what the pages say today.
- The exact appearance of the consent screen for an unverified identity-only
  app beyond *"only your application domain will be visible."*
- Any price, or the word free, for any of it.

---

## 2. APPLE — phase two, by his ruling

*Research pass in progress at the time of writing; this section is added
when its findings have been re-read. What is already known from the code
side: Ops's identity model keys `apple:sub` beside `google:sub` and links
only on a provider-asserted verified email, so what Apple asserts about a
hidden relay address decides whether an Apple sign-in ever joins an existing
Google user or always creates a second one.*
