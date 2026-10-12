"""Controls for the v7 writer tests: each edit must make the named test fail; the file's bytes are restored after.

Run from the worktree root: python -I scripts/writer-v7-controls.py
"""
import subprocess

SRC = 'lib/desk/reports/writerV7.ts'
TEST = 'tests/desk/reportWriterV7.test.ts'
CONTROLS = [
    ('C1 a CAUSAL connective missing from NEVER_JOIN', "'after', 'following', 'on', 'as', 'amid',", "'after', 'following', 'on', 'as',", 'CAUSAL'),
    ('C2 an opening missing from NEVER_OPEN', "'They', 'Both', 'Either'];", "'They', 'Both'];", 'LEANS_ON_ANOTHER'),
    ('C3 a v6 state phrase handed back in the sheet', "fresh: our sources found a fresh catalyst", "fresh news found in our sources", 'no v6 per-state phrase'),
    ('C4 an em dash in the system prompt', "never robotic.", "never robotic" + chr(0x2014) + ".", 'no em dash'),
    ('C5 a clock time in the sheet', "lines.push(`event date: ${eventDate}`);", "lines.push(`event date: ${eventDate} 07:00`);", 'never their clock'),
    # Commercial read 81 (REQUIRED): the desk's reading of significance stays out of the sheet.
    ('C6 whyTradersMayCare handed back', "    // whyTradersMayCare is NOT given",
     "    if (catalyst.whyTradersMayCare) lines.push(`what the desk makes of it: ${catalyst.whyTradersMayCare}`);\n    // whyTradersMayCare is NOT given",
     'reading of significance'),
]

for name, old, new, test_name in CONTROLS:
    original = open(SRC, 'rb').read()
    text = original.decode('utf-8')
    n = text.count(old)
    if n != 1:
        print(f'{name}: SITE MATCHED {n} TIMES, not run')
        continue
    open(SRC, 'wb').write(text.replace(old, new).encode('utf-8'))
    try:
        out = subprocess.run(['npx', 'vitest', 'run', TEST], capture_output=True, text=True, encoding='utf-8', errors='replace', shell=True)
    finally:
        open(SRC, 'wb').write(original)
    text_out = out.stdout + out.stderr
    hit = any(test_name in line for line in text_out.splitlines() if '×' in line or 'FAIL' in line)
    restored = open(SRC, 'rb').read() == original
    print(f'{name}: exit {out.returncode}; the expected test failed: {hit}; restored {restored}')
