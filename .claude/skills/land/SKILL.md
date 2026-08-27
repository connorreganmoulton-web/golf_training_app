---
name: land
description: Take one GitHub issue all the way to merged — isolated worktree, subagents, proof gates, PR, teardown.
disable-model-invocation: true
---

# Land

Take one issue from `gh issue view` to a merged PR and a clean tree, in a worktree that leaves no trace.

One issue per run. Two issues that touch the same file will conflict; land them one after the other.

Argument: the issue number. Ask for it if it is missing.

## Preserve context

Your context window is the scarcest thing you have. Subagents do the digging and report conclusions; you hold the plan, the verdicts, and the report. Read files yourself only when you are about to edit them.

## 1. Worktree

```
git fetch origin
git worktree add ../golf-land-<N> -b fix/<N>-<slug> origin/main
```

Branch from `origin/main`, never from whatever is checked out — otherwise unrelated local commits ride into the PR.

Work only inside that worktree. `main` stays untouched until the merge.

## 2. Read before planning

- `gh issue view <N> --comments` — read the **whole** thread.
- **The AI triage comment is the sharper source.** It corrects the issue body, names constraints absent from the original description, and flags where the issue's own suggested fix is wrong. Where the two disagree, the triage comment wins.
- `CLAUDE.md` — the Honesty rules are product requirements. A change that makes the app overstate what the data supports is a failed change, however clean the diff.

Done when you can state the defect, the fix, and the gate that will prove it.

## 3. Implement

Dispatch subagents for the work — one per independent seam, or one if the fix is single-site.

**Touching `src/lib/plan/engine.ts` means creating `tests/plan.test.ts`.** `buildPlan` has no test coverage at all. Write the failing test first, watch it fail, then fix.

Commit bodies carry `Refs #<N>`.

## 4. Gates

All three pass before every commit:

```
npm test
npx tsc --noEmit
npm run build
```

**A green `npm test` proves nothing about route handlers** — no test touches `src/app/api/`. For any change under that path, typecheck and build are the gate that matters, and CI runs the docker build too.

## 5. Prove it

Dispatch **two adversarial subagents**. Their job is to refute the fix, and they default to refuted when uncertain.

Each must show the fix **executes** — not that the diff reads correctly:

- a test that fails on the old code and passes on the new one, or
- a log line from the real code path under the real trigger condition.

For an error-path fix, they trigger the genuine error. A mock written to satisfy the assertion proves the mock works.

**Give each adversary its own copy of the tree.** They instrument the code to
prove the path executes — temporary probes, swapped-in old files, `git
checkout` to revert. Two of them in one worktree overwrite each other's edits
mid-experiment and report the collision as an unknown process tampering with
the checkout, which is both alarming and unfalsifiable. Tell each one to work
in its own scratch copy, and say in the prompt that the other exists.

Both must clear it. One refusal sends the work back to step 3.

## 6. Merge

Open the PR with `Closes #<N>` in the description. Merge it.

## 7. Clean

```
git worktree remove ../golf-land-<N>
git branch -d fix/<N>-<slug>
git push origin --delete fix/<N>-<slug>
```

Verify with `git worktree list` and `git branch -a`. Both must come back without your worktree or branch.

## 8. Report

PR number · issue closed yes/no · all three gates passed · both adversaries cleared · cleanup verified.

State what you skipped and why. A gate you could not run is a finding, not a footnote.
