#!/usr/bin/env python3
r"""Does a live legal page show an unfilled [PLACEHOLDER] to the public?

Owned by Web. Run it after ANY change to docs/legal/*.md, and before any
submission that puts a reviewer on these pages.

WHY THIS IS NOT `curl | grep '\['`:

  The naive version returns ~90 hits on a page with ZERO placeholders. Next
  serves its RSC flight payload inside <script>, and that payload is dense
  with bracket-shaped JSON -- className arrays, chunk manifests, text-[13px].
  A check whose output is 90 lines of noise is a check nobody reads, and the
  one real hit hides in it. So: strip <script> and <style> FIRST, then strip
  tags, then scan what a person would actually see.

  It scans the RENDERING, not the source, on purpose. The source is the truth
  about the words; the rendering is the truth about what is published. A note
  written in bracket syntax inside the source was public for two days in
  September 2026 precisely because every check ran against a file.
"""
import html
import re
import sys
import urllib.request
from collections import Counter

PAGES = sys.argv[1:] or [
    "https://tmitrader.com/",
    "https://tmitrader.com/privacy",
    "https://tmitrader.com/terms",
]


def visible_text(url):
    req = urllib.request.Request(url, headers={"User-Agent": "placeholder-scan"})
    with urllib.request.urlopen(req, timeout=25) as r:
        src = r.read().decode("utf-8", "replace")
    body = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", src)
    text = html.unescape(re.sub(r"(?s)<[^>]+>", " ", body))
    return re.sub(r"[ \t]+", " ", text)


bad = 0
for url in PAGES:
    found = Counter(re.findall(r"\[[^\]\n]{0,80}\]", visible_text(url)))
    if found:
        bad += sum(found.values())
        print(f"FAIL {url}")
        for span, n in found.most_common():
            print(f"       {n:>2}x  {span}")
    else:
        print(f"ok   {url}")

# A placeholder on an ADOPTED document is published text nobody chose to
# publish. Exit non-zero so this can gate a release rather than be read.
sys.exit(1 if bad else 0)
