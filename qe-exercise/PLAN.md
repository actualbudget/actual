# QE Take-Home: Actual Budget E2E Tests

## Context

Fork Actual Budget, run it locally, explore it, write a test plan, and implement
Playwright E2E tests, with the agent interaction itself documented as part of the
submission.

Two facts shape the whole approach:

1. **Actual already has a mature Playwright suite** at `packages/desktop-client/e2e/` —
   30+ page models, a custom `fixtures.ts`, and tests for accounts, budget, transactions,
   rules, schedules, and reports. We extend this, not reinvent it.
2. **Existing coverage is shallow and snapshot-heavy** — mostly single actions plus
   `toMatchThemeScreenshots`. The gap is _cross-feature state verification_: does money
   actually move correctly between a transaction, an account balance, and a budget
   category? That's where new tests add value.

Chosen scope: **Budgeting + Transactions**, since they interlock (a transaction changes a
category's Spent), enabling real user journeys instead of isolated clicks.

Current repo state: on branch `qe-takehome/e2e-budget-transactions`, `origin` still points
at upstream `actualbudget/actual` — fine for setup and dev, since forking only matters at
push time. Node 22.18.0 and Yarn 4.17.1 are active (via nvm/corepack) and `yarn install`
has completed.

### Commit boundaries

Commit at each clean unit of work rather than batching everything at the end, so the
history itself shows the plan driving the code:

1. `qe.Dockerfile` + `docker-compose.qe.yml` (Phase 1) — infra, independent of everything
   else.
2. `TEST_PLAN.md` alone (Phase 2), before any spec file exists.
3. Page-model extensions (`budget-page.ts`, `account-page.ts`) as their own commit —
   additive-only, reviewable separately from the specs that use them.
4. `budget-workflow.test.ts` (Phase 3).
5. `transaction-lifecycle.test.ts` (Phase 3).
6. AI-agent artifacts — `CLAUDE.md`, `AI_WORKFLOW.md`, `SETUP.md`, `APPROACH.md` (Phase 4).
7. `BUG_REPORT.md`, only if Phase 2 discovery turns one up.

The repo's pre-commit hook (`scripts/agent-hooks/git-guard.sh`) rejects any commit message
that doesn't start with `[AI]`, regardless of branch — confirmed when the first commit was
blocked. So every commit here needs the `[AI]` prefix too, not just PR titles against
upstream.

---

## Phase 0 — Toolchain setup

1. `nvm install` (picks up `.nvmrc` → Node 22.18.0)
2. `corepack enable` (brings `yarn` onto PATH)
3. `yarn install` from repo root
4. `yarn workspace @actual-app/web playwright install chromium`
5. Start Docker Desktop; confirm daemon is up with `docker info`

---

## Phase 1 — Run the system under test in Docker

The repo's `docker-compose.yml` bind-mounts `.:/app`, which would make the container and
host share one `node_modules` — native binaries (`esbuild`, `better-sqlite3`) are
platform-specific, so that breaks a host-run Playwright suite. **Don't modify the
upstream docker files.** Add new ones alongside them:

- **`qe.Dockerfile`** — `FROM node:22-bookworm`, `COPY` the repo in (no bind mount), run
  `corepack enable && yarn install`, expose 3001, `CMD BROWSER=0 yarn start:browser`.
- **`docker-compose.qe.yml`** — one service built from `qe.Dockerfile`, mapping `3001:3001`.

Bring it up with `docker compose -f docker-compose.qe.yml up --build`, confirm the
onboarding screen loads at `http://localhost:3001`.

Playwright supports pointing at an external server: `playwright.config.ts:39` skips its
own `webServer` when `E2E_START_URL` is set. So the Docker-backed run is
`E2E_START_URL=http://localhost:3001 yarn workspace @actual-app/web e2e`, and dropping the
env var gives a fast host-only loop for iteration.

---

## Phase 2 — Explore, design the case list, write the test plan

Use the app manually and via the agent against the running container to map the two
feature areas. Data comes from the **"Try the demo"** flow, already wrapped by
`ConfigurationPage.createTestFile()`
(`packages/desktop-client/e2e/page-models/configuration-page.ts:19`) — seeds accounts,
categories, and transactions, waits for the budget table to mount.

### Design the case list by subtraction

Propose a broad candidate set (~20 cases) across both feature areas, then cut. The cuts
are real design decisions — each rejection is a risk judgment tied to this specific app.
Record it in `TEST_PLAN.md` as a **Rejected candidates** table (candidate, decision,
reason), e.g.:

| Candidate                 | Decision | Reason                                                    |
| ------------------------- | -------- | --------------------------------------------------------- |
| Sidebar collapse/expand   | Cut      | Covered by existing snapshot tests; near-zero defect odds |
| Category rename           | Cut      | CRUD on a label; no cross-feature state                   |
| Budget month navigation   | Cut      | Exercised incidentally by B4                              |
| Transfer between accounts | Keep     | P0 — see below                                            |

### Note why each P0 case matters

- **T5 (transfers)** — mirrored double-entry is the classic ledger defect; worth testing
  even if existing coverage were otherwise complete.
- **B3 (overspend + cover)** — envelope budgeting's core promise is that overspending stays
  visible and recoverable; breaks user trust even when no data is lost.
- **B2 (transaction → category Spent)** — the single cross-feature seam identified in the
  gap analysis; the whole scope choice rests on it.

### Resolve the undefined edge cases before writing specs for them

B6, T7, and T8 are currently open questions ("accepted or rejected", "reassigned or left
uncategorized"). An assertion can't be written against an unknown expected result.
Exercise each manually against the container, record the observed behavior in
`TEST_PLAN.md` as the expected result, then write the test to lock it in. If any of them
turns out to behave wrong, write it up in `qe-exercise/BUG_REPORT.md` (repro steps,
expected vs. actual, severity) — a real bug found in the app under test is worth more than
another passing test.

### Write the test plan

**`qe-exercise/TEST_PLAN.md`** covering:

- Scope and out-of-scope, stated with reasons — mobile variants excluded because
  `.mobile.test.ts` doubles the matrix without adding new logic coverage; bank-sync
  excluded because it needs external credentials; reports excluded as read-only derived
  data, lower risk.
- Feature areas and why they were chosen.
- Priority per test case (P0/P1/P2), justified by blast radius and detectability — e.g. T5
  is P0 because a broken mirror silently moves money across two accounts; T6 is P2 because
  a wrong filter result is immediately visible and non-destructive.
- The rejected-candidates table and P0 notes above.
- Test cases with preconditions and expected results (Phase 3 tables below).
- Data strategy and the robustness principles from Phase 3.

Commit `TEST_PLAN.md` on its own, before any spec file exists (commit boundary #2 above).

---

## Phase 3 — Implement the Playwright tests

### Robustness principles (state in the test plan, follow in the code)

- **Assert on deltas, never on demo values** — read the value, act, then assert the
  change, following `budget.test.ts:41`'s `getBalanceForRow` pattern. No hardcoded dollar
  amounts, since demo data is generated.
- **Page models only** — role/testid locators, no CSS/XPath in test files.
- **Web-first assertions** (`expect`, `expect.poll`) with auto-retry; never
  `waitForTimeout`.
- **No visual snapshots in the new tests** — `toMatchThemeScreenshots` is a no-op outside
  VRT runs (`fixtures.ts:62`) and skipping it keeps the diff free of PNGs.
- **Fresh budget file per test** in `beforeEach`, safe under the config's
  `fullyParallel: true`.
- Import `{ expect, test }` from `./fixtures`, not `@playwright/test` — the fixture
  disables CSS animations to avoid flaky click races.

### New test files (flat in `e2e/`, matching repo convention)

**`packages/desktop-client/e2e/budget-workflow.test.ts`**

| #   | Priority | Test                                                                                                                                                |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | P1       | Budgeting an amount to a category updates that category's balance and the Budgeted total by the same delta                                          |
| B2  | P0       | Creating a transaction in a category increases its Spent and decreases its balance by the transaction amount _(cross-feature)_                      |
| B3  | P0       | Overspending a category surfaces it in the Overspent summary; covering it from another category zeroes the overspend and reduces the source balance |
| B4  | P1       | A category balance carries forward to the next month (rollover)                                                                                     |
| B5  | P1       | A transaction dated in a future/next month hits that month's Spent, not the current month's _(expected result set by Phase 2 discovery)_            |
| B6  | P2       | Budgeting a negative amount or non-numeric input is rejected or clamped, not silently accepted _(expected result set by Phase 2 discovery)_         |

**`packages/desktop-client/e2e/transaction-lifecycle.test.ts`**

| #   | Priority | Test                                                                                                                      |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| T1  | P1       | Create → row shows correct payee/category/amount and the account balance drops by that amount                             |
| T2  | P1       | Edit the amount → both running balance and account balance update                                                         |
| T3  | P1       | Delete → row disappears and the account balance returns to its original value                                             |
| T4  | P1       | Split transaction children sum to the parent amount; parent shows "Split"                                                 |
| T5  | P0       | Transfer between two on-budget accounts creates mirrored entries and leaves the combined on-budget balance unchanged      |
| T6  | P2       | Filtering by payee returns only matching rows; clearing the filter restores the full list                                 |
| T7  | P2       | Creating a zero-amount transaction — behavior and Spent impact _(expected result set by Phase 2 discovery)_               |
| T8  | P1       | Deleting a category that has transactions against it — transactions not lost _(expected result set by Phase 2 discovery)_ |

### Page model extensions (additive only — don't change existing signatures)

- `page-models/budget-page.ts` — add `getBudgetedForRow`, `getSpentForRow`,
  `getCategoryRowByName`, `coverOverspending`. Reuse existing `setBudgetedAmount:91`,
  `getBalanceForRow:146`, `getTableTotals:83`, `goToNextMonth:135`.
- `page-models/account-page.ts` — add `editTransactionField`, `deleteNthTransaction`,
  `getAccountBalanceValue`. Reuse `createSingleTransaction:95`, `createSplitTransaction:103`,
  `selectNthTransaction:135`, `filterBy:183`.

Use the existing React-quirk helpers (`clickReactAriaButton`, `fillReactInput` in
`page-models/navigation.ts`) rather than plain `.click()`/`.fill()` on React Aria
controls — they exist specifically to avoid detached-node flake.

**Note the mutation target for Phase 5 while working here** — once it's clear where the
balance/Spent math actually lives (`loot-core`, not the client), note the exact function
to mutate later. Prefer a minimal edit (flip a sign, change an operand) over deleting a
call — deletions cascade into typecheck failures and turn a two-minute check into a
refactor.

---

## Phase 4 — AI-agent artifacts

- **`packages/desktop-client/e2e/CLAUDE.md`** — scoped agent guide auto-loaded when
  working in the e2e directory: page-model contract, delta-assertion rule, fixtures
  import rule, how to run a single spec. Scoped (not root-level) since the repo already
  has a root `CLAUDE.md` importing `AGENTS.md` — don't clobber it.

- **`qe-exercise/AI_WORKFLOW.md`** — a record of what actually happened, structured for
  clarity rather than chronology:

  - **Division of labor**, as a table:

    | Work                                       | Owner                              |
    | ------------------------------------------ | ---------------------------------- |
    | Feature area selection, risk ranking       | Human                              |
    | Test case design and assertions            | Human                              |
    | Rejecting agent-proposed candidates        | Human                              |
    | Codebase exploration, page-model summaries | Agent                              |
    | Spec scaffolding from human specifications | Agent, hand-reviewed               |
    | Flake debugging                            | Both — agent proposed, human chose |

  - **Corrections, with specifics** — concrete before/after examples of agent output that
    was wrong or suboptimal, and why the fix mattered (e.g. a first draft using
    `waitForTimeout` replaced with `expect.poll`, because the timeout would pass locally
    and flake in CI). Write these as they happen, not reconstructed at the end.

  - **Technique notes** — plan mode before implementation, parallel exploration, any
    slash-command extraction and what repetition triggered it (only if it actually
    happened).

  - Copy the plan file(s) driving this work into `qe-exercise/` alongside the above.

- **`qe-exercise/SETUP.md`** — Docker setup and exact commands to run the suite.

- **`qe-exercise/BUG_REPORT.md`** — only if Phase 2 behavior discovery turns up a genuine
  defect.

---

## Phase 5 — Verification

1. **App is up in Docker:** `http://localhost:3001` serves the onboarding screen.
2. **New tests pass against the container:**
   `E2E_START_URL=http://localhost:3001 yarn workspace @actual-app/web playwright test budget-workflow.test.ts transaction-lifecycle.test.ts --browser=chromium`
3. **Not flaky:** rerun with `--repeat-each=3`, once with `--workers=1` to rule out
   order-dependence. Check this early (right after the first tests are green), not at the
   end — a `fullyParallel: true` collision against one shared Docker server surfaces as
   flake late and is hard to root-cause after the fact.
4. **Tests can actually fail (mutation check):** for B2 and T5, apply the minimal mutation
   noted in Phase 3, confirm the test fails with a useful message, then restore. A test
   that only ever passes isn't evidence it checks anything.
5. **Nothing upstream broke:** run the full existing suite —
   `E2E_START_URL=http://localhost:3001 yarn workspace @actual-app/web e2e`.
6. **Repo checks clean:** `yarn typecheck` and `yarn lint` from root.
7. Review the HTML report at `packages/desktop-client/playwright-report/`.
8. **Final pass:** for each retained case, confirm in one sentence why it exists and what
   defect it catches. Cut anything that can't be justified that concretely, however good
   it looks on the page.
9. Fork + push is a separate, later step — not part of this plan's execution.

---

## Risks and mitigations

- **Demo data varies** between runs → delta assertions only, no hardcoded amounts.
- **First `yarn install` and Docker build are slow** (several minutes each) — expected.
- **React Aria detached-node flake** is a known repo issue → use existing
  `clickReactAriaButton` / `fillReactInput` helpers.
- **Budget table is virtualized** (`AutoSizer` returns null until layout) → always
  `await budgetPage.waitFor()` before asserting.
- **Edge cases B6/T7/T8 have no expected result yet** → Phase 2 behavior discovery must
  precede writing those specs; a defect found there becomes a bug report, not a blocked
  test.
- **Mutation target lives in `loot-core`, not the client** → identify it during Phase 3,
  keep the mutation minimal.
- **Fork/push** deferred: only matters once ready to submit, not for setup/dev work.
