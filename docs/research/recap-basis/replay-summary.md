# Recap basis replay: what changes (2026-10-15 UTC)

*Research-tmi (local_dd23765d). Change: `f75c38d4`, his yes (Integration chat uuid 3268cfdd): the recap picks its names by the prior close. Replay: `scripts/report-recap-basis-replay.ts`, read only, production's readRecapCounts (A:/mointel-cparty at 28e4dad7, identical narrative.ts to efa164e3) against this tree's, on the two local store copies. Full output: `replay.txt`. $1-$20.*

## The 50 percent movers that change, every recorded date (09-09 to 10-14; none before 09-09)

- **5 enter.** These names started in range and closed outside it:
  - WFF 10-14: $2.12 to $3.43, closed $0.175. It gave back the move, the case he asked about.
  - Four ran past $20 and kept half:
    - ELMT 09-14: $16.19 to $25.03
    - JAGX 09-22: $2.67 to $41.53
    - SRZN 09-24: $16.16 to $35.86
    - RPGL 10-01: $16.39 to $26.37
- **35 leave.** Every one started the day **under $1** and ran into the range. Examples:
  - MI 10-05: $0.894 to $10.42, closed $7.
  - DLXY 09-16: $0.415 to $4.45
  - PAAI 09-17: $0.90 to $3.47
  - BENF 09-23: $0.54 to $3.15
  - KNRX 09-28: $0.30 to $1.60
  - MEDS 09-15: $0.87 to $3.85
- **"Ran at least 50 percent" falls on 16 of the 21 dates with movers, rises on 2, and is unchanged on 3** (185 movers in all by the old basis, 155 by the new). For example: 09-16, 12 to 8; 09-17, 13 to 8; 09-30, 13 to 10; 10-05, 9 to 7; 10-06, 11 to 8.
- **"Gave the entire move back" changes on one date only:** 10-14, 0 to 1 (WFF).
- **Breadth** (counted names, up, down) moves by at most 24 names a day out of about 2,850, both ways.

## Why

His question named one side: "A stock that started the day inside $1-$20 would then stay counted however it closed". By the prior close, a stock that started the day under $1 is outside the range, however far it ran. Names that started under $1 and ran into the range were 35 of the 185 old-basis movers here. So the change removes far more movers than it adds.

## An option that keeps both

Count a name when **either** its prior close **or** its official close is in range: it started in range, or it ended in range. WFF is counted, and so are MI and the other 34. Nothing currently counted leaves.
- A name that started above $20 and fell inside (no mover in the replay did) stays counted, as today.
- The one sentence that can then mislead is "gave the entire move back": it counts a name under $1 at the close the same as one at $2. That is true of WFF under both options.

This is not built. It is his to choose.
