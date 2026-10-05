# Path to beta launch

*Integration-tmi (26th seat, `local_2102878a`), 2026-10-05, on his "let's define a path to beta launch". Every line is
read from a file in this repo (cited) or marked as a recommendation. A plan, not a ruling: the three decisions at the end
are his. Production at writing: web/research/assess `6e7fff84`, market `f5746a84` (Ops, read off the box
2026-10-05T16:06:07Z).*

## RULED 2026-10-05T18:51:26.857Z (his turn, transcript 125cfd6b, read at his own turn)

> *"disable retry research for users. leave that for just me, if i click it, it triggers and populates and changes to
> everyone. i'm assuming i have a different level of role already?"*
> *"free beta, limited invites. 2, these will be considered testers, so its covered. 3, no."*

1. **Beta = FREE, LIMITED INVITES.** Section 5 (paid) is off the critical path.
2. **Licence: the invitees are TESTERS, and he ACCEPTS the exposure for them under his 2026-09-08 ruling.** "Covered"
   means accepted, NOT licensed: no published instrument has a tester category, and Alpaca, the exchange agreements and
   UTP's trial policy all treat a beta viewer as an external subscriber (Commercial, landscape section 1b; charter
   e9f64794). **No surface a tester sees says "licensed" or "covered by".** The risk conversation for the free beta is
   held and closed. Whether a paying user is "something moving" stays undefined (not asked again now).
3. **No lawyer before the beta.**
4. **Retry research is OWNER-ONLY.** Replaces A2 (a per-user rate limit). The retry already serves everyone: it clears
   the ticker's retry state in the one shared market store (`lib/research/control.ts:59-84`), and the board is the same
   for every user. **His question, answered from the code: NO, there is no role today.** Every admitted user is equal;
   `gateApiRequest` checks admission only (`lib/auth/requestGate.ts:77-79`), and the users table has only a `status`
   column (default `pending`) that nothing reads (`lib/auth/store.ts:39-61`). So the owner distinction must be built.

5. **RULED 2026-10-05T19:09:04.056Z** (his turn in Web's chat, transcript 724a851e, read at his own turn): *"yes that
   address, and once"*, answering Web's two questions: the owner address is the one he is invited on
   (`DESK_OWNER_EMAIL`, written on the box by Ops on his word, before the ship), and the entry disclaimer is asked
   **once**, again only when its wording changes (the option as Web put it to him).
6. **Integration's call, inside his rulings:** for the beta, no review or MCP token goes to any tester or anyone outside
   him and the seats; token holders never meet the entry gate (Web placement doc 7fb6411c, gap 2).

## 0. "Beta" has never been defined *(answered above: free, limited invites)*

No file defines beta or launch (`integration.md:806-808`: "ASK WHAT LAUNCH MEANS. He has never defined it"). Two
products hide in the word:

- **Invited beta, free:** a few named traders sign in and use the desk. Needs access, trust and his licensing word.
- **Invited beta, paid:** the same, plus a price, terms of sale and a working charge. His ruling 2026-09-28: "first paying
  users are invited and billed by hand; self-serve later" (`commercial/daily-billing-design/commercial.md:479`).

Self-serve sign-up is out of scope for either (his ruling above). The plan below is staged so the free beta is a
subset of the paid one.

## 1. Already true (live)

| item | source |
| --- | --- |
| Google sign-in with an allowlist; invite = add an email, revoke ends live sessions | `web/2026-09-24-oauth-gate-plan.md:29-31,184-190` |
| `/desk` requires sign-in (step 4, his yes 2026-10-03T14:35:39Z) | `threads/ops.md:13918` |
| Refusal of a non-invited account proven in his browser (claims A to C) | `threads/ops.md:13565-13568` |
| Terms and privacy adopted 2026-09-11, public | `threads/web.md:492` |
| Deploy-time OOM fixed (64 MiB LRU, 0e883fec), build fits the box | `threads/ops.md:13429-13435` |
| Same board for everyone, so research cost does not grow with users | `monetization-gates.md:164-172` |

## 2. The critical path to a FREE invited beta

In order; each step's owner and trigger.

| # | step | owner | waits on |
| --- | --- | --- | --- |
| A1 | **Gate `/api/dashboard`.** Ungated today because the market worker reads it with no cookie for Sheet pins. | Web | Sheet plan step 4 release, or a separate fix that gives the worker another path (`threads/web.md:526`) |
| A2 | ~~Per-user rate limit on `POST /api/research/retry`~~ **OWNER-ONLY retry (his ruling 18:51:26Z):** the route refuses anyone but him (server-side, not just a hidden button), and the Retry control is not shown to anyone else. | Web (route + owner check), Design (the control) | build |
| A3 | **`= /signin` and `^~ /auth/` exemptions** in nginx. | Ops | A1, A2 |
| A4 | **Entry disclaimer:** his ruling 2026-09-30, "this is required before you can enter the platform". Build status unverified; DECLINE must withhold the desk. | Web + Design | build (`threads/commercial.md:166,195`) |
| A5 | **Basic Auth off**, its own night. | Ops, **his yes** | A1 to A4 (`threads/web.md:528`) |
| A6 | **One person with no Basic Auth password signs in** (claim D, the proof nothing earlier can give). | him + one invitee | A5 |
| A7 | **His browser checks of the sign-in release**, not yet reported. | him | nothing (`threads/ops.md:13942`) |

## 3. Trust: what an outsider cannot see round

`monetization-gates.md:131`: "A single trader tolerates a defect because he can see round it. A paying subscriber cannot."

| # | step | owner | state |
| --- | --- | --- | --- |
| T1 | **Deploy path tells the truth:** push-release's follower times out (rc 8); cutovers are confirmed from /proc by hand. | Ops | open (`threads/ops.md:13955`; `integration.md:817-820`) |
| T2 | **An alert when the desk stops:** "There is no watchdog and no alert." No later build found. | Ops | not started (`threads/ops.md:3413`) |
| T3 | **A visible "not updating" state on the board** so a stale board does not look live. | Design | not built (`threads/design.md:65`) |
| T4 | **Citation tokens leaking into text** (e.g. "[1043]"). | Research | fix approved, unbuilt; it gates the next release (`threads/research.md:182`) |
| T5 | **The false landing sentence** "No filing carries one": new wording approved by him 2026-10-04, rides the next release. | Web, Ops | on main, not live (`threads/web.md:461-462`) |

## 4. Product: on the board, not a gate (recommendation)

Recommendation: **the beta starts on today's board** and these arrive during it. Each is approved and in progress.

| item | owner | waits on |
| --- | --- | --- |
| Float column + public page "Are float quotes real?" (always shown, his 2026-10-05 rulings) | Research, Design, Web | validation sample, then **his** strictness choice (max age, issuance rule) |
| Sheet reproduction: Priority badge with tooltip, field contract steps 3 to 7 | Research, Design | Research's final field contract; rubric not started |
| Session reports v6 | Research | steps 3 to 6 |
| Range ranking / movers on main | Ops, Design, Research | the movers design on main (see `integration.md` 26th notes) |

If he wants the Sheet reproduction IN the beta rather than during it, it moves to section 2 and the date moves with it.

## 5. Only if PAID from day one

| # | step | owner | state |
| --- | --- | --- | --- |
| P1 | **The day-pass price.** No figure is proposed anywhere. Tiers: "i dont know". | **him** | open (`commercial/2026-09-27-day-pass-addendum.md:73`) |
| P2 | **Refund rule.** Recommended default "no refund for a paid day", not ruled. | **him** | open (`legal/terms-of-sale-daily-pass.md:85`) |
| P3 | **Terms of sale adopted** before any card is charged. Drafted, held. | **him**, Web | open (`threads/commercial.md:193`) |
| P4 | **Payment processor account** (Stripe assumed; test mode first). Never created. | **him** | open (`commercial/2026-09-28-daily-billing-infra.md:91-95`) |
| P5 | **Billing build** (charges table, webhook, 1-hour grace, OS notification). Approved 2026-09-28, sequenced after A6. No code exists. | Ops, Web, Design | A6, P4 |
| P6 | **His approval of the first real charge.** | **him** | P5 |
| P7 | **Who watches the support inbox** (`info@andromedagenius.com`). | him | open (`billing-onboarding-support-scope.md:320`) |

## 6. His word that covers every outside viewer

- **Market data licence.** Every published agreement draws the redistribution line at the first person other than him
  who sees the board, paid or not: "a private beta is exposure, not preparation" (`monetization-gates.md:208-212`). He
  accepted the exposure 2026-09-08 "until something moving", and deferred the risk conversation, which Integration owns
  and must reopen before the first outside viewer (`monetization-gates.md:20-22,46-49`). **This is that reopening.**
- **No lawyer has read the terms.** The file says so: "NOBODY WITH A LAW LICENCE HAS READ THIS FILE"
  (`legal/terms.md:73`). The terms do say "Nothing here is advice" and that the company is not a broker-dealer or
  adviser (`terms.md:181-183`).

## 7. Shortest honest sequence (recommendation)

1. He answers the three questions below.
2. A2 gets an owner; A1, A2, A4 and T1 build in parallel (one gate at a time on the shared PC, Ops's queue).
3. Next ordinary release carries T4, T5 and whatever of A1/A4 is ready.
4. A3, then A5 on its own night with his yes, then A6 with one invitee.
5. Invite the beta list. T2 and T3 before the list grows past the first few.
6. If paid: P1 to P4 from him can run in parallel with steps 2 to 4; P5 starts after A6; P6 last.

No dates are given: nothing here has an estimate from its owner yet, and a date this seat invents would reach him as a
constraint. The owners are asked for estimates once he has answered section 8.

## 8. His decisions

1. **What does beta mean: free invited, or paid invited from day one?** Recommendation: **free invited first**, a short
   named list; paid when P1 to P6 are done. It removes the price, terms-of-sale, processor and billing build from the
   critical path, which then is section 2 plus T1, T4 and T5.
2. **Does the 2026-09-08 accepted licence exposure cover an invited beta of N people, and does a first paying user count
   as "something moving"?** Recommendation: say yes or no explicitly before A5, since A5 is the first moment a stranger
   can see the board.
3. **A lawyer reads the terms (and terms of sale if paid) before the first outsider?** Spend is his. Recommendation:
   yes before the first paying user; his call whether before a free one.
