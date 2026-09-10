# Contributing

This is a take-home submission, not an open project — but the workflow below is real, not
performative, so it's documented here the way it would be for any team repo.

## Branch strategy

- **`main`** — the integration branch. Feature branches merge here once their own CI is green
  and the PR's been reviewed.
- **`prod`** — the release branch. Only advances via an explicit "Promote to production" PR from
  `main`. That promotion PR is the actual sign-off gate — treat merging it as cutting a release,
  not routine integration work.

Feature branches are cut from the current tip of `main`, never stacked on another open PR's
branch. Each one is scoped to a single concern, gets its own GitHub issue, its own Linear ticket
(cross-linked both directions), and its own PR.

## Labels

Three independent axes, combined freely:

| Axis | Values |
|---|---|
| **Type** | `bug`, `enhancement` |
| **Layer** | `domain`, `repository`, `service`, `http`, `frontend`, `backend`, `infra` |
| **Status** | `backlog`, `in-review`, `~done` |

`~done` is prefixed with a tilde specifically so it sorts last in GitHub's (alphabetical) label
list, regardless of what other labels exist alongside it.

## Milestones

1. **Core Implementation** — required by the assignment.
2. **Optional Enhancements** — the assignment's own "if time permits" list.
3. **Extras** — beyond the assignment, for differentiation.
4. **Future Enhancements (not graded)** — real, scoped work identified during review and
   deliberately not built, since it's outside what this submission needs to demonstrate. See
   the [milestone](../../milestone/4) for the current list.

## Opening a PR

Use the PR template (fills in automatically) — a one-line summary of what changed, exact steps
to check it out and test it, and what was actually verified (`npm test`/`lint`/`build` output at
minimum, plus any manual verification the automated suite doesn't cover). Link the issue it
relates to with `Relates to #N`, not `Closes #N` — the auto-close keywords are avoided
deliberately so merging a base branch doesn't cascade-close issues prematurely.

## CI

Every push and every PR runs lint, test (with coverage), and build on Node 22. The workflow file
lives on every branch, not just `main` — GitHub only reads `pull_request`-triggered workflows
from the PR's own branch tree, not inherited from its base.
