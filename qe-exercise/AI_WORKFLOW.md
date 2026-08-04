# AI Workflow

A running record of how Claude Code was used on this exercise, kept updated as the work
happens rather than reconstructed afterward. Structured around delegation and corrections,
not a chronological transcript.

## Division of labor

| Work                                                                    | Owner                                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Feature area selection (Budgeting + Transactions), risk ranking         | Human                                                                 |
| Test case design, priorities, what to cut                               | Human                                                                 |
| Reviewing and correcting agent output                                   | Human                                                                 |
| Codebase exploration, page-model/source reading                         | Agent                                                                 |
| Behavior discovery (exercising the app to resolve undefined edge cases) | Agent, then human-reviewed                                            |
| Spec scaffolding from agreed test cases                                 | Agent, then human-reviewed                                            |
| Debugging test failures                                                 | Agent proposed hypotheses, human/agent jointly verified before fixing |

## Corrections and findings

The specifics below are the actual value of this log — each is a case where the first
assumption was wrong and had to be corrected against real evidence, not guessed.

**`getTotalBudgeted`/`getTotalSpent`/`getTotalLeftover` had a latent parsing bug.**
These pre-existing page-model methods used `parseInt(text, 10)` directly on
comma-formatted currency text (e.g. `"3,030.00"`), which truncates at the first comma and
returns `3`. It went unnoticed because the one existing test using it only asserts
`expect.any(Number)`. Surfaced when B1's totals assertion failed with `Expected: 10003,
Received: 3`. Fixed to match `getBalanceForRow`'s parsing (strip commas, `parseFloat`,
scale to cents).

**"Spent" renders as a negative number, not positive.** First draft of B2 assumed
`spentAfter = spentBefore + amount`. It failed with `Received: -2345` instead of the
expected positive delta. Rather than guess at the sign, confirmed directly by reading the
raw `total-spent` cell text (`"-158.06"`) before touching the assertion. Fixed both B2 and
B5 to expect Spent moving _more negative_ as more is spent.

**The app hardcodes "today" to `2017-01` when it detects Playwright.** B5 (transaction
dated "next month") used `new Date()` from the host clock (real-world 2026-08) to compute
the target date. It failed with `Received: 0` — the transaction wasn't landing in the
month the test checked. Debug logging showed the budget page's own "current month" was
`2017-01`, not 2026-08. Traced to `packages/loot-core/src/shared/months.ts`:
`currentMonth()` returns a hardcoded `'2017-01'` whenever `Platform.isPlaywright` is true
(detected via `playwright.config.ts`'s `userAgent: 'playwright'`), specifically for
deterministic E2E runs. Fixed B5 to derive "next month" from the app's own
`getSelectedMonth()` instead of the host clock. A raw exploration script using a normal
(non-"playwright") user agent had earlier shown real dates, which is what caused the
initial wrong assumption.

**A false lead, debunked rather than chased.** While investigating the above, an ad-hoc
diagnostic script (with fields filled in a different order than the real page model uses —
category before amount, instead of the real `debit → payee → category → date` order) once
produced a corrupted $75,000 amount. This looked like it might be a real app bug. Before
writing it up as one, reran the _exact_ field order the actual page model uses, 4/4 clean
— the anomaly only appeared under an order the real code never exercises, so it wasn't
pursued further. Worth stating plainly: this could still be a real timing issue under some
input order, but it doesn't affect these tests as written, and chasing it further would
have been effort spent outside this exercise's scope.

**Case-sensitivity bug in the Docker image (environment, not app logic).**
`component-library`'s `package.json` maps CSS imports to lowercase `src/themes/*.css`, but
the directory on disk is `src/Themes/`. Silently tolerated on macOS's default
case-insensitive filesystem; broke Vite's module resolution on the case-sensitive Linux
image used for `qe.Dockerfile`. Fixed with a build-time symlink, not a source edit.

**Stop hook (`check-on-stop.sh`) couldn't find `yarn`.** The hook runs `yarn workspace ...
typecheck/test` in a plain subprocess that doesn't source `~/.zshrc` or nvm, so it never
saw the Node 22 toolchain set up in Phase 0. Fixed by symlinking `yarn`/`node` (nvm's
22.18.0 install) into `~/.local/bin`, which was already ahead of `/usr/local/bin` in the
normal shell `PATH` — confirmed the fix by running the hook script directly rather than
assuming it would work.

**`getNthTransaction(0)` isn't reliable on demo-seeded accounts.** T1's first draft
created a transaction on "Bank of America" and immediately checked `getNthTransaction(0)`.
It failed with the payee reading `"(No payee)"`. A screenshot of the failure showed why:
demo accounts have pinned "Upcoming/Due/Missed" schedule-preview rows that always sort
above regular transactions, so index 0 was a schedule preview, not the transaction just
created — the real one was at index 2. `accounts.test.ts` already avoids this by creating
a fresh empty account (`navigation.createAccount`) for exactly this reason; T1, T2, T3,
T4, T6, and T7 were all switched to the same pattern instead of reusing "Bank of America".

**The Payee filter's value field is an autocomplete combobox, not free text.** T6 mirrored
`filterByNote`'s pattern (`filterBy('Note')` then `page.keyboard.type(...)`), which works
for Notes because it's a plain text field. For Payee it hung for the full 60s test timeout
waiting on the Apply button. A screenshot showed why: the value field has a `"nothing"`
placeholder and is a combobox, not a textbox — typing without first clicking into it goes
nowhere. Fixed by clicking `getByPlaceholder('nothing')` before typing.

**`navigation.createAccount` called twice in one test produces an ambiguous locator.**
T5 needs two accounts. Calling `createAccount` twice back-to-back failed with
`getByLabel('Name')` resolving to two elements — the first account's now-visible "Edit
account name" button (`aria-label="Edit account name"`) contains the same "Name" substring
the second modal's input matches on. Fixed by navigating to the Budget page between the
two calls, not by changing the pre-existing `createAccount` helper.

**A resolved flake, not accepted as noise.** T6 initially still used "Bank of America"
(only its filter target payees were fresh). Under `--repeat-each=2` it failed once with a
60s test timeout and `Received: undefined` on a `toHaveCount` check — plausible as
resource contention against an account with ~20+ pre-seeded transactions, under 4 parallel
workers hitting one Docker container. Rather than bump the timeout or accept it as
one-off flake, switched T6 to a fresh account too (same fix as the schedule-preview
finding above, for a different reason: less DOM, less contention). Reran at
`--repeat-each=3` afterward: 24/24 clean.

**Mutation check found the actual math, not just plausible-looking spots.** For B2, the
first candidate mutation target was guessed at from the UI side; grepping instead led to
`envelope.ts`'s `leftover-${cat.id}` dynamic cell — `budgeted + spent + carryover`, flipping
`+` to `-` before `spent`. For T5, `transfer.ts`'s `addTransfer` builds the mirror
transaction with `amount: -transaction.amount`; flipping that sign to a plain
`transaction.amount` broke the mirror. Both mutations were applied by copying the edited
file directly into the running container (`docker cp`) rather than a full rebuild — the
container's own Vite watcher hot-rebuilt `loot-core` in ~4-12s — then reverted with
`git checkout --` and copied back in to confirm the pass. Both tests failed clearly with
the mutation in place and passed cleanly once restored.

## Second pass: findings from re-verifying after the upstream merge

Re-running everything after `actualbudget:master` was merged into this branch produced
three more corrections — same pattern as above, each caught by evidence rather than
review.

**An upstream merge silently broke T2.** T2 clicked the account menu's _"Show running
balance"_ toggle. Upstream PR #8580 ("Add a column manager to the transaction table")
replaced that toggle with a column manager, so the button no longer exists and the test
timed out waiting for it. Found the fix by grepping the upstream suite: `accounts.test.ts`
had already migrated to `setTransactionColumnVisibility('balance', true)`, a helper
already on the page model. Worth stating plainly: the "147 passed" figure recorded earlier
in this exercise was true when it was measured and stopped being true after the merge — a
green suite is only evidence for the commit it ran on.

**T9's expected result was wrong; the app was right.** T9 was written asserting that an
on-budget → off-budget transfer shows "Transfer" in the category cell, by analogy with T5.
The run returned "Categorize". Rather than force the assertion, checked
`TransactionsTable.tsx`: the "Transfer" label is gated on `isBudgetTransfer`, meaning
_both_ sides on budget. Money crossing out of the budget is real outflow that still needs
categorising, so the uncategorised prompt is correct behavior. The test now asserts
"Categorize" on the on-budget side and "Off budget" viewed from the other, and documents
why. This is the same trap as the earlier Spent-sign assumption: reasoning by analogy from
a similar-looking case, then being corrected by the app.

**B9 was flaky, and it was the test's fault, not the app's.** B9 failed once on a full run
and passed on retry — the tempting read is "environment." The actual cause:
`setBudgetedAmount` returns once the input is committed, but the budget sheet recomputes
asynchronously, so reading the category balance immediately after can capture a
pre-recalculation value. The transfer then moves the settled amount and the assertion
compares against a stale baseline, which never reconciles. Fixed by polling the budgeted
value to settle before reading any baseline, then confirmed with `--repeat-each=4` (4/4
clean) and `--repeat-each=2` across both spec files (44/44, zero flaky). A retry-pass is a
symptom, not a diagnosis.

## Technique notes

- Used plan mode (`EnterPlanMode`/`ExitPlanMode`) before starting implementation, and
  again mid-stream to revise the plan after a second review pass.
- For anything with ambiguous or undefined UI behavior (B6, T7, T8's expected results, the
  date-field interaction, the Spent sign, the future-dated-transaction "Convert to
  schedule?" prompt), exercised the running Docker-hosted app directly with a throwaway
  Playwright script before writing the real assertion, rather than guessing from reading
  source alone. Several of these guesses would have been wrong (see Corrections above).
- No slash command was extracted. The repeated pattern (write a throwaway `.mjs` probe
  script against the container, delete it after) stayed cheap enough as one-off Bash calls
  that formalizing it wasn't worth it for a two-spec-file exercise.

## Plan files

`PLAN.md` in this folder is a snapshot of the implementation plan as of Phase 1. It won't
track every subsequent decision blow-by-blow — this file and `TEST_PLAN.md` are the
up-to-date record of what actually happened and why.
