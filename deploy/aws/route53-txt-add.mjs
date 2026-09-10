/*
 * Adds ONE value to a Route 53 TXT record set without destroying what is
 * already there.
 *
 *   node deploy/aws/route53-txt-add.mjs <zone-id> <name> <value> [--profile P] [--ttl N]
 *   node deploy/aws/route53-txt-add.mjs ... --dry-run
 *
 * WHY THIS EXISTS RATHER THAN A ONE-LINE `aws route53 change-resource-record-sets`.
 *
 * Route 53 groups records by (name, type), so EVERY TXT value at a name lives
 * in ONE record set. `UPSERT` replaces that set entire. So the obvious command
 * -- upsert TXT with the value you want -- silently deletes every other TXT
 * value at that name.
 *
 * At the apex that is not hypothetical. A Search Console verification token and
 * an SPF record are both apex TXT. Publishing SPF later with a bare UPSERT
 * removes the verification, and Google's own page says: "To stay verified,
 * don't remove the DNS record from your provider, even after verification
 * succeeds." The site silently loses verification and nothing reports an error.
 *
 * THE FIRST WRITE IS THE ONLY ONE THAT IS SAFE BY ACCIDENT. When the set is
 * empty, a bare UPSERT and a union are the same thing -- which is exactly why
 * writing the bare version first is how the destructive version gets reused.
 * So this does read-append-union even against an empty set.
 *
 * QUOTING. Route 53 TXT values are quoted strings. An unquoted or mis-split
 * value is a SILENT failure: the record exists, the verification never passes,
 * and no error is raised anywhere. So the value is quoted here, and read back
 * afterwards and compared byte for byte against what was asked for.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const [zoneId, recordName, value] = args.filter((a, i) =>
  !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && args[i - 1] !== '--dry-run'),
);
const profile = flag('--profile', 'management-admin');
const ttl = Number(flag('--ttl', '300'));
const dryRun = args.includes('--dry-run');

if (!zoneId || !recordName || !value) {
  console.error('usage: route53-txt-add.mjs <zone-id> <name> <value> [--profile P] [--ttl N] [--dry-run]');
  process.exit(2);
}

const aws = (...a) =>
  execFileSync('aws', ['--profile', profile, '--output', 'json', ...a], {
    encoding: 'utf8',
    env: { ...process.env, AWS_PAGER: '' },
  });

const fqdn = recordName.endsWith('.') ? recordName : `${recordName}.`;
const quoted = `"${value}"`;

// ---- read what is there now -------------------------------------------
const sets = JSON.parse(
  aws('route53', 'list-resource-record-sets', '--hosted-zone-id', zoneId,
      '--query', `ResourceRecordSets[?Type=='TXT' && Name=='${fqdn}']`),
);
const existing = sets.length > 0 ? sets[0].ResourceRecords.map((r) => r.Value) : [];

console.log(`[txt] zone ${zoneId}  name ${fqdn}`);
console.log(`[txt] existing values: ${existing.length}`);
for (const v of existing) console.log(`[txt]   ${v}`);

if (existing.includes(quoted)) {
  console.log('[txt] value is already present — nothing to do.');
  process.exit(0);
}

/*
 * The union, existing first. Order is not semantically meaningful to a TXT
 * consumer, but keeping what was there ahead of what is new makes a diff of two
 * read-backs legible.
 */
const union = [...existing, quoted];
const batch = {
  Comment: `add TXT value (${union.length} total) — additive, preserves existing`,
  Changes: [{
    Action: 'UPSERT',
    ResourceRecordSet: { Name: fqdn, Type: 'TXT', TTL: ttl, ResourceRecords: union.map((Value) => ({ Value })) },
  }],
};

console.log(`[txt] will write ${union.length} value(s): ${existing.length} kept + 1 new`);

if (dryRun) {
  console.log('[txt] --dry-run: nothing written.');
  console.log(JSON.stringify(batch, null, 2));
  process.exit(0);
}

const file = path.join(os.tmpdir(), `r53-txt-${Date.now()}.json`);
fs.writeFileSync(file, JSON.stringify(batch));
let changeId;
try {
  const out = JSON.parse(
    aws('route53', 'change-resource-record-sets', '--hosted-zone-id', zoneId,
        '--change-batch', `file://${file}`),
  );
  changeId = out.ChangeInfo.Id;
  console.log(`[txt] change submitted: ${changeId}  status=${out.ChangeInfo.Status}`);
} finally {
  fs.rmSync(file, { force: true });
}

// ---- read back and compare byte for byte ------------------------------
const after = JSON.parse(
  aws('route53', 'list-resource-record-sets', '--hosted-zone-id', zoneId,
      '--query', `ResourceRecordSets[?Type=='TXT' && Name=='${fqdn}']`),
);
const got = after.length > 0 ? after[0].ResourceRecords.map((r) => r.Value) : [];

console.log(`[txt] read-back: ${got.length} value(s)`);
for (const v of got) console.log(`[txt]   ${v}`);

const lost = existing.filter((v) => !got.includes(v));
if (lost.length > 0) {
  console.error(`[txt] FAILED: ${lost.length} pre-existing value(s) were destroyed:`);
  for (const v of lost) console.error(`[txt]   LOST ${v}`);
  process.exit(1);
}
if (!got.includes(quoted)) {
  console.error(`[txt] FAILED: the new value is not in the read-back.`);
  console.error(`[txt]   asked for: ${quoted}`);
  process.exit(1);
}
console.log('[txt] verified: new value present byte-for-byte, nothing pre-existing lost.');
console.log(`[txt] change id: ${changeId}`);
