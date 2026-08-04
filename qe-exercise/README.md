# QE Take-Home: Budgeting + Transactions E2E Tests

E2E tests for Actual Budget's budgeting and transaction flows, extending the existing
Playwright suite at `packages/desktop-client/e2e/`. See [SETUP.md](./SETUP.md) to run
everything.

**One thing worth reading first:** [BUG_REPORT.md](./BUG_REPORT.md) documents a real,
confirmed defect found while writing these tests (budget input accepts negative/invalid
amounts with no validation) — not a hypothetical or a nice-to-have, an actual bug caught
along the way.

## Files here

| File                               | What it is                                                                                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BUG_REPORT.md](./BUG_REPORT.md)   | A real defect found during testing — worth reading first.                                                                                                       |
| [APPROACH.md](./APPROACH.md)       | The short version: scope, why these cases, what got cut, verification results. Start here for the summary.                                                      |
| [TEST_PLAN.md](./TEST_PLAN.md)     | The full test plan — priorities, rejected candidates, preconditions/expected results per case.                                                                  |
| [AI_WORKFLOW.md](./AI_WORKFLOW.md) | How Claude Code was used: division of labor, and the specific corrections/findings along the way (wrong assumptions caught against real evidence, not guessed). |
| [SETUP.md](./SETUP.md)             | Exact commands to get the app running (Docker) and run the tests, including one gotcha this environment surfaced.                                               |
| [PLAN.md](./PLAN.md)               | A snapshot of the implementation plan from early in the work. Reference only — `TEST_PLAN.md` and `AI_WORKFLOW.md` are the up-to-date record.                   |

## The tests

- [`budget-workflow.test.ts`](../packages/desktop-client/e2e/budget-workflow.test.ts) — B1–B10
- [`transaction-lifecycle.test.ts`](../packages/desktop-client/e2e/transaction-lifecycle.test.ts) — T1–T12
- [`CLAUDE.md`](../packages/desktop-client/e2e/CLAUDE.md) — scoped agent guide for this directory

Both spec files pass cleanly against the Docker-hosted app, stable under repeated reruns,
and mutation-verified (see [APPROACH.md](./APPROACH.md)'s Verification section).
