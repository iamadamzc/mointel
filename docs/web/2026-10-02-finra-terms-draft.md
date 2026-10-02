# FINRA short interest: the end-user terms wording, and where the attribution goes

**Web, 2026-10-02 11:14 ET, against `692ce434`.** Owner of this file: **Web**.
Written on Integration's ask, from Commercial's finding at
[`../commercial/2026-10-02-short-interest-landscape.md`](../commercial/2026-10-02-short-interest-landscape.md)
section 10 (`88f2b7c9`).

> ## A DRAFT. NOT APPLIED TO `docs/legal/terms.md`, AND DELIBERATELY SO.
>
> **This is new binding text, which is a material redraft of a document he has
> adopted.** *Writing it into `terms.md` sets `adopted` to null, and `/terms`
> then renders the DRAFT banner to the public on the next deploy that carries
> it.* **A deploy ships its ancestry rather than an enumeration, so a commit
> sitting on `main` can put that banner on the live site before he has decided
> anything.** *So the text lives here until he adopts it, and the edit to
> `terms.md` plus his adoption happen in one motion.* **Drafting and
> re-adoption are one act; that is this seat's rule and it is the reason this
> file exists instead of a commit.**

---

## 1. WHAT I AM DRAFTING AGAINST, AND WHAT I HAVE NOT READ

**Commercial read FINRA's API Terms of Service and the Specific Terms for Equity
Data in full. I have not.** *This wording is built from Commercial's quotations
of clauses 2.2, 2.3 and 2.4, not from the contract.*

> **SO THE WORDING NEEDS COMMERCIAL'S CHECK AGAINST THE CLAUSE LANGUAGE BEFORE IT
> GOES TO HIM, NOT AFTER.** *A terms sentence that paraphrases a licence I have
> not opened is exactly the premise this desk keeps getting caught by.* **I have
> tracked FINRA's own phrase verbatim where the obligation is theirs, so the
> check is a comparison rather than a rewrite.**

**The four conditions in 2.3, and which of them is end-user text at all:**

| FINRA condition | is it a user obligation? | where it lands |
| --- | --- | --- |
| **(a)** FINRA named as owner and source, including of derived data | no, it is ours | **attribution, section 3** |
| **(b)** no fee or incremental fee for the Equity Data | **no, it is ours** | **Commercial's pricing, not the terms** |
| **(c)** end users may not redistribute further | **yes, and it already exists** | terms section 5, unchanged |
| **(d)** commercially reasonable efforts to bind end users | yes, by having the term at all | **the new sentence below IS this** |
| **2.3 cap** end users' non-commercial personal or professional use only | **yes, and this is the only genuinely new obligation** | **the new sentence below** |

**So exactly one new user obligation is needed.** *Everything else is either ours
or already written.* **That is why the change below is four sentences and not a
new section.**

---

## 2. THE PROPOSED TEXT

**Smallest change: one subsection appended to section 5, which is already the
home of what a user may and may not do with what the desk shows.** *No other
section is touched.*

### As it would read

```markdown
### Short interest, which comes from FINRA

The crowding label is our own calculation. The data behind it is owned and
published by FINRA, and FINRA is its source. Where the desk shows the label it
names FINRA and the settlement date the underlying figures belong to.

One limit is specific to it: you may use it for your own non-commercial personal
or professional use, and for nothing else. Trading your own account is that.
Building it into something you sell, or running a service on it for other
people, is not.

You also may not pass it on. That is this section already, and it applies to this
label exactly as it applies to everything else.
```

### Why it is worded this way

- **"non-commercial personal or professional use" is FINRA's own phrase**, taken
  verbatim so the obligation we pass on is the obligation we were given. *A
  paraphrase would risk binding users to more or less than the licence requires,
  and less is the dangerous direction.*
- **It is scoped to the label alone, not to the whole desk.** *Applying a
  non-commercial limit to everything would be a far larger change to what a
  paying user may do, and FINRA does not ask for it.* **A user paying to use the
  desk in their trading business is "professional use" and stays inside the
  phrase either way, which is worth knowing before anyone widens it.**
- **The third paragraph adds no obligation. It points at section 5.** *Without it
  a reader could infer that the FINRA paragraph is the complete set of limits on
  the label.*
- **It says the label is ours and the data is FINRA's**, which is what 2.4 and
  5.2 describe, and it does not claim the desk shows FINRA's figures, because
  his preference is the label only.

### What I deliberately did NOT write

- **No promise about accuracy or timeliness of the underlying data.** *Section 6
  already disclaims the lot, and a FINRA-specific disclaimer would read as a
  carve-out from it.*
- **No "we may withdraw this if FINRA withdraws it".** *Section 9 already lets
  access end and section 11 already governs changes; a data-source-specific
  clause invites one per source.*
- **Nothing about the fee condition.** *2.3(b) binds us, not the user. It belongs
  in pricing: the label rides inside the subscription with no line item and no
  add-on. Stating it in the user terms would be us promising the user something
  FINRA requires of us, which is the wrong party.*

---

## 3. WHERE THE ATTRIBUTION APPEARS

**2.3(a) requires FINRA named as owner and source of the data and of anything
derived from it. The label is the derived thing, so the naming has to travel with
the label rather than live only in the terms.**

| surface | string | owner |
| --- | --- | --- |
| **the label's own detail**, wherever a row's short interest is expanded | `Short interest: FINRA, settled <YYYY-MM-DD>.` | **Design** builds it, Web owns the words |
| **the board's persistent footer**, once | `Short interest data: FINRA. Shown as our own derived label, not FINRA's figures.` | **Design** builds it, Web owns the words |
| **terms section 5** | the subsection in part 2 | Web, on his adoption |

**THE SETTLEMENT DATE IS PART OF THE ATTRIBUTION, NOT DECORATION.** *Short
interest is a dated position and the label is only true as of that settlement
date.* **A label shown without it reads as current, which is a claim the data
cannot support.**

> **AND THE PUBLIC SITE GETS NOTHING, TODAY.** *The label is behind sign-in, so a
> stranger never sees it and there is nothing to attribute.* **The day any public
> copy cites the label, the attribution follows it there.** *A marketing page
> quoting a crowding grade is a display of derived FINRA data outside the signed-in
> product, and 2.3(a) does not stop at the login.* **That is the line someone will
> cross without noticing, so it is written here rather than left to be inferred.**

---

## 4. THE ORDERING, AND IT IS NOT A DETAIL

**THE LABEL DOES NOT EXIST. Checked rather than assumed: no `shortInterest`,
`short_interest` or `crowding` field anywhere in `lib/`, `components/`, `app/` or
`worker/`, and the string `FINRA` appears nowhere in the code at `692ce434`.**

**So this text must not be adopted and shipped before the label ships.** Three
reasons, in order of weight:

1. **It would put a DRAFT banner on the live `/terms` page for a feature that does
   not exist.** *Adoption goes to null the moment the text lands; the banner is
   public until he re-adopts.* **The public site would advertise an unsettled legal
   document and the product behind it would be unchanged.**
2. **A term binding users about a label they cannot see is a term about nothing**,
   and it invites the reasonable question of what else the terms describe that is
   not there.
3. **The attribution has nowhere to go yet.** *Both strings in section 3 attach to
   a label that no component renders.*

**RECOMMENDED SEQUENCE: he approves this wording now if he wants it settled, and
the `terms.md` edit, his adoption, the attribution strings and the label itself
all ride the same change.** *One deploy, one adoption date, and the public terms
and the product agree on the day they change.*

---

## 5. THE ONE THING THAT IS UNSETTLED, AND IT IS NOT MINE

**Commercial's section 10.3 item 1: clause 2.2 limits OUR OWN use to
"non-commercial personal or professional use", and a paid product computing a
label is arguably a commercial use by us.** *2.3(b) expressly contemplates
distributing the data inside a fee-liable product, which is the reading that
favours us, and no sentence resolves it.*

**That question decides whether this wording is ever needed, and it is his or
counsel's, not a seat's.** *This draft assumes the favourable reading, under the
accepted-exposure posture he already set for the feed licence.* **Recorded so
nobody reads an approved wording as evidence that the underlying question was
answered.**
