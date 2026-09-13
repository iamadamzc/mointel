# Reaching the box without an inbound port: a proposal, not a change

*Scoped 2026-09-13 (Sunday evening ET) by Ops on his "yes" to scoping. Nothing here
has been built or enabled. Every fact below was read live on the day and is dated;
re-read before acting on any of them.*

## The problem, in one paragraph

SSH to `mointel-prod` is gated by a Lightsail firewall rule that admits a short
list of `/32` addresses. He travels. Twice in two days (Saturday hotel, Sunday
new wifi) a network change shut the door, and the only person who can approve
the rule edit is the one on the new network. Every seat's deploy, restart,
verification and read goes through that door. Meanwhile 80 and 443 keep
serving, so a shut door looks like a fine desk from outside and a dead one
from inside.

## What exists today, read on the box and in the account

```
2026-09-13 22:2xZ
instance     mointel-prod, ubuntu_24_04, medium_3_0, us-east-1a
account      239732580473, profile magellan_admin (user adam-magellan-admin)
tcp/22       46.26.37.254/32, 70.17.101.27/32, 95.17.57.244/32   (no cidrListAliases)
sshd         key-only, PasswordAuthentication no (asserted by bootstrap.sh)
ssm agent    amazon-ssm-agent 3.3.4793.0 (snap), service ACTIVE
ssm          NOT a managed node: describe-instance-information [] ; no activations
ssm tier     standard
```

The agent is already running. It is talking to nobody, because a Lightsail
instance is not an EC2 instance from Systems Manager's point of view and has
to be enrolled as a "hybrid" managed node.

## The three shapes it could take

### A. Lightsail browser SSH, scoped by alias — the cheap one

The Lightsail firewall accepts `cidrListAliases: ["lightsail-connect"]` on a
rule, which admits only the console's own browser-based SSH client. Adding
that alias to the port 22 rule means the **console** can always reach the box,
from any network, without a `/32` for wherever he is.

- **Cost:** none. One firewall edit, read-back, done.
- **Changes the auth model:** yes, slightly. Anyone who can sign in to the AWS
  console as `adam-magellan-admin` can open a shell as `ubuntu`. Today that
  person also needs the private key AND an allowlisted address. Console MFA
  becomes the gate.
- **What it does NOT solve:** the seats. This session, `push-release.sh`,
  `scp`, every read this desk takes — all use `ssh` with the key from a
  laptop. Browser SSH is for a human with a mouse. It is a way for HIM to get
  in when the door is shut; it does not reopen the door for the desk.
- **Verdict:** worth doing regardless, as a break-glass. Not the fix.

### B. Systems Manager Session Manager, hybrid activation — the real one

Enroll the box as a managed node. The agent (already installed, already
running) makes an **outbound** connection to Systems Manager; nothing inbound
is needed. From then on:

```
aws ssm start-session --target mi-XXXXXXXX --profile magellan_admin
```

opens a shell from any network. And with one `~/.ssh/config` stanza using
`ProxyCommand aws ssm start-session ... --document-name AWS-StartSSHSession`,
plain `ssh`, `scp`, and therefore `push-release.sh` **keep working unchanged**
against a host alias — key-only, as now, but tunnelled through SSM instead of
through port 22.

Then port 22 can be closed to the internet entirely, or left as a second path.

- **Steps (all his to authorise, none taken):**
  1. In the account: an IAM role for the managed node (`SSMServiceRole` trust
     for `ssm.amazonaws.com`, `AmazonSSMManagedInstanceCore`), and a hybrid
     activation (`aws ssm create-activation`) — yields an activation code + id.
  2. On the box, once: `sudo snap stop amazon-ssm-agent` →
     `amazon-ssm-agent -register -code ... -id ... -region us-east-1` →
     `sudo snap start amazon-ssm-agent`. The node appears as `mi-…`.
  3. ~~Raise the managed-instance tier to `advanced`~~ **MOOT: the tier was
     removed by AWS on 2026-06-30 (see Cost).** Nothing to change.
  4. On the laptop: install the Session Manager plugin for the AWS CLI; add
     the `ProxyCommand` stanza; point `push-release.sh` (or its caller) at
     the alias.
  5. Verify: a session from a network NOT in the port 22 rule. Then decide
     whether port 22 stays.
- **Cost, CORRECTED 2026-09-14 from AWS's own pages (Infra-Ops read it first;
  Ops re-read both pages the same day):** *"On June 30, 2026 we removed the
  Advanced Instances Tier, and you can now register any number of ... hybrid
  and multicloud nodes ... at no registration or per-instance charge."* And:
  *"Starting September 30, 2026 ... Session Manager $0.05 per session"* on
  hybrid nodes; no charge on EC2. **So step 3 below is moot — there is no tier
  to raise — and the recurring cost is five cents per session from
  2026-09-30, zero before.** The Session Manager prerequisites page no longer
  mentions a tier; it requires agent ≥ 3.0.222.0 for SSH sessions (the box
  has 3.3.4793.0), outbound 443 to `ssm`, `ssmmessages` and `ec2messages`
  endpoints, and `AmazonSSMManagedInstanceCore` on the activation's role.
  *The "$5/month" figure in the first draft was from memory and was wrong by
  the time it was written — the exact failure this desk records: a number
  carried instead of read.*
- **Changes the auth model:** yes, and this is the part to look at in
  daylight. Today the gate is *key AND address*. Under B the gate is *IAM
  identity* — whoever holds `magellan_admin` credentials, or any principal
  granted `ssm:StartSession` on that node, can open a shell. The private key
  still gates the SSH-over-SSM path, but the plain `start-session` shell does
  not need it. The `A:\AWS_creds` key and the `magellan_admin` profile live on
  the same laptop, so in practice the set of people who can get in does not
  change; what changes is that a leaked profile alone would now be enough.
  Mitigation is the ordinary one: MFA on the IAM user, or a role with a short
  session.
- **Operational trap to write down before enrolling:** the migrate and
  runtime units run under `ProtectSystem=strict`. The SSM agent runs as root
  in its own snap and is unaffected, but any command run *through* it that
  touches `/var/lib/mointel` is a root write to the store's directory — the
  same hazard as "Writing production as root is how a two-key repair becomes
  an outage" (ops.md, 2026-09-06). Sessions should `sudo -u mointel` exactly
  as ssh sessions do now. SSM does not change the rule; it changes how easy
  it is to forget it.
- **Verdict:** this is the fix. It removes the `/32` dance for every seat
  and every script, at the price of one IAM setup, a tier change, and a
  written acknowledgement that identity, not address, is the gate.

### C. A private overlay (Tailscale, WireGuard) — named so it is not re-proposed

Outbound-only, works from anywhere, keeps `ssh` unchanged. Adds a third party
or a self-run VPN endpoint to the trust chain of a production trading desk,
and another daemon on a box that this desk has fought for memory. AWS already
provides B natively in the same account. **Not recommended; recorded so the
next person does not spend an evening on it.**

## Recommendation

**Do A now** (zero cost, break-glass for him), **scope B for a quiet session
with him present** (the real fix, and an auth-model change he has to see made).
Keep the port 22 `/32` rule until B is verified from an off-list network; only
then decide whether to close it.

**Three gates added by Integration, 2026-09-13, taken as conditions:**

1. **The off-list verification is the test, not a step.** A session from an
   allowlisted address proves nothing, because SSH would have worked anyway.
   If no off-list network is available when the time comes, wait; do not
   substitute a reachable one.
2. **Do not close port 22 on the first success.** Run both paths in parallel
   until the new one has carried real work — a deploy, a restart verification,
   a read — not a handshake. Session Manager depends on an agent process, an
   activation that can expire, and an IAM role, each of which can fail quietly
   on a Tuesday morning.
3. **Say the trade in his words before the second yes:** today a bad network
   locks HIM out and the desk keeps serving; after closure an agent problem
   locks EVERYONE out, Ops included, with no fallback. Acceptable, not free.

**The spend is recurring per node, priced from AWS's own page with the date
attached, before he commits.** This is the first spend decision through the
infrastructure seat.

Neither is done. Nothing in this file is authorisation for anything.

## What each step needs from him

| Step | Needs |
| --- | --- |
| A: add `lightsail-connect` alias to port 22 | his yes; one firewall write; read-back |
| B1: IAM role + activation | his yes to an IAM change in 239732580473 |
| B3: advanced tier | ~~moot~~ — tier removed 2026-06-30; cost is $0.05/session from 2026-09-30 |
| B2 activation | `ssm:CreateActivation` is DENIED to the InfraOps role (simulated 2026-09-14); needs either his IAM grant to that role, or `magellan_admin` — his call which |
| B2, B4, B5 | Ops, once B1 and B3 exist |
| closing port 22 | a separate yes, after B5 |
