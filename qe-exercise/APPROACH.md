# Approach: E2E Tests for Budgeting + Transactions

## Why this scope

Actual already has a mature Playwright suite at `packages/desktop-client/e2e/` — 30+ page
models, a shared `fixtures.ts`, and coverage for accounts, budget, transactions, rules,
schedules, and reports. I extended that suite rather than writing a parallel one.

The existing coverage is mostly single-action and snapshot-heavy (a lot of
`toMatchThemeScreenshots`). The gap I found is cross-feature state verification: does
money actually move correctly between a transaction, an account balance, and a budget
category? I chose **Budgeting + Transactions** because they interlock — a transaction
changes a category's Spent — which lets the tests exercise real user journeys instead of
isolated clicks.

## How I picked the cases

I started from a broad candidate list (~20 cases across both areas) and cut it down. A few
examples of what got cut and why:

| Candidate                 | Decision | Reason                                                      |
| ------------------------- | -------- | ----------------------------------------------------------- |
| Sidebar collapse/expand   | Cut      | Already covered by existing snapshot tests; low defect odds |
| Category rename           | Cut      | CRUD on a label, no cross-feature state involved            |
| Budget month navigation   | Cut      | Exercised incidentally by the rollover test (B4)            |
| Transfer between accounts | Kept     | See P0 reasoning below                                      |

Each retained case is tagged P0/P1/P2 by blast radius and detectability:

- **T5 (transfers) — P0.** Mirrored double-entry is a classic ledger defect. A broken
  mirror silently moves money across two accounts with no visible error.
- **B3 (overspend + cover) — P0.** Envelope budgeting's core promise is that overspending
  stays visible and recoverable; this breaks user trust even without data loss.
- **B2 (transaction → category Spent) — P0.** The single cross-feature seam the whole
  scope choice rests on.
- **T6 (payee filter) — P2.** A wrong filter result is immediately visible and
  non-destructive — low priority by design.

Three cases (B6, T7, T8) started as open questions about undefined behavior — e.g. does a
negative budget amount get rejected or clamped? I resolved these by exercising the app
manually before writing assertions against them, since you can't assert against an unknown
expected result.

The 22 cases (B1–B10, T1–T12), their priorities, preconditions, and expected results are in
`TEST_PLAN.md` — not repeated here to avoid two copies of the same table drifting apart.

## Out of scope

- **Mobile** (`.mobile.test.ts` variants) — doubles the test matrix without adding new
  logic coverage; the underlying behavior is identical to desktop.
- **Bank sync** — requires external credentials I don't have in this environment.
- **Reports** — read-only derived data, lower risk than the write paths above.

## Robustness principles

- **Assert on deltas, never on hardcoded demo values** — the demo data is generated fresh
  each run, so every test reads a value, acts, and asserts the change.
- **Page models only** — role/testid locators, no CSS/XPath in the test files.
- **Web-first assertions** (`expect`, `expect.poll`) with auto-retry, never
  `waitForTimeout`.
- **No visual snapshots in the new tests** — keeps the diff free of PNGs and focused on
  behavior.
- **Fresh budget file per test**, safe under Playwright's `fullyParallel: true`.
- Import `{ expect, test }` from the repo's `./fixtures`, which disables CSS animations to
  avoid flaky click races.

## Verification

- Both new spec files run clean against the Docker-hosted app, individually and under
  repeated reruns (`--repeat-each=2`/`3`) to rule out flakiness — including one real flake
  that got root-caused and fixed rather than papered over (see `AI_WORKFLOW.md`).
- **Mutation check** on the two highest-risk cases: temporarily broke the real
  balance-calculation logic in `loot-core` (flipped a `+` to `-` in envelope.ts's
  `leftover-${cat.id}` formula for B2; flipped the mirrored-amount sign in
  `transfer.ts`'s `addTransfer` for T5), confirmed each test failed with a clear
  expected-vs-received mismatch, then restored the original code and reconfirmed both
  pass. A test that only ever passes isn't evidence it checks anything.
- **Full existing Playwright suite**: 147 passed, 1 flaky (a pre-existing test unrelated
  to anything touched here — `transactions.test.ts`'s payee-filter test, which passed on
  its automatic retry). Nothing upstream broke.
- `yarn typecheck` (all 10 workspaces) and `yarn lint` (format + type-aware oxlint) are
  both clean.

### Second verification pass (after the upstream master merge)

The run above predates merging `actualbudget:master` into this branch. Re-running
everything afterwards surfaced three things, all now fixed:

1. **The merge broke T2.** Upstream PR #8580 ("Add a column manager to the transaction
   table") removed the account menu's _"Show running balance"_ toggle, which T2 clicked.
   Upstream's own `accounts.test.ts` had already moved to
   `setTransactionColumnVisibility('balance', true)`; T2 now uses the same helper. A
   passing suite is only evidence as of the commit it ran on — this is exactly the class
   of breakage a merge introduces silently.
2. **T9's expected result was wrong, and the app was right.** It asserted the category
   cell reads "Transfer" on an on-budget → off-budget transfer. It reads "Categorize":
   `TransactionsTable.tsx` reserves "Transfer" for `isBudgetTransfer` (both sides on
   budget), and money leaving the budget is genuinely uncategorised spending. Corrected
   against observed behavior rather than forced to match the guess.
3. **B9 was flaky, and it was the test's fault.** It read a category balance immediately
   after `setBudgetedAmount`, which returns once the input is committed but before the
   sheet recomputes — so the baseline could be stale and the post-transfer sum never
   reconciled. Fixed by polling the budgeted value to settle first, then reading the
   baselines. Confirmed with `--repeat-each=4`: 4/4 clean.

Final state of the two new spec files: **22 tests, 44/44 passing under `--repeat-each=2`,
zero flaky.**

### Shared test-support modules

Four small modules sit alongside the specs, extracted once the same setup and parsing
appeared in both files:

| File              | What it holds                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| `qe-session.ts`   | `createDemoSession` / `closeDemoSession` — one browser page on a freshly seeded demo budget file   |
| `qe-demo-data.ts` | Named category row indices and the seeded account name, with the reasons they're safe to depend on |
| `qe-money.ts`     | Currency parsing to integer cents, in one place                                                    |
| `qe-budget.ts`    | `setBudgetedAmountAndSettle` — set a budget and wait for the sheet to recompute                    |

`qe-budget.ts` is the interesting one: it exists because the same race caused two separate
intermittent failures (B4 and B9), each of which passed on retry. Rather than adding a
poll at each call site, the wait is now part of the operation, so the next test to budget
an amount cannot reintroduce it.

`qe-money.ts` centralises the parse that was previously duplicated in both spec files —
the same parse whose `parseInt` variant silently truncated `"3,030.00"` to `3` in the
project's own page models.

### Known environment limit

At `--repeat-each=3` (66 runs, 4 workers against a single Vite dev server) two
transaction tests — T6 (payee filter) and T7 ($0 transaction) — become unstable on
timeouts. Re-running just those two at `--repeat-each=3 --workers=2` gives 6/6 clean, so
this is dev-server contention rather than a defect in either test. Worth knowing before
raising parallelism in CI; `--repeat-each=2` at the default worker count is stable.

See `SETUP.md` for exact commands and `AI_WORKFLOW.md` for how I used Claude Code
throughout this exercise.
