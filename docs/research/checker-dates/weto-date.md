# Report 50: which WETO date is true (2026-10-15)

*Research-tmi (local_dd23765d), for Integration 41st's question before the literal: is WETO's stored 2026-09-17T00:00:00Z placeholder a wrong date?*

**The launch was September 17, 2026.** The writer's "September 17" was right; the checker's "20:00 ET on 2026-09-16" was the ET conversion of a date-only placeholder.

## The primary source

Wetour Robotics' 6-K, accession 0001213900-26-101470, filed 2026-09-18 (accepted 21:00:01Z). Read from SEC EDGAR on 2026-10-15:
- `https://www.sec.gov/Archives/edgar/data/1941158/000121390026101470/ea030594101ex99-1.htm`
- The 6-K's exhibit list says "Press Release dated September 17, 2026".
- The exhibit's dateline reads "AUSTIN, Texas, Sept. 17, 2026 (GLOBE NEWSWIRE)".

These are research sources 93129 (the 6-K, EXACT at 2026-09-18T21:00:01Z) and 93163 (its EX-99.1, INFERRED at the same instant), as Ops read them from the box (`A:/mointel-scratch/weto-version.json` holds version 3439; Ops reported 3038's fields in message).

## Why the stored value is right

Version 3038's eventTimestamp 2026-09-17T00:00:00Z is the release's own calendar date, written as midnight UTC. No cited source carries that instant, so by `eventWhen` it is a date-only value, and its date is the stored one, September 17.

The release's time of day is not in the exhibit, and nothing in the sources says it went out in the evening. So no source makes it September 16.
