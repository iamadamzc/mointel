# Working threads

One chat per thread. This folder exists because a single session carrying a
production incident, a UI phase and an AWS deploy at the same time stopped being
readable — for the operator and for the model.

Each thread has a charter below. Open a chat **with `A:\mointel` as the working
directory** so `CLAUDE.md`, `AGENTS.md` and the project memory load on their own,
then paste that charter's opening message.

| Thread | Owns | Charter |
| --- | --- | --- |
| **Ops** | The live desk, AWS, deploys, incidents | [ops.md](ops.md) |
| **Design** | The trader-facing UI, the audit remediation | [design.md](design.md) |
| **Research Pipeline** | The interpreter, evidence collection, model spend | [research.md](research.md) |
| **R&D** | Standing analysis capability — the question register, the archive, the tape research | [rnd.md](rnd.md) |
| **Coaching** | Daily fills, execution against the playbook | [coaching.md](coaching.md) |
| **Integration** | The charters, the seams, cross-thread decisions | [integration.md](integration.md) |

## Why six

Ops and Design are obviously different jobs. Research is split out because it is
what kept *interrupting* Ops: the OpenAI balance emptying, the 403 runaway jobs,
the retry policy. Those read as production incidents, but the fix is always in
`lib/research/`, and the decision is always about cost. It deserves its own
thread with its own budget in view.

**R&D was split from the Research Pipeline on 2026-08-23**, and the reason is the
same one that split Research from Ops. `lib/research/` is plumbing that generates
incidents — empty balances, runaway jobs, retry policy. The market-structure
question is open-ended research. A thread holding both will always spend its
time on the incidents, because incidents have deadlines and questions do not.
The pipeline's job is honest catalyst grades at a defensible cost; what those
grades mean is R&D. R&D also owns the tape research in a different repo
entirely.

R&D is deliberately a **standing capability rather than a project**. The desk
should always be learning something and the subject will change; today's
catalyst question is one entry in a register, not the thread's purpose. New
questions can be posed, spawned by a closed one, or surfaced by the standing
sweep. A question large enough to need phases gets a **directory and a spec**,
never its own chat — sub-threads per discovery is how this list doubles and
nothing is legible again.

Coaching was added the same day. It is the only thread about the trader rather
than the market, it runs daily rather than by project, and it is the one
carrying personal financial records — which need handling the others never think
about. It shares exactly one thing with R&D: tier C of the archive.

Integration was added 2026-08-23 and does **no product work**. It exists because
three problems in two days belonged to no thread: a working-tree collision, a
false safety claim sitting in a charter, and a hazard spanning a systemd unit
and a prune script. Splitting work created a gap between the pieces, and that
gap needed an owner.

## Sharing one working tree

Every thread works in `A:\mointel`. Rules, in order of how much they matter:

1. **Never `git add -A` or `git add .`** Stage by explicit path. This one rule
   would have prevented every incident so far.
2. **One thread holds uncommitted code at a time.** Commit or stash before
   handing back. Concurrent docs edits are fine.
3. **Deploys are safe regardless** — `push-release.sh` ships a committed sha via
   `git archive`, so uncommitted work cannot reach production. The risk is to
   *gates*: `npm test` against a half-edited `package.json`.
4. **A worktree when two threads must genuinely build at once.** Robust, but it
   needs its own `node_modules`. Reach for it when rule 2 becomes the
   bottleneck.

## The rule that keeps them separate

A thread that finds work belonging to another **writes it down and hands it
over** rather than doing it. Add it to the other charter's *Open items*, say so,
and stop. The exception is a live production emergency, which Ops always owns
outright.

Only Ops deploys. Design and Research produce commits; Ops puts them on the
server. This is deliberate — the deploy gate has checkpoint windows and pin
rules that a thread focused on a component will not have in mind.

## Shared state, single source of truth

Do not restate these in a thread doc; link to them.

| Subject | Document |
| --- | --- |
| System shape, layer rules, non-goals | [../ARCHITECTURE.md](../ARCHITECTURE.md) |
| Running the desk, checkpoints, health, rough edges | [../OPERATIONS.md](../OPERATIONS.md) |
| The server, logins, deploys, rollback, backups | [../AWS_DEPLOYMENT.md](../AWS_DEPLOYMENT.md) |
| The research build plan and its phase gates | [../RESEARCH-MILESTONE-PLAN.md](../RESEARCH-MILESTONE-PLAN.md) |
| The UI/UX audit — the design authority | [../Design/design-audit-report.md](../Design/design-audit-report.md) |
| The market archive — calls, outcomes, and what gets kept | [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) |
| The trading strategy every threshold derives from | `A:\extract_daytrade\Manual\DAY_TRADING_INSTRUCTION_BOOKLET.md` |

Historical task prompts live in [`prompts/`](../../prompts). They are a record of
what was asked, not current instructions. Several are superseded.

## Who this is for

Every threshold, ranking and label in this product serves one trading style, and
a thread that does not know it will make decisions that look reasonable and are
wrong. The full playbook is
`A:\extract_daytrade\Manual\DAY_TRADING_INSTRUCTION_BOOKLET.md` — Ross Cameron
style small-cap momentum. Read it before designing anything user-facing or
choosing what to measure.

The short version, and where live practice differs from the booklet the live
practice governs:

- **Small caps, $1-$20, RVOL 2-5+.** The desk is already configured to these
  numbers, not the booklet's $2-$20 and 5x.
- **Hold time is seconds, at most 1-2 minutes.** Risk $0.15-$0.25 per share.
  A one-minute candle is wider than the whole trade — remember this before
  proposing any measurement at minute grain.
- **07:00-10:00 ET is where the profit is**; after 11:00 is avoided. Exceptions:
  dip trades, and RTH when there is a strong mover.
- **Entry** is a micro pullback on rising volume, plus flat top, ABCD and VWAP
  reclaim. **Absorption is a gate, not a trigger** — stay out while a large
  presence sits unconsumed on the tape.
- **Exit** is weakness: volume fading on 10-second candles, price reversing, or
  satisfaction with the gain.
- **The five pillars** — up 10%+, $2-$20, 5x RVOL, breaking news catalyst, float
  under 10M — are the selection rule the product encodes. **Pillar 4 is
  currently breaking**, and understanding why is what
  [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) exists for.

Terminology is trader-facing. Labels describing engine internals get rejected.

## Facts every thread starts from

As of the last session, **2026-08-23**:

- **`main` is the trunk and the only branch.** The long-lived
  `session-aware-discovery` branch was fast-forwarded into it on 2026-08-23 and
  deleted; nothing was lost. If you find a session assuming `main` is stale,
  that assumption expired.
- Production is **`fd9556f`**, schema **v21**, on Lightsail `98.85.49.227`
  behind CloudFront `https://dwwep02jje2ag.cloudfront.net/`, Basic Auth with two
  logins.
- **The Google Sheet is written by four ChatGPT scheduled tasks, not by the
  trader** — 22:00, 06:10, 09:25 and 16:15 ET on weekdays. He has never
  reviewed anything in it and does not write to it. The desk reads it
  read-only and nothing in this repo writes back, so it is a live input
  produced outside the system that no charter owned until 2026-08-23. It is
  substantial rather than empty — 204 research rows, 148 graded outcomes, nine
  dated tabs — and the product labels its output *human review*, which is the
  part that is false. Three of those four times are this desk's own
  checkpoints, inherited from the same workflow. Open in
  [research.md](research.md) item 5 and audit §11 item 1.
- **Retiring the Sheet takes pillar 5 with it unless float is replaced first.**
  `resolveDisplayedFloat` (`lib/dashboard/merge.ts:143`) has exactly two
  branches, the Sheet's RESEARCH tab and its TODAY tab, and the type says so:
  `displayedFloatSource: 'RESEARCH' | 'TODAY' | null`. **Every float on the desk
  is the Sheet's.** Float under 10M is one of the five pillars, and
  `displayedFloatTurnover` and part of `risk.ts` hang off the same number. The
  migration decision of 2026-08-23 was taken before anyone knew this. It is not
  a reason to reverse it — it is a **precondition** on sequencing.
  **The replacement is part-built and deliberately paused.** Research shipped
  the reported share count into the bundle and a `supplyBound` that settles the
  supply question without a float at all (`55f3e20`, live in `c73eb9d`). The
  actual derived float — Section 16 and 13D holdings — is **unstarted by
  choice**: the bound may answer the trading question often enough that an
  estimated float is not worth its error bars, and the affiliate-versus-passive
  question is unsettled (13G filers are passive institutions and their shares
  are float). So the Sheet cannot be removed yet, and nobody is currently
  working toward removing it. That is a reasonable call, not a stall — but it
  is a pause, and a reader of this line was previously told scoping was under
  way.
- Credentials live in `A:\AWS_creds\` — **outside the repo, and they stay there.**
  Never print, log, commit or move a credential value.
- Project memory is at `~/.claude/projects/A--mointel/memory/` — seven files:
  desk state, operations traps, deployment, how the trader works, how he
  *trades*, the catalyst structure break, and the viscosity research. The last
  three moved in on 2026-08-23 from a project keyed to `A:\`, where no thread
  could see them. `MEMORY.md` is the index. It all loads automatically only
  when the session's working directory is `A:\mointel` — which is why a chat
  opened at `A:\` is working blind.

## Housekeeping

Both settled on 2026-08-23 in `c8f95a3`: `docs/Design/` is committed, and the
duplicate `docs/designaudit.md` is gone. `docs/Design/` is the canonical home
for design documents.
