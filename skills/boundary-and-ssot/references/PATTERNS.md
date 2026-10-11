# Worked Examples

Real review findings. Each shows the defect, the fix, and the generalizable
lesson. Names are illustrative; the patterns are not.

## 1. Two entry points, two different normalizations

A lead can be created two ways: single capture and bulk CSV import. Both check
for a duplicate by email before inserting, but only bulk normalized the email
first.

```ts
// single capture
const existing = await leadRepo.findByEmail(input.email)   // raw, e.g. "A@X.com"

// bulk import
const normalizedEmail = input.email.trim().toLowerCase()    // "a@x.com"
const existing = await leadRepo.findByEmail(normalizedEmail)
```

`findByEmail("A@X.com")` does a case-sensitive lookup, misses the existing
`a@x.com` row, the insert passes the duplicate check, and the unique index
rejects it as a 500. The bug fires for some inputs and not others.

Lesson: two paths creating the same entity must share normalization. Extract
`enrichLeadInput` and call it from both; never let the single path keep its own
inline copy.

## 2. A count encoded in three places

`PIPELINE_EMAIL_SEQUENCE_COUNT` exists as a setting. Email count is also
encoded in a prompt string, a type, and a comparison.

```ts
const prompt = rawPrompt.replace(/\b3-email\b/i, `${sequenceCount}-email`)
```

`.replace` without the `g` flag changes only the first match. When the prompt
is later reworded so the literal no longer matches, the replacement silently
does nothing and the setting stops working with no error.

Then the far end:

```ts
const nextStage = (lead.stage + 1) as 1 | 2 | 3
if (nextStage > 3) { /* completed */ }
```

Setting the count to 5 makes the generator produce 5 emails while the send path
still stops at 3. Half the setting works; the other half is a hardcoded literal.

Lesson: remove the literal from the string and inject the value structurally;
read the count from one source at every site that depends on it. A count is a
named constant, never a regex match target and never a magic comparison.

## 3. A declared enum value that is never produced

```ts
export type LeadSegment = "talent" | "agency" | "enterprise"

export function detectSegment(input) {
  if (personalEmail) return "talent"
  if (!input.companyWebsite) return "talent"
  return "enterprise"
}
```

`agency` is a valid type, appears in the API enum, and is unreachable from
detection. Every reader assumes detection can produce it; no test covers it.

Lesson: a declared value the implementation cannot produce is dead surface.
Either implement the branch end to end (detection + persistence + UI + test) or
narrow the type. Do not ship the declaration alone.

## 4. Blind cast at the DB boundary

```ts
function mapRowToLead(row: any): Lead {
  return {
    segment: row.segment as Lead["segment"],
    stage: row.stage as Lead["stage"],
    replyStatus: row.replyStatus as Lead["replyStatus"],
  }
}
```

Any corrupt or unexpected value flows into the domain as a valid-typed value
and fails somewhere far away, or does not fail at all.

```ts
const segment = row.segment
if (!isLeadSegment(segment)) {
  throw new Error(`Invalid segment from DB: "${segment}" for lead ${row.id}`)
}
```

Lesson: a DB row is external input. Parse it through a guard at the boundary
and fail with the offending value in the message; never `as` across it.

## 5. Broken cross-layer contract

The API made a field optional — the whole point of the feature is accepting
records without it.

```ts
// router: optional, required only for non-talent segments
companyWebsite: z.string().url().optional()
.superRefine(...)   // required unless segment === "talent"
```

The web form for the same field stayed required:

```ts
// web form
companyWebsite: z.string().url("Valid website URL is required")
```

A user with no website cannot submit from the UI, so the feature is unusable
even though the API supports it. Server and client disagree, and only one was
updated.

Lesson: the upstream required/optional decision is binding downstream. When you
relax a field, update every form and client for it in the same change. Grep the
field name across the repo, do not assume one consumer.

## 6. A secret committed with the code

A `.env.development` file containing real API keys, an auth secret, and an
admin password was committed in the same change as the feature. Removing it in
a later commit does not unshare it: it is in history and in every clone and
remote it reached.

Lesson: only `.env.example` with placeholders is committed; `.env*` goes in
`.gitignore` before the first commit. If leaked, rotate the credentials first —
that is the actual remediation — then purge the file from history.

## Checklist

- Every boundary input parsed or guarded, never cast.
- Every shared rule lives in one function, called by every path.
- Every count, range, and key is named or comes from settings, once.
- Every declared enum value is produced, or the type is narrowed.
- Every field change propagated to schema, migration, repo, IO schema, job, and
  all forms; required/optional mirrored.
- Every new branch has a test.
- Secrets only as placeholders in an example file.
