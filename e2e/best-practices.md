# E2E Framework Best Practices

Standards and conventions for the `actual/e2e/` Playwright framework.

---

## 1. Page Objects

**Rule:** Page objects encapsulate _user actions_, never assertions.

```typescript
// ✅ Correct — page object exposes an action
async createLocalAccount(name: string, balance: number): Promise<void> {
  await this.openAddAccountModal();
  await this.getByLabel('Name').fill(name);
  await this.getByLabel('Balance').fill(String(balance));
  await this.getByRole('button', { name: 'Create', exact: true }).click();
}

// ❌ Wrong — assertion inside page object leaks test logic
async createLocalAccount(name: string, balance: number): Promise<void> {
  // ...
  await expect(this.sidebar).toContainText(name); // belongs in the spec file
}
```

**Rule:** Each page class extends `BasePage`. Use `BasePage`'s protected helpers
(`getByTestId`, `getByRole`, etc.) to avoid importing from `@playwright/test` directly.

**Rule:** Expose locators as `get` properties, not methods, so callers can chain
Playwright locator APIs (`.hover()`, `.waitFor()`, etc.) without extra wrapping.

```typescript
get accountBalance(): Locator {
  return this.getByTestId('account-balance');
}
```

**Rule:** One class per meaningful UI region. `TransactionPage` represents the
inline entry form even though it is not a standalone route — the class boundary
is the _form_, not the URL.

---

## 2. Fixtures

**Rule:** Import `test` and `expect` from `fixtures/test-fixtures.ts`, not from
`@playwright/test`. This applies to every spec file.

```typescript
// ✅ Correct
import { test, expect } from '../fixtures/test-fixtures';

// ❌ Wrong — bypasses the page fixture override that sets up the app
import { test, expect } from '@playwright/test';
```

**Rule:** The `page` fixture override in `test-fixtures.ts` is the single place
where app-level setup (navigating through the initial screens) lives. Never
duplicate this logic in individual tests.

**Rule:** Use the narrowest fixture scope needed:

- Use test-scoped fixtures (default) for page objects and per-test state.
- Use worker-scoped fixtures only when state genuinely needs to be shared
  across all tests in a worker (e.g. expensive one-time computations).

---

## 3. Lifecycle Hooks

| Hook         | Purpose                                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beforeAll`  | Worker-level one-time setup (e.g. seeding a shared resource via API). Avoid for anything page-based since `page` is test-scoped.                         |
| `beforeEach` | Navigate to a predictable starting state before each test. Keep it short — heavy setup belongs in fixtures.                                              |
| `afterEach`  | Clean up test data created during the test (e.g. close the account). Use `.catch(() => {})` to prevent cleanup errors from masking the original failure. |
| `afterAll`   | Tear down worker-level resources created in `beforeAll`.                                                                                                 |

```typescript
test.afterEach(async ({ accountPage, page }) => {
  if (createdAccountName && /\/accounts\//.test(page.url())) {
    await accountPage.closeAccount().catch(() => {});
  }
});
```

---

## 4. Test Data

**Rule:** Always generate test data with timestamps to prevent collisions in
parallel runs.

```typescript
// ✅ Correct — unique name per test
const account = generateAccountData({ name: `Checking ${Date.now()}` });

// ❌ Wrong — two parallel workers will collide on this name
const account = generateAccountData({ name: 'My Test Account' });
```

**Rule:** Use `generateAccountData()` and `generateTransactionData()` from
`fixtures/test-data.ts` rather than hand-writing literals. This keeps defaults
consistent and makes overrides explicit.

**Rule:** Dollar amounts in test data are plain numbers (`500` = $500.00). Use
`parseMoney` from `utils/money-utils.ts` when comparing against UI text, and
`computeExpectedBalance` when computing expected post-transaction values.

---

## 5. Cleanup

**Rule:** Each test cleans up the data it creates. For Actual Budget, "cleanup"
means closing the account via `AccountPage.closeAccount()`.

**Rule:** Cleanup runs in `afterEach`, not inside the test body. This ensures
it runs even when the test fails.

**Rule:** Wrap cleanup calls in `.catch(() => {})` so that a cleanup failure does
not shadow the original test error.

**Rule:** Since the browser's OPFS (Origin Private File System) is reset on
every new browser context, cleanup is less critical for total isolation. Still
do it to avoid a cluttered sidebar that could confuse locator matching in
subsequent tests within the same context.

---

## 6. Parallel Execution

**Rule:** Tests must be fully independent — no shared mutable state between tests.

**Rule:** Use `Date.now()` in all entity names (accounts, payees) to prevent
name collisions when tests run in parallel across workers.

**Rule:** Never use a fixed initial account balance that another test might
also rely on. Each test generates its own account with its own initial balance.

**Rule:** The `playwright.config.ts` sets `fullyParallel: true`. Do not add
`test.describe.configure({ mode: 'serial' })` unless tests have an unavoidable
ordering dependency (which should be a signal to refactor, not a tool to reach for).

---

## 7. TypeScript Style

- All exported symbols are typed — no `any`, no implicit `any`.
- Use TypeScript `interface` (not `type`) for data model shapes.
- Use `type` imports (`import { type Locator }`) for types that are erased at runtime.
- Return types are explicit on all public methods in page objects and utils.
- Prefer `const` over `let`; never use `var`.
- Error-handling in cleanup uses empty `.catch(() => {})` — document why with a comment.

---

## 8. Locator Strategy

Priority order (most preferred → least preferred):

1. **`data-testid`** — deterministic, survives copy/layout changes.

   ```typescript
   page.getByTestId('account-balance');
   ```

2. **ARIA role + accessible name** — tests real accessibility and is resilient
   to DOM restructuring.

   ```typescript
   page.getByRole('button', { name: 'Add account' });
   page.getByRole('link', { name: /^Checking/ });
   ```

3. **Label** — good for form inputs.

   ```typescript
   page.getByLabel('Name');
   ```

4. **Placeholder / visible text** — use only when testid/role/label are absent.

   ```typescript
   page.getByPlaceholder('Select account...');
   ```

5. **CSS selector / XPath** — last resort only. Never use positional XPath like
   `nth-child` for UI elements that may reorder.

**Anti-patterns to avoid:**

```typescript
// ❌ Positional CSS — breaks when DOM order changes
page.locator('.sidebar > div:nth-child(3)');

// ❌ Text match on financial amounts — breaks with locale or rounding
page.getByText('$500.00');

// ❌ Hard-coded sleep — always use waitFor / expect with timeout
await page.waitForTimeout(2000);
```

---

## 9. Avoiding Flakiness

- Never use `page.waitForTimeout()`. Use `waitFor({ state })`, `waitForURL`,
  `waitForLoadState`, or `expect(locator).toBeVisible()` instead.
- Scope locators tightly. `page.getByTestId('row').nth(0)` is ambiguous if
  multiple tables exist — scope to the parent: `transactionTable.getByTestId('row').nth(0)`.
- The `playwright.config.ts` sets `reducedMotion: 'reduce'` and retries on
  first failure — these absorb transient animation races without needing sleeps.

---

## 10. Adding New Tests

1. Add any required page object methods to the appropriate class under `pages/`.
2. Add new data interfaces / factories to `fixtures/test-data.ts` if needed.
3. Write the spec in `tests/` using the standard import from `../fixtures/test-fixtures`.
4. Run `npm run typecheck` before committing.
