---
name: commit-hygiene
description: >
  Use when creating git commits, splitting work into commits, or preparing a
  pull request. Enforces one logical change per commit, small reviewable
  diffs, Conventional Commits format, no unreviewed mass commits, no drive-by
  refactors or formatting, no committed secrets, and no product scope creep.
  Prevents the failure mode where a single giant first commit makes a PR
  unreviewable and hides secrets.
---

# Commit Hygiene

A commit is a review unit and a revert unit. If either use is painful, the
commit is wrong. This skill is checked at `git commit` time and when opening
or reviewing a PR.

## When this applies

- Before `git commit`.
- When deciding how to split a piece of work.
- When opening, updating, or reviewing a PR.
- When a diff grows past a few hundred changed lines.

## Rules

### 1. One logical change per commit

If the subject needs "and", it is two commits. Split by intent:

- scaffold vs feature,
- schema/migration vs the code that uses it,
- refactor vs behavior change,
- tests for a feature vs the feature,
- formatting vs logic.

Reviewers read commits in order. A commit they can hold in their head is a
commit they can approve; a commit they cannot is one they rubber-stamp, which
defeats the review.

### 2. Keep the diff reviewable

A reviewer must be able to read the commit diff in one sitting. Changed-line
count is the signal; a first commit carrying thousands of lines across dozens
of files is a red flag regardless of quality.

Before committing, check what you are about to include:

```bash
git diff --stat HEAD
git diff --stat --cached
```

If the staged diff spans unrelated areas, unstage and commit in slices. If a
file was only touched for formatting, revert it:

```bash
git checkout -- path/to/unrelated-file.ts
```

### 3. Conventional Commits

The format spec lives in the `conventional-commits` skill; read it for the full
grammar. The short form: `<type>(<scope>): <subject>`, imperative mood,
lower-case subject, no trailing period. Types: `feat`, `fix`, `refactor`,
`test`, `docs`, `chore`, `build`, `ci`, `perf`, `style`.

```
feat(leads): detect agency segment from recruitment domains
fix(email): read sequence length from settings instead of hardcoded 3
refactor(lead): share enrichment between single and bulk capture
```

If a change conforms to more than one type, split the commit until each has
one type. The body explains why, not what. Reference the issue/task.

### 4. Stay inside the requested scope

Implement what was asked. Drive-by changes violate rules 1, 2, and 5 at once:

- Full-file reformatting, import reordering, quote-style churn.
- Renaming unrelated symbols.
- Refactoring unrelated modules "while here".
- Rewriting product/business logic the request did not ask you to change.

If you believe a larger change is right, propose it in the PR description or
ask first. Do not land a rewrite inside a feature commit. Deleting code a
migration made obsolete is in scope; unrelated cleanup is not.

### 5. Never commit secrets

Only `.env.example` (or equivalent, with placeholder values) is committed.
`.env`, `.env.*`, and any real credential file stay out. Add them to
`.gitignore` before the first commit that could include them.

Before committing, scan the staged diff for credential-shaped strings:

```bash
git diff --cached | grep -nEi 'api[_-]?key|secret|password|token|BEGIN [A-Z ]*PRIVATE KEY'
```

If a secret is already committed, deleting the file does not unshare it. The
secret existed in history and on any remote it reached: rotate the credential
first, then remove the file and purge history. Treat the leak as an incident,
not a formatting fix.

### 6. No scaffolding in the shipped commit

Throwaway scripts, scratch files, TODO stubs, debug logging, and
`PROJECT_ANALYSIS`-style notes do not belong in the feature commit. Remove
them before committing; if they are genuinely part of the deliverable, commit
them separately and name them accurately.

### 7. Verify once, after the code is final

Run format, lint, build, and tests in one final pass, not after each
micro-commit. Intermediate commits do not need to be green; the head does.
State which checks you actually ran and their result.

## Sequence

1. Slice the work into logical commits by intent.
2. Stage only the files for the current slice.
3. Scan the staged diff: scope, size, secrets.
4. Write the Conventional Commit subject and a body explaining why.
5. Repeat for the next slice.
6. Final pass on the head: format, lint, build, test.
7. Open the PR: describe what changed and why, call out anything unverified.

## Anti-patterns, one line each

- One giant first commit: unreviewable, hides secrets. Slice it.
- Formatting churn mixed with logic: inflates the diff. Separate or revert.
- "While here" refactor: breaks revert granularity. Do it in its own commit.
- Product rewrite without confirmation: risks rejection of the whole PR.
  Propose first.
- `.env` in the tree: leaked credential. Rotate, then purge.
- Justifying a huge diff with a passing test run: size is a review problem,
  not a test problem.
