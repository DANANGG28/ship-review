---
description: Check a change for boundary validation, SSOT, magic literals, enum completeness, and cross-layer contract breaks
argument-hint: "[file, diff, or area to check]"
---
Read the `boundary-and-ssot` skill, then audit this change against it: $ARGUMENTS

If no target is given, audit the current working-tree diff (`git diff`) and any staged changes.

Work the skill's gates in order and report only what actually violates one:

1. Boundary validation: every value from a DB row, request body, CSV, webhook, env var, or upstream API is parsed or guarded, never cast with `as`.
2. One rule, one function: no predicate, normalization, or validation duplicated across paths.
3. Symmetric entry points: every path that creates or mutates the same entity runs the same shared rules.
4. No magic literals: counts, ranges, thresholds, and keys named once or read from settings.
5. Declared domain complete (YAGNI): every enum value has a producer, or the type is narrowed.
6. Cross-layer propagation: domain, schema, migration, repository, IO schema, job, and every UI form agree, including required/optional.

For each finding: `path:line` - which gate - what breaks - the concrete input that triggers it - the fix. Order by severity. If a gate passes, say so in one line; do not pad.
