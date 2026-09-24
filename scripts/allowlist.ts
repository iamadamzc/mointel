/**
 * The invited-email allowlist, as an agent-invokable admin.
 *
 *   tsx scripts/allowlist.ts list
 *   tsx scripts/allowlist.ts invite <email> --authority "his exact words"
 *   tsx scripts/allowlist.ts revoke <email> --authority "his exact words"
 *
 * His ruling (D6): an agent-invokable admin, not a CLI to sit in front of and
 * not a web UI. So this is script-shaped and takes everything on the command
 * line. It runs on the box the same way `worker/basis-backfill.ts` does:
 *
 *   ssh mointel-ssm 'sudo systemd-run --pipe --wait --collect --quiet \
 *     --uid=mointel --property=WorkingDirectory=/opt/mointel/current \
 *     --property=EnvironmentFile=/etc/mointel/mointel.env \
 *     /usr/bin/node node_modules/tsx/dist/cli.mjs scripts/allowlist.ts list'
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHAT THE GUARDRAIL IS, AND WHAT IT IS NOT.
 *
 * Web's objection, and it is correct: an agent that grants desk access is an
 * agent that can effectively spend his money. So an invitation is treated like
 * a spend — HIS explicit, per-invitation word, never relayed through a seat.
 *
 * BUT A CHECK INSIDE A SCRIPT CANNOT ENFORCE THAT, because the agent runs the
 * script. A check it can see is a check it can pass. Anything here that looked
 * like it made the rule technical would be worse than nothing: it would buy
 * confidence without buying safety.
 *
 * So the rule lives on the authority list beside spend, restarts and credential
 * entry, and what is HERE is only the part a script can actually hold:
 *
 *   one address per invocation   no batch, no list, no wildcard, no "invite all"
 *   --authority is REQUIRED      his words, stored on the row, so no grant is
 *                                anonymous and every one can be traced later
 *   default deny                 an address not named is not invited
 *   soft delete                  revocation is a comparison, never a delete, so
 *                                the record survives the withdrawal
 *
 * Those make a careless grant hard and an untraceable grant impossible. They do
 * not make an unauthorised one impossible, and this file does not pretend to.
 * ──────────────────────────────────────────────────────────────────────────
 */
import {
  inviteEmail,
  isEmailInvited,
  listInvitedEmails,
  openIdentityStore,
  revokeEmail,
} from '../lib/auth/store';

function die(message: string): never {
  console.error(`[allowlist] ${message}`);
  process.exit(2);
}

/**
 * Rejects anything that is not a single ordinary address.
 *
 * The wildcard check is not theatre: "invite everyone at this domain" is the
 * shape of an accidental mass grant, and it is easier to refuse the characters
 * than to reason later about what was matched.
 */
function requireOneAddress(values: string[]): string {
  if (values.length === 0) die('no address given. One address per invocation.');
  if (values.length > 1) {
    die(
      `${values.length} addresses given. ONE per invocation, deliberately: ` +
        'a batch grant is the shape of an accidental one.',
    );
  }
  const email = values[0];
  if (email.includes('*') || email.includes('%')) {
    die(`refusing a wildcard address: ${email}. Name the person.`);
  }
  if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
    die(`not an address: ${email}`);
  }
  return email;
}

/**
 * His words, stored on the row.
 *
 * A grant with no attribution cannot be reviewed afterwards -- "who let this
 * person in" is the first question anyone asks, and a blank column answers it
 * with a shrug. The placeholder check exists because the obvious way to satisfy
 * a required argument is to type the argument's own name into it.
 */
function requireAuthority(value: string | undefined, action: string): string {
  if (!value || !value.trim()) {
    die(
      `--authority is required to ${action}. Quote HIS instruction: an invitation ` +
        'is a grant of access to the desk and comes from him directly, never relayed.',
    );
  }
  const trimmed = value.trim();
  if (/^(authority|reason|his word|ok|yes|n\/a|-)$/i.test(trimmed)) {
    die(`--authority "${trimmed}" says nothing. Quote what he actually said.`);
  }
  return trimmed;
}

function main(): void {
  const argv = process.argv.slice(2);
  const action = argv[0];

  let authority: string | undefined;
  const positional: string[] = [];
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--authority') {
      authority = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--authority=')) {
      authority = arg.slice('--authority='.length);
    } else if (arg.startsWith('--')) {
      die(`unknown option ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  // Refuses a release-directory path; see lib/auth/store.ts.
  const db = openIdentityStore(process.env.IDENTITY_DB_PATH);

  try {
    if (action === 'list') {
      const rows = listInvitedEmails(db);
      if (rows.length === 0) {
        console.log('[allowlist] no invitations. Nobody can sign in.');
        return;
      }
      for (const row of rows) {
        const state = row.revokedAt ? `REVOKED ${row.revokedAt}` : 'invited';
        const who = row.revokedAt ? row.revokedBy : row.invitedBy;
        console.log(`  ${row.email.padEnd(34)} ${state.padEnd(34)} ${who ?? '(no authority recorded)'}`);
      }
      console.log(`[allowlist] ${rows.length} row(s); ${rows.filter((r) => !r.revokedAt).length} can sign in.`);
      return;
    }

    if (action === 'invite') {
      const email = requireOneAddress(positional);
      const why = requireAuthority(authority, 'invite');
      const row = inviteEmail(db, email, why);
      console.log(`[allowlist] INVITED ${row.email}`);
      console.log(`[allowlist] authority: ${why}`);
      return;
    }

    if (action === 'revoke') {
      const email = requireOneAddress(positional);
      const why = requireAuthority(authority, 'revoke');
      const before = isEmailInvited(db, email);
      const result = revokeEmail(db, email, why);
      if (!before && result.sessionsEnded === 0) {
        console.log(`[allowlist] ${email} was not invited; nothing to withdraw.`);
        return;
      }
      console.log(`[allowlist] REVOKED ${email}`);
      console.log(`[allowlist] live sessions ended: ${result.sessionsEnded}`);
      console.log(`[allowlist] authority: ${why}`);
      return;
    }

    die('usage: allowlist.ts list | invite <email> --authority "..." | revoke <email> --authority "..."');
  } finally {
    db.close();
  }
}

main();
