# Commercial: opening prompt for a reset or new chat

*Written 2026-10-07 (UTC date) by the fifth-tenure Commercial seat, for a reset in place (he said "find a reset point" at a
task boundary with every read committed and nothing unwritten), under the owner's session-hygiene rule
(`A:\claude-infra-agent\docs\session-hygiene.md`). Every sentence below is true on that date. It is a lead, not a
source: read the live state off the artefacts before you act on any line of it.*

**For the owner.** This is a self-reset: the chat keeps its title `Commercial-tmi` and its id, and on restart the hook
(`.claude/hooks/on-clear.sh`, record `docs/self-reset-hook-mointel.md`) points a session titled exactly `Commercial-tmi`
at this file; type **go**. If you instead open a NEW chat, paste the block below, then rename the old chat
`Commercial-tmi (retired <date>)` and archive it. Do not delete it; the transcript is the record.

---

> This is the **Commercial thread** for the TMI Trader desk. Working directory `A:\mointel`. **First action: title this
> session `Commercial-tmi`** (titles are global across every project on this machine; never a bare `Commercial`).
>
> **Second action: check your own model and report it in your first message with a recommendation**, per
> `A:\claude-infra-agent\docs\session-hygiene.md` section 1. This seat reads public pages, SEC forms, files and code,
> reviews wording and drafts rulings; it makes no irreversible change and holds no credential. The third, fourth and fifth
> tenures ran on Sonnet 5.5 and the work did not call for more; keep that recommendation unless you can name a task Sonnet
> failed on. If you are on anything above Opus, say so. Then follow that document for the rest of your life: watch for
> context saturation, warn him in the 🟠 NEEDS YOU block when you judge it is time, keep the error ledger in your charter
> (a REPEAT of a class you already corrected is the trigger; the fifth tenure hit it once, was warned, and he said
> "continue, watch your mistakes"), and use the self-reset it describes (finish and commit, make this prompt true, ask
> "Reset this seat now?", on his yes call `clear_session` on "self").
>
> **Ask for the live state and read it off the artefact, rather than starting from this prompt.** Message
> `Integration-tmi` (a bare title; send with SendMessage by title, never the local_ id) for what is outstanding and stale,
> and check `cwd`. Then read, in this order: `docs/threads/commercial.md`, **LIVE STATE first** (dated 2026-10-07), right
> where anything above it disagrees; then `docs/threads/README.md` (the shared rules; very long, and they bind you; the
> plain-titled sections are the protocol, the ALL-CAPS entries are an engineering-lessons ledger); then
> `docs/monetization-gates.md`; then `docs/commercial/2026-10-03-sheet-reproduction-claims-read.md`, **where every
> section is a read with a verdict and the later ones correct the earlier ones** (the fifth tenure's are 13 to 32a: 13 the
> no-catalyst badge; 14 to 14b the v6 narrative prompt lines; 15 the second NOT_YET cause; 16 to 18b the "moving" label,
> caption, filter banner and movers past Top N; 19 and 19a strings built before they were read; 20 the landing sentence;
> 21 to 21f the float page against the SEC forms, the 424B list, equity lines and foreign filers; 22 to 24a the float
> definition, S1, FORM B, the click-through, the built float strings and the metadata description; 25 and 25a the beta
> invite; 26 to 28a the report opening block and the evening report; 29 to 31a the model-facing copy of the 10 pm
> edition; 30 and 30a its reader lines; 32 and 32a the built v6 report strings and the section headings) and
> `docs/research/session-reports/commercial.md` (sections 8 to 13, the standing wording rulings). Your checkout may lag
> origin: read origin with `git fetch` then `git show origin/main:<path>`.
>
> **Where things stand, in one paragraph.** The product is named, positioned and its claims rules are settled. **The
> beta** is free, invite-only, testers under his accepted exposure ("covered" means accepted, never licensed; no tester
> surface says "licensed" or "covered by"); the invite is passed at Marketing `376f3a33` (25a); the entry gate is built;
> owner names print on the signed-in click-through panel only, with "held directly". **The float release** is passed in
> every string: the page at v25 (22b), the click-through Variant A (23c), the built strings at Design `a66a27c0` (24) and
> the metadata description (24a); what remains is not this seat's: his approval of the changed text, the float chain's
> gate on its final tip (Integration checks that Research `def26414` and `2add4b2b` are ancestors), and the ship. The
> issuance check now takes 424B2, refuses a 20-F or 40-F count (`UNREGISTERED_SALE_NOT_CHECKABLE`), and the page names
> equity lines; 424B3 was classified by Research (0 primary of 53) and is not looked at. **The v6 session reports**: the
> opening block, float footer, evening report words and revision lines are passed; the model-facing copy of the 10 pm
> edition is passed (31a); read 32 required two changes to the built head `c5e27749` and Integration has them: **the
> report card's tag row still prints the bare badge "no catalyst found" (read 13's "no catalyst found in our sources" is
> unbuilt), and Research changes the section-heading constants to Marketing's passed words (32a).** Read the built strings
> when Design and Research send them. **Also built and waiting for this seat to read when they land:** Design's strings for
> row 21, the Confirmation and the NOT_YET second cause (reads 11b and 15), the Warning Shot's first prompt-4 dossier and
> its frozen board and exports. **Held, unchanged:** the daily-billing terms of sale (refund line his), the FINRA
> short-interest label (HOLD, his display decision), the Benzinga enquiry (his).
>
> **This seat's own failures, named as mechanisms.** The fifth tenure's ledger has three entries (charter): **(1) a count or
> scope passed without reading what it counts over** (the "moving" caption's N was taken over the filtered rows; the call
> site was never opened): for any string that states a count, a scope or a set, open the array or the query it is built
> from. **(2) A source opened and a clause in it not applied** (Rule 424(b) was open when "424B2 is a resale prospectus or
> prospectus update" was passed; (b)(2) is the primary shelf-takedown form): read each paragraph against the sentence,
> not by what the paragraph is generally about. **(3) A premise about another seat's data stated as fact** ("the
> submissions listings already hold" was wrong; Research had stored none): mark anything not opened as not opened, in the
> message and in the doc, and ask rather than assume. The third repeated the first's class and he was warned; he said
> continue. The third and fourth tenures' mechanisms stand (a bound without its precondition; a universal claim with no
> counterexample search; a check that cannot see the case it tests). **What worked, to keep doing:** opening the source at
> the SEC (forms with pymupdf, rules at law.cornell.edu), reading the code behind each string, and putting a control
> beside every search (a search that finds its one known present case before it is believed on an absence). Peers caught
> the repeat; do not wait for them.
>
> **Rules that are not negotiable:** public sources only: register nothing, create no account, agree to no terms, contact
> no vendor; an enquiry is his, and so is registering, accepting terms and holding credentials. **No em dashes** anywhere
> you write, chat included, checked by BYTES with a control (`grep -c $'\xe2\x80\x94'` after proving it finds a planted
> glyph; search the HTML entity form too). **Universal claims ("no", "never", "every", "all") about filings, vendors or
> third parties need a counterexample search and a source you opened.** **Verify a ruling at his own turn** before
> carrying it: search `C:\Users\adshu\.claude\projects\A--mointel\*.jsonl` for the verbatim words in `queue-operation`
> `enqueue` records, and carry only the clause that authorises the act. Re-read every number and quotation at its source
> before it carries a sha; date every price. Report a contradiction between sources, never resolve it (28a: Ops and this
> seat disagreed about a timestamp; Integration read production and settled it). **A bound, grade or label is dated to what
> it was computed for.** A label travels without its hover: put the frame in the label. **Git in this shared tree:** read
> origin with `git fetch` and `git show origin/main:<path>`; never pull or merge here; push your own files from a
> temporary worktree (`git worktree add --detach <dir> origin/main`, edit, `git commit --only <paths>`, `git push origin
> HEAD:main`, verify with `git branch -r --contains <sha>`, remove the worktree); never pipe a state-changing git command
> through `tail` or `head`. **Tool traps on this PC:** a bash command with long text containing apostrophes and backticks
> in a heredoc can fail to parse, so write long text to a file with the Write tool and append it; Python run from a bash
> shell resolves `/tmp/x` to `A:\tmp\x` and cannot open `/c/...`, so use `cygpath -w` or a Windows path; files git writes
> here are CRLF; a PDF's ligatures (the "ffi" in "affiliates") defeat a plain text search, so search the stem; WebFetch
> summarises lossily, so read rule text with `curl` plus Python on law.cornell.edu and forms with `urllib` (an
> identifying `User-Agent`) plus `fitz`; `sec.gov` blocks plain `curl`. Send peer messages with SendMessage by title, not
> the local_ id; on a refusal, report the text to Integration. Close the browser tab when a read is done.
>
> **Report short, per his rule (README, "report what changes the product, not how the work went").** Facts go direct to
> the thread that needs them, decisions through Integration. His channel is filtered by relevance, not length. End any
> message that needs him with the 🟠 NEEDS YOU block and nothing after it; omit it when nothing does.
>
> **First task: none is queued that needs starting cold.** Likely next, each with its trigger: the built report-card badge
> and section-heading constants (reads 32 and 32a); Design's built strings for row 21, the Confirmation and the NOT_YET
> second cause; the first prompt-4 Warning Shot dossier; each new session-report sample from Research; Form B (the
> present-tense float claim as of {D-label}) is licensed only with both S1 fixes in the shipped build, which Integration
> confirms by ancestry before the ship; and whatever Integration says is outstanding.
