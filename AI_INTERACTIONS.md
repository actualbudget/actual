# AI Agent Interactions

**Tool used:** Claude Code (claude-sonnet-4-6) — an interactive AI coding agent running in VS Code.

This document records the actual prompts, findings, and decisions made during the exercise. It is not a reflection after the fact — these are the real interactions and the reasoning behind each.

---

## Interaction 1 — Codebase Exploration

**My prompt:**

> "Help me explore the project structure and identify gaps in test coverage. What features exist and which are least tested?"

**What AI did:**

- Listed all existing E2E test files (`budget`, `transactions`, `accounts`, `rules`, `schedules`, `reports`, etc.)
- Read each test file and counted tests per feature
- Identified that `budget.test.ts` had only 4 tests despite being the app's core feature

**My decision:**
I chose **Budget** as the primary feature because:

1. It's the app's core differentiator (envelope budgeting methodology)
2. Existing tests only verified basic rendering, not any business logic
3. The business logic is complex enough to write meaningful assertions against

I chose **Transactions** as the secondary feature because it feeds directly into budget balances — testing them together would prove the system works end-to-end.

---

## Interaction 2 — Initial Test Plan

**My prompt:**

> "Create a test plan for Envelope Budgeting and Transaction Management. Cover the full lifecycle: create, allocate, transfer, persist, delete."

**AI's output:** A structured 15-case plan with test IDs, steps, and expected results.

**What I changed:**

- Removed test cases that were too complex for the time available (month rollover, multi-month planning)
- Added a cross-feature test (TC-B10) that AI didn't suggest: "spending transaction reduces envelope balance". This tests the system boundary between the two features.
- Identified that the original plan had cases with no clear selector strategy — revised to include implementation notes

---

## Interaction 3 — Discovering the parseInt Bug

**My prompt:**

> "I want to write a test that verifies the table total budgeted changes by exactly the right amount when I edit a category. Can you help me implement this?"

**AI wrote:**

```typescript
const totals = await budgetPage.getTableTotals();
expect(totals.budgeted).not.toBe(before.budgeted);
```

**Test ran, failed with:** `Expected: -10000, Received: 30000000`

**My investigation:**
The delta of 30,000,000 cents ($300,000) made no sense for a $300 input. I asked AI to trace the `getTableTotals()` implementation.

**AI found:**

```typescript
return parseInt(totalBudgetedText, 10); // in getTotalBudgeted()
```

`parseInt("3,787.86", 10)` → `3`. The comma stops the parse. Values ≥ $1,000 silently returned only their leading digit group.

**Fix applied:**

```typescript
private parseCurrencyText(text: string): number {
  return Math.round(parseFloat(text.replace(/,/g, '')) * 100);
}
```

**Why this matters:** This bug was in the existing codebase before I started. All prior tests using `getTableTotals()` were passing with wrong values — they never asserted on the actual numbers, only that a number was returned. Writing a test with a real numeric assertion was what exposed it.

---

## Interaction 4 — Debugging the "Add category" Button

**My prompt:**

> "I'm trying to click the 'Add category' button in the budget table. `getByRole('button', { name: 'Add category' })` returns 0 elements. What's happening?"

**AI's first guess:** Opacity:0 via `hover-visible` CSS class. Suggested `force:true`.

**Result:** Still 0 elements from `getByRole`. `force:true` had nothing to click.

**My investigation:** I wrote a DOM inspection test:

```typescript
const byAriaLabel = await page.locator('[aria-label="Add category"]').all();
console.log('count:', byAriaLabel.length); // → 3

const style = await byAriaLabel[0].evaluate(
  el => window.getComputedStyle(el).display,
);
console.log('display:', style); // → "none"
```

**Key finding:** `display:none`, not `opacity:0`. Playwright's accessibility tree excludes `display:none` elements, which is why `getByRole` found nothing. `force:true` also fails because the element has no bounding box.

**Solution — iterative:**

1. Tried hovering `getByText('Usual Expenses')` → display stayed `none`
2. Tried hovering `firstGroupRow` → display stayed `none`
3. Discovered the correct target is the **5th DOM ancestor** of the button

```typescript
const addCategoryBtn = page.locator('[aria-label="Add category"]').first();
await addCategoryBtn.locator('xpath=ancestor::*[5]').hover();
// display is now 'flex'
await addCategoryBtn.evaluate((el: HTMLElement) => el.click());
// input appears ✓
```

**Why `el.evaluate()` not `dispatchEvent('click')`:** React Aria's `onPress` responds to the browser's native click event chain. `HTMLElement.click()` via `evaluate` triggers the full event sequence that React Aria listens to, whereas `dispatchEvent('click')` was later flagged in code review as not reliably activating the `onPress` handler. `el.evaluate()` is consistent with how the existing navigation page model handles similar React Aria buttons.

**Lesson:** When a button is hidden via `display:none` controlled by ancestor hover CSS, hover the ancestor first, then use `el.evaluate((el: HTMLElement) => el.click())` to activate React Aria components reliably.

---

## Interaction 5 — Extending Coverage to Secondary Features

After completing the two primary features, I asked Claude Code to generate tests for three additional features (Rules, Schedules, Reports) in the same session.

**My prompt:**

> "Now extend coverage to Rules, Schedules, and Reports. For each feature: read the existing page model, identify what's untested, and write focused tests. These three features are independent — treat them separately."

**Why these three were treated independently:**

Rules, Schedules, and Reports have no shared state and no ordering dependency between them. This made them natural candidates to hand off to AI feature-by-feature rather than one large prompt — each prompt was self-contained and focused.

**What I had to fix after each:**

- Rules: passed on first run ✓
- Schedules: AI suggested `_performNthAction(2, 'Edit')` but the action menu has no "Edit" option — discovered by running the test. Replaced with a named-schedule creation test.
- Reports: `getByText('Net Worth')` matched 3 elements (strict mode violation) — scoped to unique text `"How is net worth calculated?"` which only appears on the Net Worth detail page.

**My decision on sequencing:** For the primary features (Budget + Transactions) I drove the implementation myself because they have a cross-feature dependency — the integration test requires both features to work correctly together. For the secondary features there was no such dependency, so handing each off to AI independently was appropriate and efficient.

**Contrast with primary features:** The Budget and Transaction tests required more iteration — finding the `parseInt` bug, debugging the Add category button, discovering the group header row issue. The secondary feature tests were faster to produce because they were more straightforward UI interactions without hidden state dependencies.

---

## Interaction 6 — Selector Pattern for Budget Cells

**Problem:** Tests were passing but with incorrect behavior. Setting a budget value, reloading, and checking the balance gave the same value before and after — but the budget wasn't actually being changed.

**AI identified:** Row index 0 in the budget table is a **group header row** (not editable). The budget cell on a group header shows a read-only summary, not an input. My test was clicking a non-editable cell, nothing changed, and the assertion `expect(before).toBe(after)` trivially passed.

**Fix:** Use `nth(1)` (first actual category row) instead of `.first()` or `.nth(0)`.

**The broader pattern:** This is an example of a test that passes for the wrong reason — a common E2E pitfall. The fix required understanding the difference between group rows and category rows in the virtualized budget table.

---

## Interaction 7 — Addressing Code Review Feedback

After the PR was opened, a code reviewer flagged several issues. I used AI to systematically work through each one.

**Review issues and fixes:**

| Issue                                                                  | Fix applied                                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `disabledSetupButton` aliased the enabled button                       | Narrowed to `button[disabled], button[aria-disabled="true"]` selector           |
| `waitFor` advertised `'attached'`/`'detached'` states it never honored | Constrained type to `'visible' \| 'hidden'` in bank-sync and payees page models |
| `getAllRows()` was page-wide and could match unrelated rows            | Anchored to `page.getByTestId('table')` container                               |
| `parseCurrencyText` missed Unicode minus sign (U+2212)                 | Added `.replace(/−/g, '-')` normalization before parsing                        |
| `dispatchEvent('click')` unreliable for React Aria `onPress`           | Replaced with `el.evaluate((el: HTMLElement) => el.click())`                    |
| `waitForTimeout` fixed sleeps are flaky under CI load                  | Replaced with state-based waits: `not.toHaveValue`, `not.toBeVisible`, `toPass` |
| Parallel tests sharing mutable `let localCustomReportPage`             | Moved page model instantiation inside each test to eliminate shared state       |

**What required iteration:**

- The escape-cancel test: replacing `waitForTimeout(500)` with `expect(...).not.toBeVisible()` failed because the SheetCell keeps the textbox mounted after Escape — it resets the value but doesn't hide the input. Correct wait: `expect(budgetCell.getByRole('textbox')).not.toHaveValue('999999')`.
- The payees container testid: `payees-list` didn't exist in the DOM. Discovered the correct container is `table` (consistent with the rules page model pattern) by checking the failure message.

**Key insight:** Code review surfaced issues that passing tests can't catch — type contract mismatches, selector scope bugs, and shared state under parallel execution. AI was effective at implementing the fixes once the root cause was identified; the iteration happened in diagnosing the two failures above.

---

## Interaction 8 — Configuring slowMo for Demo Visibility

**The problem:** When running tests at full Playwright speed, every interaction completes in milliseconds — clicks, fills, navigations all flash by too fast to follow visually. For a submission that would be reviewed and demoed, this makes the tests look like a black box.

**My prompt:**

> "Can we add a slow down so the interviewer will know UI interactions?"

**What AI did:** Added `launchOptions.slowMo` to `playwright.config.ts`:

```typescript
launchOptions: {
  slowMo: parseInt(process.env.PLAYWRIGHT_SLOW_MO ?? '0'),
},
```

**Why 0 as default (not 500):** The original implementation defaulted to 500ms in non-CI environments. A code reviewer correctly flagged this — adding a fixed 500ms delay to every local Playwright action by default slows down all developers who clone this repo. The right default is 0 (no slowdown); slowMo is opt-in via the environment variable.

**How to use for demo:**
```bash
PLAYWRIGHT_SLOW_MO=500 yarn playwright test budget.test.ts --browser=chromium --headed
```

**Decision:** This is a presentation concern, not a test correctness concern. The tests pass at any speed — slowMo only affects how visible the interactions are to a human watching the browser. Keeping it opt-in means it doesn't affect CI or other developers.

---

## Summary: What AI Was Good At

| Task                                                     | AI Effectiveness                     |
| -------------------------------------------------------- | ------------------------------------ |
| Reading existing test patterns and following them        | High                                 |
| Identifying test coverage gaps by scanning the codebase  | High                                 |
| Writing initial test code that compiles and runs         | High                                 |
| Explaining why a selector wasn't working                 | Medium — needed iteration            |
| Predicting exact behavior of hover-triggered CSS         | Low — required manual DOM inspection |
| Knowing which action menu items actually exist in the UI | Low — had to verify by running       |

**Key insight:** AI accelerates the first 80% of E2E test writing. The last 20% — subtle DOM structure, CSS interaction patterns, confirmation dialogs, selector ambiguities — requires running the tests in a real browser and iterating based on what you see. The most valuable AI usage in this exercise was using it to interpret failures and trace root causes, not to write tests from scratch.
