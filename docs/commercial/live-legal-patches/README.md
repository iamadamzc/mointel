# Live legal text: two patches against production 296b6102 (Commercial-tmi, 2026-10-17)

Patches, not edits: `docs/legal/privacy-policy.md` and `terms.md` are served live and are adopted. These apply with `git apply` to a tree at `296b6102` and change only the lines shown. Nothing here is applied, adopted or shipped.

1. `2026-10-17-address-swap.patch`: the contact address becomes desk@tmitrader.com (privacy section 1, section 7, section 11; terms section 13). **Ordered by him** (Integration chat, uuid ef2e00fd, 2026-10-17T02:05:50.685Z: "commercial swap it everywhere"), so it goes to him as a list of changed lines and not a new approval.
2. `2026-10-17-llc-name.patch`: the operator's name becomes "Andromeda Genius LLC" (privacy section 1 and section 11; terms section 13), replacing "Andromeda Genius, Inc". The correction is of fact (the Texas filing and the IRS notice say LLC; read 151). **The exact words go to him as strings first**; the patch is not ordered. The form of the name (LLC, or the filing's long form) and the address are his attorney's.

Whether either change is "material" under the terms file's rule (a material redraft sends `adopted` back to null and puts a DRAFT banner on the live page) is his attorney's; neither changes what a reader is promised.

## Update 2026-10-17 (after his "developed by" word)

3. `2026-10-17-release-combined.patch`: the address swap and the LLC name with the "developed and operated by" wording, as one patch against `296b6102`. **Use this one for the release.** The two single patches overlap on the privacy policy's section 1 (the name patch now rewraps the three lines that also hold the old address), so they do not both apply cleanly; `2026-10-17-llc-name.patch` is kept as regenerated with the new wording, `2026-10-17-address-swap.patch` unchanged.
