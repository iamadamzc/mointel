# Self-reset hook for mointel: what to add

*Integration-tmi (28th seat, `local_7df5566d`), 2026-10-05, on your "yes, write it up" (typed 2026-10-05T23:48:28.801Z).
The rule is in `A:\claude-infra-agent\docs\session-hygiene.md` section 3 ("Self-reset"). Adapted from Infra-Ops's v2
draft (`A:\claude-infra-agent\docs\on-clear-v2-draft.sh`, commit `1b1dcec`). Tested: the script below prints valid JSON,
and every prompt file it names exists.*

**INSTALLED 2026-10-05 by Integration on your "you do it":** both files below are in place and the hook was run as
configured (valid output). The steps are kept as the record of what was added.

## What it does

When a seat reaches a stopping point, or repeats a mistake, it saves its work, brings its opening prompt up to date and
asks you **"Reset this seat now?"**. On your yes it clears itself: same chat, same title, same address for the other
seats. When that chat starts again, this hook tells it to read its own opening prompt. You then type **go** (or a peer's
message starts it).

It does nothing for any chat whose title is not exactly a seat name: a new chat you open to paste a prompt, a
`-retired` chat, or a one-time check session just follow their own first message.

## Step 1: create the script

Create the file `A:\mointel\.claude\hooks\on-clear.sh` (make the `hooks` folder if it does not exist) with exactly this
content:

```bash
#!/usr/bin/env bash
# SessionStart hook (matcher "startup|clear"), mointel. In the desktop app a cleared session starts as "startup", so this
# runs on every new or cleared session in A:\mointel. It acts only for a session already titled exactly as a seat (a
# self-reset keeps its title); a new chat (app-generated title), a retired chat or any other session is told to ignore it.
# Adapted from Infra-Ops's v2 draft (A:\claude-infra-agent\docs\on-clear-v2-draft.sh, 1b1dcec). Rule: session-hygiene.md s3.
cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"SESSION START NOTE (runs on every new or cleared session in A:/mointel). Read your own title with mcp__ccd_session_mgmt__get_session on \"self\" (load it with ToolSearch if needed). If the title is EXACTLY one of these seat names, this seat was just reset (A:/claude-infra-agent/docs/session-hygiene.md section 3): you have no earlier conversation, so do not act on anything you think you remember; read your opening prompt and follow it, treating the message that started this turn as the start signal only. Ops-tmi: A:/mointel/docs/ops-opening-prompt.md. Design-tmi: A:/mointel/docs/design-opening-prompt.md. Research-tmi: A:/mointel/docs/research-opening-prompt.md. Web-tmi: A:/mointel/docs/web-opening-prompt.md. Commercial-tmi: A:/mointel/docs/commercial-opening-prompt.md. Marketing-tmi: A:/mointel/docs/marketing-opening-prompt.md. Integration-tmi: A:/mointel/docs/integration-opening-prompt.md. R&D-tmi: A:/mointel/docs/rnd-opening-prompt.md. If the title is anything else (including a title ending in -retired), ignore this note entirely and follow the message that started this turn."}}
EOF
```

## Step 2: add the settings entry

Create the file `A:\mointel\.claude\settings.json` (it does not exist today; `settings.local.json` is a different file,
leave it alone) with exactly this content:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear",
        "hooks": [
          {
            "type": "command",
            "shell": "bash",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/on-clear.sh\""
          }
        ]
      }
    ]
  }
}
```

The matcher must be `startup|clear`, not `clear` alone: in the desktop app a cleared chat starts as "startup" (Infra-Ops
proved this on both its seats on 2026-10-05).

## Step 3: check it

Open a new chat in `A:\mointel` and type anything. It should behave normally (its title is not a seat name, so it
ignores the note). The first real test is the first seat that asks you "Reset this seat now?".

## Notes

- Both files sit in the shared folder, so every mointel seat gets the hook at once. `settings.json` is not git-ignored;
  tell me if you want it committed so it survives a fresh checkout.
- A seat must make its opening prompt true **before** it asks to reset: the reset seat starts from that file alone.
- Hand-offs to a brand-new chat still work exactly as before, if you ever prefer one.
