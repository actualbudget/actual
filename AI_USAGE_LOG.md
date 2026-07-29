# AI Usage Log

This log documents how Claude (Claude Code, running in this repo) was used
to research, plan, and implement the E2E test additions in this submission —
prompts given, what the agent found/did, friction hit, and how it was
resolved. Written after the fact from the actual session, not reconstructed.

## 1. Orientation

**Prompt:** "Explain me the project or this repo, what's it's doing. What
tests should we cover for the playwright e2e testing," followed by the full
assignment brief.

The agent read `AGENTS.md`, `README.md`, `docker-compose.yml`, and listed
`packages/desktop-client/e2e/` to explain the project (local-first envelope
budgeting app, Yarn 4 monorepo) and the existing test surface. It proposed
**Budgeting + Transactions** as the two features to focus on and asked which
to pursue — deliberately not writing any code before that was confirmed
(explicitly instructed: "please don't start on your own").

**Friction:** the first draft of a test plan was written _before_ reading
the full assignment brief in detail (only a summary had been pasted), and
proposed tests that overlapped with things already covered (e.g. "budget
table renders with totals," "transferring balance between categories") —
effectively a generic test plan, not a gap analysis.

**Resolution:** once the full brief was pasted — "extend, don't rebuild,"
"choose what to test based on a real gap analysis of the existing suite" —
the agent explicitly re-scoped: stopped proposing generic test ideas and
instead read the _full bodies_ of `budget.test.ts` and `transactions.test.ts`
(not just `ls`-ing filenames) before proposing anything further.

## 2. Gap analysis

**Prompt (implicit, from the brief):** find what's actually tested vs. not,
with evidence, not assumption.

The agent:

- Read `budget.test.ts`, `transactions.test.ts`, and `accounts.test.ts` in
  full.
- Ran `grep -rn` across every `*.test.ts` file for the page-model methods
  that looked unused (`setBudgetedAmount`, `goToNextMonth`,
  `selectNthTransaction`, etc.) to confirm — rather than assume — whether
  they were actually exercised anywhere, including mobile test files.
- Found that `setBudgetedAmount` is called exactly once in the whole suite,
  in `reports.test.ts`, purely as setup for a reports test with zero
  assertion on the budgeted amount itself.
- Found `'Delete'` appears exactly once across the suite — a
  visibility-only check on a context-menu item, never a completed deletion.

This turned a vague "let's test budgeting and transactions" scope into
three specific, evidenced gaps (see `TEST_PLAN.md`).

**Friction:** none of real note here — grep-first, read-the-source-second
worked cleanly. The one wrinkle was needing to read the actual React
component source (`EnvelopeBudgetComponents.tsx`,
`useTransactionBatchActions.ts`, `ConfirmDeleteModal.tsx`) to find the real
testids/flow (`name="budget"`, the `confirm-delete-modal` testid, the
"Confirm Delete" dialog's button labels) before writing the delete helper —
guessing selectors from test names alone would have been unreliable.

## 3. Implementation

Added, closely mirroring existing conventions in the same files:

- `BudgetPage.getBudgetedAmount()` and `previousMonthButton` /
  `goToPreviousMonth()` — the latter reuses the existing private
  `#waitForNewMonthToLoad` helper rather than duplicating its wait logic.
- `AccountPage.deleteNthTransaction()` — composes the existing
  `rightClickNthTransaction()` with the confirm-modal flow discovered in
  step 2.
- Three new tests, one per gap, using `test.step()` per-stage and
  `expect.poll()` / `expect(locator).toHaveCount()` for state-based waits
  (no fixed timeouts anywhere).

## 4. Friction during local test execution

Running the suite locally (`yarn workspace @actual-app/web run playwright
test budget.test.ts accounts.test.ts --browser=chromium`) surfaced three
environment issues, in order:

1. **`yarn: command not found`.** This worktree had never been bootstrapped.
   Fixed with `corepack enable` (the repo pins `yarn@4.13.0` via
   `packageManager`), then `yarn install`.
2. **`better-sqlite3` native build failed** during `yarn install` (missing
   prebuilt binary for this platform/Node combination). Not investigated
   further — it's a native dependency used by the sync-server/Electron
   paths, not by the browser-based web frontend that Playwright drives here,
   and the install otherwise completed enough for `@playwright/test` to be
   present and runnable.
3. **`browserType.launch: Executable doesn't exist`** — Playwright's browser
   binaries weren't downloaded yet. Fixed with `yarn playwright install
chromium`.

## 5. A real bug found by the new test, not assumed

The first real test run failed on the new
`assigning a budgeted amount updates the category and the total budgeted`
test:

```
Expected: 1200
Received: 1
```

Root cause: `parseInt('1,200.00', 10)` stops at the first non-numeric
character and returns `1` — the thousands-separator comma in the formatted
UI text truncates the parse. This exact bug already existed, latent, in
`BudgetPage.getTotalBudgeted()` / `getTotalSpent()` / `getTotalLeftover()` —
it never surfaced before because no existing test asserted an exact
four-figure dollar value against them (the only prior consumer,
`'budget table is rendered'`, just checks `expect.any(Number)`).

**Resolution:** fixed all four `parseInt` call sites (the three pre-existing
total getters plus the new `getBudgetedAmount`) to strip commas first
(`text.replace(/,/g, '')`) before parsing — applying the fix consistently
across every sibling method with the identical pattern, not just the one
blocking the new test. Re-ran; the test passed on the next attempt.

This is the main argument for actually running tests locally rather than
trusting generated code: the bug was in _existing, previously-merged_ test
infrastructure, and only a real run against the real app surfaced it.

## 6. Final verification

After the fix, the first full run (`--browser=chromium`, default full
parallelism) showed the new tests green except for a handful of unrelated,
pre-existing `accounts.test.ts` tests timing out on the shared dev server
under worker contention. Rather than assume that was fine, the suite was
re-run with `--workers=2` to reduce contention: all 21 tests in
`budget.test.ts` and `accounts.test.ts` passed, confirming those failures
were parallel-load flakiness in the shared dev server, not a regression
introduced by these changes.

## 7. Gaps 4a and 4b — prompted verification of actual source

**The ask:** After I'd documented gaps 1-3 and the three new tests, you
reviewed and asked me to verify gaps 4a (account rename) and 4b
(category/group rename) by actually reading the UI source code, not just
assuming the two "Rename" menu items behaved identically because their
tests looked the same on the surface.

**The friction:** I was treating "rename" as a single gap with a generic
solution. Reading the actual component files (`Account.tsx`,
`SidebarCategory.tsx`, `SidebarGroup.tsx`, `BudgetTable.tsx`) revealed
they're two independent implementations with different state patterns —
accounts use a bare `Input` + local `useState`, while categories/groups
use the shared table framework's `InputCell`/`exposed` mechanism with
lifted state. That means 4a and 4b aren't one test reused twice; they're
two separate test+helper pairs.

**Resolution:** Documented gaps 4a/4b in `TEST_PLAN.md` with full source
citations (file:line) and explained why they can't be tested identically
despite their similar UX. Marked them explicitly out-of-scope for this
round, but with enough specificity that they're ready to tackle next.

This is a good example of why "read the source before writing test code"
matters — the surface-level anti-pattern (menu visibility only) was
identical, but the fix required understanding the underlying
implementation differences.
