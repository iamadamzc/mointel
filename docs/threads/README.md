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
| **Research** | The interpreter, evidence collection, model spend | [research.md](research.md) |

## Why three and not two

Ops and Design are obviously different jobs. Research is split out because it is
what kept *interrupting* Ops: the OpenAI balance emptying, the 403 runaway jobs,
the retry policy. Those read as production incidents, but the fix is always in
`lib/research/`, and the decision is always about cost. It deserves its own
thread with its own budget in view.

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

Historical task prompts live in [`prompts/`](../../prompts). They are a record of
what was asked, not current instructions. Several are superseded.

## Facts every thread starts from

As of the last session, **2026-08-21**:

- Work is on branch **`session-aware-discovery`**, **53 commits ahead of
  `origin/main`**, pushed, tree clean apart from untracked docs. `main` is the
  old desk — never build or deploy from it.
- Production is **`32e47c9`**, schema **v21**, on Lightsail `98.85.49.227`
  behind CloudFront `https://dwwep02jje2ag.cloudfront.net/`, Basic Auth with two
  logins.
- Credentials live in `A:\AWS_creds\` — **outside the repo, and they stay there.**
  Never print, log, commit or move a credential value.
- Project memory is at `~/.claude/projects/A--mointel/memory/` — desk state,
  operations traps, deployment, and working style. It loads automatically only
  when the session's working directory is `A:\mointel`.

## Housekeeping

`docs/designaudit.md` is a byte-identical duplicate of
`docs/Design/designaudit.md`. `docs/Design/` is the canonical location and the
root-level copy should be deleted — left in place for now pending a decision.

`docs/Design/` is **untracked in git**. The audit report is the authority for
Phase 2, so it should be committed before that work starts.
