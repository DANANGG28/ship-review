---
description: Plan-mode entry. Turn the change you are about to make into gate constraints and an exact commit split, before any code is written
argument-hint: "[what you intend to build or change]"
---
Read both the `boundary-and-ssot` and `commit-hygiene` skills, then produce a plan for: $ARGUMENTS

This runs in plan mode. Do not write or edit any file. Output two sections only.

## 1. Gate constraints for this plan

For each gate below, state whether this plan will touch it, and when it does, write the concrete rule the implementation must satisfy. Skip gates the plan provably cannot touch; do not pad.

- **Boundary validation.** Which new or changed values enter from outside the process (DB row, request body, CSV, webhook, env, LLM output)? Each gets a guard or decoder; no `as` across it.
- **One rule, one function.** Which predicate, normalization, or validation does this plan introduce? Name the single function that owns it.
- **Symmetric entry points.** Which paths create or mutate the same entity (single/bulk, HTTP/job, sync/async)? Each must call the shared function.
- **No magic literals.** Which counts, ranges, thresholds, keys, or strings does this plan hardcode? Name the constant or setting each reads from.
- **Complete declared domain.** Which enum, union, or status does this plan touch? Every declared variant needs a producer and a test, or narrow the type.
- **Cross-layer propagation.** For each new or changed field, list every layer that must change: domain type, DB schema, migration, repository read/write, IO schema, use case, job, every UI form. State required/optional once and mirror it.
- **Tests.** Which new branch needs a case? Name the branch and the riskiest input class.
- **Scope.** What is explicitly out of scope for this plan? Name the changes you will propose rather than land.
- **Secrets.** Will this plan introduce or move any credential-shaped file or value? Only placeholders may be committed.

## 2. Commit split plan

One line per commit, in order, each with the files it will contain and the Conventional Commit subject:

```
1. type(scope): subject        <- file list
2. type(scope): subject        <- file list
```

Split by intent: schema/migration separate from the code that uses it, refactor separate from behavior change, tests separate where they can stand alone, formatting never mixed with logic. Flag any step whose diff would be larger than a reviewer can read in one sitting, and split it further.

End with the single highest-risk item in this plan and the check that will prove it worked.
