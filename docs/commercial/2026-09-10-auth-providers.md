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

## 2. APPLE — phase two, by his ruling: what Sign in with Apple requires of a web-only product

*Read 2026-09-10 by a research pass and re-read by this seat the same day
through a rendered browser (Apple's documentation is JavaScript-rendered and
returns only a title to a fetcher). Items marked "pass only" were read by
the pass from Apple's pages and not re-read by this seat.*

**The one fact that decides phase two.** Apple's documentation for the web
configuration says: *"For users to authenticate with your web service, you
must have an existing app in the App Store that uses Sign in with Apple."*
Its usage guidelines for websites say: *"An app on the App Store is required
in order to use this API."* The help page's mechanics agree: *"you must
create a Services ID and associate your website to an existing primary iOS,
macOS, tvOS, or watchOS App ID enabled for Sign in with Apple."* Two Apple
engineers' forum replies in 2024 repeat it, and the Program License
Agreement ties web use to a *"Licensed Application"*, one *"digitally signed
by Apple for distribution"* (pass only, from the public PDF, LYL255,
2026-08-18). **Whether Apple accepts, in practice, a Services ID tied to an
App ID that has no app in the App Store is stated on no public page.** On
the pages as written, a web-only product with no iOS app is outside what
Sign in with Apple is offered for. App Store Review Guideline 4.8, which
obliges apps offering third-party login to also offer Apple's, is written
about apps and never mentions websites (pass only).

**1. Membership.** No single sentence says the web integration needs the
paid Program; three page facts establish it. Every artefact of the web
configuration — App ID, Services ID, domains and return URLs, private key —
is created in Certificates, Identifiers & Profiles; the account overview
reserves that to members: *"To build more advanced app capabilities and
distribute apps, you'll need to be an Apple Developer Program member"*, with
Certificates, Identifiers & Profiles listed under the paid tiers only; and
the Program's "What's included" lists Sign in with Apple among its
capabilities (pass only). **Cost, dated 2026-09-10:** *"The Apple Developer
Program annual fee is 99 USD … in local currency where available"*;
*"Prices may vary by region and are listed in local currency during the
enrollment process"*; auto-renewing annually when enrolled through the app,
optionally when enrolled on the web. **Individual is fine:** *"If you're an
individual or sole proprietor/single-person business, your personal legal
name will be listed as the seller"*; two-factor authentication and legal age
of majority required; a fee waiver exists only for nonprofits, accredited
institutions and governments and *"Not … an individual, sole proprietor, or
single-person business"* (pass only). **An organization enrolment needs:**
*"your organization must be a legal entity … We don't accept DBAs,
fictitious businesses, trade names, or branches"*; a D-U-N-S Number
(*"free in most jurisdictions"*; *"allow up to 5 business days"* from Dun &
Bradstreet and *"up to 2 business days for Apple to receive your
information"* — pass only); legal binding authority; a work email on the
organization's domain; a public, functional website; possibly notarized
business documents. **Timelines, as stated:** individuals *"can review the
license agreement and purchase a membership at the time of enrollment"*;
organizations purchase *"once Apple Developer Support verifies the
enrollment information and sends an email with next steps"*, with no
duration given; *"If you haven't received a membership confirmation within
24 hours of your purchase, contact us."*

**2. What a web integration consists of, once the App ID question is
settled.** A primary App ID with the capability; a Services ID as the web
`client_id`; registered domains and return URLs — *"If you're enrolled as an
individual, you can register up to 10 website URLs"*, *"You must provide at
least one domain or subdomain"*, *"You don't need to upload a file on your
server to complete the registration process for domains and subdomains"*;
each return URL *"must be absolute and must include the scheme, host, and
path"*; a private key to sign the client secret, *"a maximum of two private
keys"* per primary app. Return URIs must use HTTPS and *"can't contain an IP
address or localhost"* (pass only) — the sslip.io hostname would not have
qualified; tmitrader.com does.

**3. What Apple asserts in the identity token — for Ops's model.** From the
`id_token` reference, verbatim:
- `sub`: *"Consists of a unique, stable string, and serves as the primary
  identifier of the user"*; *"Uses the same identifier across all of the
  apps in the development team associated with your Apple Developer
  account"*; *"Differs for the same user across different development teams,
  and can't identify a user across development teams"*; *"Doesn't change if
  the user stops using Sign in with Apple with your app and later starts
  using it again."* This is `apple:sub`, and it is team-scoped: an
  individual enrolment converted to an organization later is a question
  about whether the Team ID survives, which no page read answers.
- `email`: *"either the user's real email address or the proxy address,
  depending on their private email relay service"*; *"Don't use this value
  as an identifier of the user."*
- `email_verified`: *"A string or Boolean value that indicates whether the
  service verifies the email"*; false is stated only for Work & School
  accounts. The identity-token guide adds, for both a real and a relay
  address, *"Apple verifies that the email address works and is ready for
  use"* (pass only).
- `is_private_email`: *"whether the email that the user shares is the proxy
  address."*
- `real_user_status`: *"The claim isn't present or supported for web-based
  apps."*
- **Name and email arrive once.** *"The API collects this information and
  shares it with your app the first time the user logs in using Sign in with
  Apple"*; *"Although Apple provides the user's email address in the
  identity token on all subsequent API responses, it doesn't include other
  information about the user, such as their name"*; *"immediately store it
  locally."* The name is passed *"directly to your app from the browser"*
  and is user-editable in the sheet (pass only).
- *"Web-based interactions allow logins using any Apple Account."*

**What that does to the identity model as Ops scoped it.** The model links
a new provider to an existing user only on a provider-asserted verified
email. A relay address is asserted as verified and is stable per team, but
it is never the address the same person used with Google. **So an Apple
sign-in with a hidden email will never join an existing Google user by
email; it creates a second user, and the only join is link-from-session,
which the model already provides.** A user who shares their real address
joins by email as designed. Apple's own guidance on duplicates says the
same: *"Sharing the real email address … may not help because it may not be
the same email the user uses to create the account with your system."*
Nothing here needs a migration later, which is what Integration asked to
know: `apple:sub` beside `google:sub`, keyed on `(provider, subject)`,
already accepts it.

**4. The private relay.** Addresses *"end in @private.icloud.com,
@privaterelay.appleid.com, or @icloud.com"*; they *"route emails to one of
the Apple Account's verified email addresses"*; they are *"the same for a
user across all apps written by a single development team, and different
for the same user across apps written by different development teams"*;
*"Each private relay email address has a daily limit of 100 emails"*.
**Domain change in progress — Apple's update of 2026-08-24, which
supersedes its June notice:** *"Starting later this year, new Sign in with
Apple addresses, previously issued on privaterelay.appleid.com, will be
issued on private.icloud.com. Existing addresses on privaterelay.appleid.com
will continue to work"*; iCloud+ Hide My Email addresses *"will remain on
icloud.com"*; developers *"should ensure that their account systems, email
validation logic, and allowlists accept addresses on the new
private.icloud.com domain in addition to the existing
privaterelay.appleid.com domain."* **To send to a relay address — a magic
link included — the sending domain must be registered with Apple and
authenticated:** *"you must register your outbound emails or email domains
and use Sender Policy Framework (SPF)"*; the environment page requires SPF,
DKIM *"or both"*; individuals may register up to 32 email sources. *"If a
user chooses to stop receiving email from your app, the relay server rejects
all future emails sent to that address."* Apple states it *"hides the real
email address"*; no page states that Apple ever reveals it. Server-to-server
notifications exist for forwarding changes, consent revocation and account
deletion.

**5. Costs beyond the fee, limits, and lapse.** No page states a per-sign-in
or per-user charge. The only published throttle is on token refresh: *"You
may verify the refresh token up to once a day"* (pass only); no numeric
limit for the authorize or token endpoints is published. On expiry: *"If
your Apple Developer Program membership expires, your apps will no longer
be available for download and you won't be able to submit new apps or
updates or access Certificates, Identifiers & Profiles."* Whether existing
web sign-ins, the Services ID or token validation keep working after a lapse
is stated on no page.

**What could not be established from public pages.** Whether a
registered-but-unshipped App ID is accepted for a Services ID; the identity-
review duration for an individual enrolment; the local-currency price; any
numeric rate limit; what a lapse does to live web sign-ins; whether
converting an individual enrolment to an organization preserves the Team ID
and so every user's `sub`; an explicit statement that the real address is
never disclosed.
