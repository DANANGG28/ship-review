---
description: Full ship review of the current change or PR against all nine gates
argument-hint: "[PR URL, path, or area; empty = current diff]"
---
Read both the `boundary-and-ssot` and `commit-hygiene` skills, then run the complete nine-gate review on: $ARGUMENTS

If no target is given, use the current working-tree diff and the branch's commits.

Gates:

1. SSOT across entry points: one shared rule per operation; no duplicated normalization or validation between single/bulk, sync/async, HTTP/job.
2. Enum and union completeness, no presumptive surface (YAGNI): every declared variant has a producer and a test, or the type is narrowed; every new abstraction, parameter, field, export, or flag has a current caller. Cite YAGNI only against presumptive capability, never against a test, a guard, or a cleanup.
3. Correct layer, no fakes: the fix is in the layer that owns the rule; no regex or magic-string substitution standing in for a structural fix; no lying cast at a boundary.
4. Boundary validation and existing error taxonomy: parse or guard every external input; reuse the project's typed errors (`badRequest`, domain errors) instead of generic `Error`.
5. End-to-end reachability: form -> router -> use case -> repository -> DB -> consumer; required/optional mirrored at every hop.
6. Secrets: only placeholders committed; `.env*` excluded; a leaked credential is rotated, not just deleted.
7. Atomic conventional commits: one logical change per commit, reviewable diff, no drive-by refactor or formatting.
8. Verified claims: every "it works" is backed by a run, a test, or a recorded observation; no assertion dressed as evidence.
9. Scope discipline: only what was requested; product or business-logic changes proposed, not landed.

Output a numbered findings list. Per finding: gate number, `path:line`, what breaks, the triggering input, severity (HIGH/MEDIUM/LOW), and the fix. End with a one-line verdict and the single most important next action. Do not edit files unless asked.
