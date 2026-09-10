# The public surface — what Web owns, and what it needs from others

**Written by Web, 2026-09-10 (17:00 ET), against `927641c`.** Owner of this
file: **Web**. Design canvas:
[`canvas/`](canvas/) — six artboards, published for the trader to edit directly.

---

## 1. The design decisions, and why

**Palette and type are the desk's own** (`app/globals.css`) — `#06080b` ground,
`#e9edf3` ink, Geist and Geist Mono. **Convention broken deliberately:** the
usual advice is that a marketing page should be bright and the product dark.
Reason for breaking it: the thing being sold is a dark instrument, and a bright
page followed by a black terminal is a bait-and-switch a trader notices in one
second. The stranger sees what they get.

**What does NOT carry over is density**, which is Design's own point, made
before this thread opened and agreed: the board is 12–13px for a man who
already trusts it; this is 17px prose at a 68-character measure for someone who
does not.

**`--color-muted` `#6d788a` is excluded from text on the public pages.** It
measures **4.49:1** on the desk ground and **4.30:1** on a panel — under the
4.5:1 floor for normal text either way. It was in the first draft of these
pages on the footer's legal paragraph. `#8792a3` (6.37:1) replaces it. *Every
ratio on the `System` artboard was computed, not estimated.*

**Google's sign-in button is used to Google's spec and not restyled** — white
surface, `#1f1f1f` label, the four-colour mark, 4px radius. A restyled one is
both a verification risk and, to a stranger, the thing a phishing page does.

**The sign-in screen composes the provider as a LIST OF ONE**, per Design's
formulation: the group, its label and the stack all survive a second provider
arriving. No second button is drawn.

**No failure screen says "try again."** With one provider, retry is a wall
dressed as a door. Each state offers the one action that can change the
outcome — and for a refusal, that is a person, not a button.

**The public pages load no client JavaScript, no third-party requests and no
analytics**, so there is nothing to consent to and no cookie banner. A page
whose argument is *"we take three things from you"* cannot open by calling four
other companies.

---

## 2. WHAT OPS NEEDS TO LAND — the full prefix list, batched

**All of it at once, per Ops's request, because each exemption is a hole in a
uniform rule granted once and spent forever.** `/` is deliberately absent: it
is the board, and it stays behind Basic Auth until in-app session auth is
demonstrably holding the weight.

| prefix | what serves it | why it must be public |
| --- | --- | --- |
| `/privacy` | renders `docs/legal/privacy-policy.md` | Google requires it reachable and linked from the home page and the consent screen |
| `/terms` | renders `docs/legal/terms.md` *(not yet drafted)* | same requirement |
| `/signin` | the sign-in screen | the page a signed-out visitor is sent to |
| `/auth/` | the OAuth start and callback | `/auth/callback/google` is a registered exact-match redirect URI; `/api/auth/` would inherit Basic Auth |
| `/favicon.ico` | static | falls under `location /` today, so a public page's tab icon 401s — invisible from any browser on this desk |

**Already public and NOT being asked for again:** `^~ /_next/static/`
(`nginx-locations.conf:143`, opened 2026-08-23 with the bundle scanned).

**THE TRAP THAT IS STILL LIVE, and it is not a request:** `/_next/image` and
`/_next/data` are deliberately outside that exemption. **A public page that
uses `next/image`, or that serves any raster asset from `/`, renders broken to
a stranger and perfectly to everyone here** — the same instrument problem as
the 401, one layer down. *These designs use inline SVG and no raster assets at
all, which sidesteps it; whoever adds a logo, a screenshot or an Open Graph
preview image later will walk into it.* An OG image, when one is wanted, needs
its own public path.

**Proof of each, from an actor with no cached state — not from a browser here:**

```
curl -s -o /dev/null -w "%{http_code}\n" https://tmitrader.com/privacy
```

Expect `200`. **A `401` here is the failure this whole thread exists to catch,
and nobody on this desk can see it.**

*Baseline, measured 2026-09-10 16:0x ET before any of this: `/` → 401,
`/privacy` → 401, `www.tmitrader.com/` → 401.*

### The status code each sign-in state must send

**Specified as design, not as an implementation detail, because a denial that
renders HTTP 200 has already happened on this desk once.**

| state | code |
| --- | --- |
| sending you to Google | `302` |
| you stopped at Google (cancelled) | `200` |
| **account not admitted (refused)** | **`403`** |
| Google not answering | `503` |
| our fault | `500` |
| signed out | `200` |

### The privacy page's rendering contract

- `/privacy` renders `docs/legal/privacy-policy.md` **at request time**. No
  copy of the text exists in any template.
- The file's frontmatter carries `adopted:`. **While `adopted` is null the page
  renders the DRAFT banner**, styled as on the `Privacy` artboard. It
  disappears when — and only when — the trader sets a date there.
- `drafted` and `last_changed` render into the dateline.

---

## 3. Open questions, with who can answer each

| # | question | who |
| --- | --- | --- |
| 1 | Operator name, registered address, contact email, legal entity, jurisdiction | the trader |
| 2 | Access terms — invite only, waiting list, open, or a price | the trader |
| 3 | Session cookie name and lifetime; whether any mailing list exists; log fields and retention; hosting region | Ops |
| 4 | Whether Google's "home page" must be `tmitrader.com` itself, or whether a page elsewhere on the domain satisfies it | nobody has confirmed; **do not guess** |
| 5 | Terms of service — not yet drafted | Web, next |

**Every `[BRACKET]` in `docs/legal/privacy-policy.md` maps to one of rows 1–3.**
None of them was invented to look complete.
