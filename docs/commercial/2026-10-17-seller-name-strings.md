# The seller's name: Andromeda Genius LLC, and TMI as its product

**Commercial-tmi (7th tenure), 2026-10-17 (UTC). A draft of exact lines for his yes. Nothing here is adopted, built or live.** His word, as Integration relays it (Integration chat, uuid 4c63ebbb, 2026-10-17T02:44:31.716Z; I did not open his turn): yes to correcting "Andromeda Genius, Inc" to "Andromeda Genius LLC" on the live site, "but there should be some wording/distinction that TMI is developed by Andromeda". The legal documents name the LLC as the operator. The change rides Web's small release with the desk@tmitrader.com address swap he ordered.

**The one idea, said once:** TMI is the product. Andromeda Genius LLC is the company that develops and operates it, and sells it. Every line below says that and nothing more.

## 1. The lines Web changes (public pages and footers, production `296b6102`)

Each line gives where it is, what it says now, and the new words. Marketing reads the voice before they go to him.

| Where | Now | Becomes |
| --- | --- | --- |
| Front page footer (`app/page.tsx:285`) | `© 2026 Andromeda Genius, Inc. All rights reserved.` | `TMI is developed by Andromeda Genius LLC. © 2026 Andromeda Genius LLC. All rights reserved.` |
| Site footer (`components/SiteChrome.tsx:35`) | `© 2026 Andromeda Genius, Inc.` | `TMI is developed by Andromeda Genius LLC. © 2026 Andromeda Genius LLC.` |
| The Access section's last line (`lib/public/landingCopy.ts:278`) | `Andromeda Genius, Inc., San Antonio, Texas.` | `TMI is developed by Andromeda Genius LLC, San Antonio, Texas.` |

The design canvases and the are-float-quotes-real preview carry the same lines (`docs/web/canvas/Main.dc.html:362, 398`; `LandingMobile.dc.html:263, 286`; `Privacy.dc.html:74, 126`; `docs/web/previews/are-float-quotes-real.html:148`), and the copy test fails if a canvas drifts from the page, so they change with it.

The lead of the Access section changes with the purchase words (Marketing's flow words), not here.

## 2. The legal documents: the operator sentence

These are adopted documents. The patch in `docs/commercial/live-legal-patches/2026-10-17-llc-name.patch` (regenerated with these words) applies to a tree at `296b6102`. Whether the change is a "material redraft" under the terms file's rule (which would send `adopted` back to null and put a DRAFT banner on the live page) is his attorney's; it changes who the document names and does not change what a reader is promised.

**Terms of service, section 1.**
- Now: "**The Momentum Intelligence Trading Desk** (TMI) is operated by **Andromeda Genius, Inc**, of 5460 Babcock Rd, Suite 120 PMB 95234, San Antonio, TX 78240, United States."
- Becomes: "**The Momentum Intelligence Trading Desk** (TMI) is developed and operated by **Andromeda Genius LLC**, of 5460 Babcock Rd, Suite 120 PMB 95234, San Antonio, TX 78240, United States."
- The next sentences stay: "We" is that company. "You" is the person signed in. "The desk" is the service.

**Privacy policy, section 1.**
- Now: "**The Momentum Intelligence Trading Desk** is operated by **Andromeda Genius, Inc**, of 5460 Babcock Rd, Suite 120 PMB 95234, San Antonio, TX 78240, United States."
- Becomes: "**The Momentum Intelligence Trading Desk** (TMI) is developed and operated by **Andromeda Genius LLC**, of 5460 Babcock Rd, Suite 120 PMB 95234, San Antonio, TX 78240, United States."

**The contact blocks** (terms section 13, privacy section 11): the company line "Andromeda Genius, Inc" becomes "Andromeda Genius LLC". Nothing else in them changes except the address swap he ordered.

**Terms of sale, section 8 (approved text, so this needs his yes with the rest).**
- Now: "Andromeda Genius LLC, of 5460 Babcock Rd, Suite 120 PMB 95234, San Antonio, TX 78240, United States. You can reach a person at desk@tmitrader.com."
- Becomes: "TMI is developed and sold by Andromeda Genius LLC, of 5460 Babcock Rd, Suite 120 PMB 95234, San Antonio, TX 78240, United States. You can reach a person at desk@tmitrader.com."

## 3. What stays

- The product name is TMI, and "The Momentum Intelligence Trading Desk" in the legal documents. "TMI Trader" is not used (the name changed on 18 September 2026).
- The copyright line names the company, not the product.
- The name form ("LLC", or the Texas filing's long form "Andromeda Genius, Limited Liability Company") and the address are his attorney's.

## 4. Order

One small release: the seller's name with the TMI-is-developed-by wording, the desk@tmitrader.com address, in the footers, the Access line, the canvases, and the two legal documents. The legal documents are adopted by him; the exact words go to him as a list. It does not wait for the purchase pages.
