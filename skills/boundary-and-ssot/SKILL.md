---
name: boundary-and-ssot
description: >
  Use when adding or changing a data field, enum, predicate, validation rule,
  or any feature that crosses layer boundaries (DB schema, repository, API
  router, use case, background job, UI form, CSV/HTTP/webhook/env input).
  Forces validation at every trust boundary, one source of truth per rule,
  and full propagation of a field across all entry points and consumers.
  Prevents blind casts, duplicated logic between single/bulk or sync/async
  paths, half-implemented enums, untested branches, and broken cross-layer
  contracts.
---

# Boundary and Single Source of Truth

Every bug in this class has the same shape: a rule exists in one place, and a
second path reimplements it differently, or a boundary is trusted without
checking. Read this before touching a field, enum, or predicate.

## When this applies

Trigger on any of these:

- Adding/changing/removing a field on a domain entity or DB table.
- Adding an enum value, a predicate, a normalization, or a validation rule.
- A feature reachable from more than one entry point (single + bulk, HTTP +
  job worker, sync + async, CLI + API).
- Parsing data you did not create: DB rows, HTTP request bodies, CSV/upload,
  webhooks, env vars, LLM output, third-party API responses.
- A type or interface declares something the implementation does not honor.

## The gates

Work them in order. Each one names a real failure mode observed in review.

### 1. Validate at the boundary, never cast

Untyped external data is a trust boundary. A DB row, request body, CSV cell,
env var, or upstream API response enters as `unknown`. Parse it through a
validating decoder or type guard and fail loudly on mismatch.

Never assert across a boundary:

```ts
// Wrong: a corrupt row or changed column silently becomes a valid domain value.
segment: row.segment as LeadSegment
```

```ts
// Right: fail at the boundary, with the offending value in the error.
if (!isLeadSegment(row.segment)) {
  throw new Error(`Invalid segment from DB: "${row.segment}" for lead ${row.id}`)
}
const segment = row.segment
```

Applies to every boundary, not just the DB: IO schemas (zod/valibot) for API
input, decoders for env config, parsers for CSV and webhook payloads. If a
value arrives from outside this process, it is unvalidated until proven.

### 2. One rule, one function

A predicate, normalization, or validation lives in exactly one function.
Every path calls that function. If you find yourself writing the same
`.trim().toLowerCase()`, the same domain list, or the same "is this valid"
check in a second place, stop and extract it.

Name the function after the rule (`enrichLeadInput`, `detectSegment`), put it
where both callers can import it, and delete the inline copies.

### 3. Symmetric entry points

When two paths create or mutate the same entity, they must run identical
normalization and validation. Single capture and bulk import are the classic
pair; so are an HTTP handler and a queue worker.

Enumerate the paths before you touch the rule:

```bash
# Find every caller, do not assume there are two.
grep -rn "leadRepo.create\|captureLead\|bulkCapture" --include=*.ts
```

Then route all of them through the shared function. A rule applied on one path
and not the other is a bug that only shows up intermittently, which makes it
expensive.

### 4. No magic literals

Counts, ranges, thresholds, durations, and keys are named constants or read
from settings, once. A literal `3` that means "number of emails" and also
appears in a regex, a type, and a comparison is three bugs waiting to diverge.

```ts
// Wrong: three independent places encode the same assumption.
const prompt = rawPrompt.replace(/\b3-email\b/i, `${count}-email`)
const nextStage = (lead.stage + 1) as 1 | 2 | 3
if (nextStage > 3) { /* done */ }
```

```ts
// Right: one source, named, read once.
const emailCount = await settings.get<number>(SETTING_KEYS.PIPELINE_EMAIL_SEQUENCE_COUNT, 3)
const nextStage = lead.stage + 1
if (nextStage > emailCount) { /* done */ }
```

If a literal must be replaced in a string, replace all occurrences or better,
remove the literal from the string entirely and inject the value structurally.

### 5. Complete the declared domain, and build no presumptive surface (YAGNI)

YAGNI ("you aren't gonna need it"): do not build a capability before it is
needed. A *presumptive feature* is any code supporting something not yet
available for use. It carries four costs: build, delay, carry, and repair. Two
shapes fail this gate.

**Declared but unproduced.** A type declares N values, the implementation
handles N, or the type is narrowed. A declared value the code never produces is
dead surface a reader trusts and a test cannot cover.

```ts
export type LeadSegment = "talent" | "agency" | "enterprise"
```

If the detector only returns `talent` and `enterprise`, either implement
`agency` end to end (detection + storage + UI + test) or drop it from the type.
Same for status enums, stage unions, and reason codes.

**Speculative generality.** Abstractions, parameters, fields, exports, flags,
and config knobs added for a future need. The test: does it add complexity now
for something used later? If yes, delete it until a caller exists. An
extensibility point that is never used is not free: it is apt to get in the way.
Any abstraction that makes the code harder to understand for current
requirements is presumed guilty.

YAGNI does not license a bad codebase. It applies only to capability built for a
presumptive feature, never to effort that makes the software easier to modify.
Tests, refactoring, and continuous delivery are enabling practices, not YAGNI
violations. Never cite YAGNI to skip a guard, a test, or a cleanup.

### 6. Propagate across every layer

A field change is done only when all of these agree:

| Layer | Must reflect the field |
|---|---|
| Domain type | field + validating guard |
| DB schema | column + nullability |
| Migration | versioned SQL, applied, committed |
| Repository | read mapping + write mapping + guard |
| IO schema | input validation, required/optional |
| Use case | normalization, defaults |
| Job/worker | reads and writes the field |
| UI form(s) | required/optional matches the API |
| Other consumers | exports, reports, other services |

The upstream required/optional decision is binding downstream. If the API
makes a field optional, every form for it must accept empty. A form that
requires what the API made optional is a broken contract: the user cannot
submit valid data.

### 7. Test the branch you added

A new predicate value, a new enum branch, a new empty/null path is a branch
until proven. Add at least one case per new branch, plus the riskiest input
classes for that boundary: case/whitespace variation, empty string vs null vs
undefined, off-by-one at a range edge, and the duplicate/conflict path.

Do not delete or weaken an existing test to make a change pass.

## Verification before you call it done

1. List every entry point and confirm the shared rule runs on each.
2. Trace one real value end to end: input -> normalize -> validate -> persist
   -> read back -> guard -> consumer. Every hop agrees.
3. Run the changed path. A comment saying it compiles is not evidence.
4. Grep for the old inline copies; they must be gone, not deprecated.
5. For every new abstraction, parameter, field, export, or flag, name its
   current caller. No caller means remove it.

See `references/PATTERNS.md` for worked examples drawn from a real review.

## Anti-patterns, one line each

- `as` across a boundary: silent corruption. Parse or guard.
- Rule copied into a second path: guaranteed divergence. Extract it.
- Magic count/range/key: three places to forget. Name it.
- Declared capability, no producer (YAGNI): dead surface. Implement or narrow.
- Abstraction, parameter, or flag with no current caller (YAGNI): presumed
  guilty. Delete it until the caller exists.
- "We will need it later" as the only reason (YAGNI): you pay carry now. Wait.
- YAGNI invoked to skip a test, a guard, or a cleanup: wrong principle. YAGNI
  never covers work that makes the code easier to modify.
- Optional upstream, required downstream: unusable feature. Mirror it.
- New branch without a test: unknown behavior. Cover it.
