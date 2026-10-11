---
description: Check staged changes and planned commit split against commit-hygiene before committing
argument-hint: "[optional note about the change]"
---
Read the `commit-hygiene` skill, then audit the current work before it is committed. Context: $ARGUMENTS

Inspect `git diff --cached --stat` and `git diff --cached`. Report:

1. Scope: does the staged set span unrelated areas, formatting-only churn, or a refactor mixed with a feature? Name the files that belong in a separate commit.
2. Size: is the diff larger than a reviewer can read in one sitting? If so, propose the exact commit split by intent.
3. Secrets: any credential-shaped string, or any `.env*` file other than the example. Flag as an incident, not a nit; deleting later does not unshare it.
4. Message: Conventional Commits format, one type per commit, imperative subject, body explains why.
5. Scaffolding: throwaway scripts, scratch files, debug logging, or TODO stubs that should not ship.

Output a proposed commit plan: one line per commit, `type(scope): subject`, with the files each one should contain. Do not run `git commit`.
