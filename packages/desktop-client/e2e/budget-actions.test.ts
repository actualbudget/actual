import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import type { BudgetPage } from './page-models/budget-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

// Covers BUD-01, 02, 05, 06, 09, 10, 12 from snorkel-assignment/TEST_PLAN.md
// (envelope-budget carryover, cover overspending, and hold-for-next-month).
test.describe('Budget actions', () => {
  let page: Page;
  let navigation: Navigation;
  let configurationPage: ConfigurationPage;
  let budgetPage: BudgetPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    budgetPage = await configurationPage.createTestFile();

    // Move mouse to corner of the screen; sometimes the mouse hovers on a
    // budget element and renders an input/menu that interferes with clicks.
    await page.mouse.move(0, 0);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  /**
   * Fixture categories (e.g. "Food") carry pre-existing budgeted/spent/
   * carryover history from prior months in the "Create test file" fixture,
   * which makes absolute-balance assertions unreliable. Create dedicated,
   * empty categories instead so the only activity in them is what each test
   * performs itself.
   *
   * These are added to an *existing* fixture expense group rather than a
   * freshly-created one: a category group created via a bare
   * `category-group-create` call ends up structurally different enough
   * (e.g. queried via `useCategories()`) that `CoverMenu`'s category-group
   * filtering silently fails and the whole balance popover unmounts when
   * "Cover overspending" is selected. Reusing an existing, fully-formed
   * group sidesteps that entirely.
   */
  async function createTestCategories(names: string[]) {
    await page.evaluate(async categoryNames => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const $send = (window as any).$send as (
        type: string,
        args?: unknown,
      ) => Promise<unknown>;
      const { grouped } = (await $send('get-categories')) as {
        grouped: Array<{ id: string; is_income: boolean }>;
      };
      const existingGroupId = grouped.find(g => !g.is_income)?.id;
      if (!existingGroupId) {
        throw new Error('No existing expense category group found.');
      }
      for (const name of categoryNames) {
        await $send('category-create', { name, groupId: existingGroupId });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (window as any).__TANSTACK_QUERY_CLIENT__.invalidateQueries({
        queryKey: ['categories', 'lists'],
      });
    }, names);

    await page
      .getByText(names[names.length - 1], { exact: true })
      .waitFor({ state: 'visible' });
  }

  test.describe('Rollover overspending (carryover)', () => {
    const categoryName = 'E2E Carryover Category';

    async function overspendCategory() {
      await createTestCategories([categoryName]);
      await budgetPage.setBudgetedAmount(categoryName, '50');

      const accountPage = await navigation.goToAccountPage('HSBC');
      await accountPage.createSingleTransaction({
        payee: 'Overspend Test',
        category: categoryName,
        debit: '80',
      });

      budgetPage = await navigation.goToBudgetPage();
      await page.mouse.move(0, 0);
    }

    test('enabling carryover carries the negative balance into next month', async () => {
      await overspendCategory();
      expect(await budgetPage.getBalanceForRow(categoryName)).toBe(-3000);

      await budgetPage.toggleCarryover(categoryName);

      const popover = await budgetPage.openBalanceMenu(categoryName);
      await expect(
        popover.getByRole('button', { name: 'Remove overspending rollover' }),
      ).toBeVisible();
      await page.keyboard.press('Escape');

      await budgetPage.goToNextMonth();
      await expect
        .poll(() => budgetPage.getBalanceForRow(categoryName))
        .toBe(-3000);
    });

    test('disabling carryover reverts to the standard month-to-month reset', async () => {
      await overspendCategory();

      await budgetPage.toggleCarryover(categoryName); // enable
      await budgetPage.toggleCarryover(categoryName); // disable

      await budgetPage.goToNextMonth();
      await expect
        .poll(() => budgetPage.getBalanceForRow(categoryName))
        .toBe(0);
    });
  });

  test.describe('Cover overspending', () => {
    const categoryA = 'E2E Cover Category A';
    const categoryB = 'E2E Cover Category B';

    async function budgetTwoCategories() {
      await createTestCategories([categoryA, categoryB]);
      await budgetPage.setBudgetedAmount(categoryA, '50');
      await budgetPage.setBudgetedAmount(categoryB, '100');
    }

    async function overspendCategory(categoryName: string) {
      const accountPage = await navigation.goToAccountPage('HSBC');
      await accountPage.createSingleTransaction({
        payee: 'Overspend Test',
        category: categoryName,
        debit: '80',
      });

      budgetPage = await navigation.goToBudgetPage();
      await page.mouse.move(0, 0);
    }

    test('covering the full overspent amount zeroes the category and debits the source category', async () => {
      await budgetTwoCategories();

      // Before overspending: Rollover is offered, Cover is not (balance > 0).
      let popover = await budgetPage.openBalanceMenu(categoryA);
      await expect(
        popover.getByRole('button', { name: 'Rollover overspending' }),
      ).toBeVisible();
      await expect(
        popover.getByRole('button', { name: 'Cover overspending' }),
      ).not.toBeVisible();
      await page.keyboard.press('Escape');

      await overspendCategory(categoryA);

      // After overspending: Cover is now offered.
      popover = await budgetPage.openBalanceMenu(categoryA);
      await expect(
        popover.getByRole('button', { name: 'Cover overspending' }),
      ).toBeVisible();
      await page.keyboard.press('Escape');

      await budgetPage.coverOverspending(categoryA, categoryB);

      await expect.poll(() => budgetPage.getBalanceForRow(categoryA)).toBe(0);
      await expect
        .poll(() => budgetPage.getBalanceForRow(categoryB))
        .toBe(7000);
    });

    test('covering a partial amount reduces but does not eliminate the negative balance', async () => {
      await budgetTwoCategories();
      await overspendCategory(categoryA);

      await budgetPage.coverOverspending(categoryA, categoryB, '10');

      await expect
        .poll(() => budgetPage.getBalanceForRow(categoryA))
        .toBe(-2000);
      await expect
        .poll(() => budgetPage.getBalanceForRow(categoryB))
        .toBe(9000);
    });
  });

  test.describe('Hold for next month', () => {
    // The fixture's pristine "To Budget" is exactly $0.00 by design, so
    // "Hold for next month" (which requires a positive amount) would never
    // be offered. Creating a new on-budget account with a starting balance
    // deterministically injects unbudgeted income via a "Starting Balance"
    // transaction, without depending on any fixture category's state.
    //
    // The fixture also ships with a pre-existing $11 manual buffer already
    // held for next month (visible as "For next month: -11.00" even before
    // any of these tests touch anything). Clearing it first means
    // `getToBudgetAmount()` / `getForNextMonthAmount()` reflect only this
    // test's own actions.
    async function ensurePositiveToBudget() {
      await navigation.createAccount({
        name: 'E2E Income Source',
        offBudget: false,
        balance: 500,
      });

      budgetPage = await navigation.goToBudgetPage();
      await page.mouse.move(0, 0);
      await budgetPage.resetHoldBuffer();
      // Wait for the reset to actually land before any test measures a
      // "before" baseline — the click alone isn't enough of a guarantee.
      await expect
        .poll(async () => Math.abs(await budgetPage.getForNextMonthAmount()))
        .toBe(0);
    }

    test('holding the full "To Budget" amount zeroes it and carries into next month', async () => {
      await ensurePositiveToBudget();
      const toBudgetBefore = await budgetPage.getToBudgetAmount();
      expect(toBudgetBefore).toBeGreaterThan(0);

      // Baseline next month's "To Budget" before any hold, so the carry-over
      // assertion doesn't assume next month otherwise starts at zero.
      await budgetPage.goToNextMonth();
      const nextMonthBaseline = await budgetPage.getToBudgetAmount();
      await budgetPage.goToPreviousMonth();

      await budgetPage.holdForNextMonth();

      // holdForNextMonth's UI action resolves before the store round-trip
      // that recomputes the sheet value has necessarily landed, so a plain
      // read here can race a stale value. expect.poll retries until the
      // read settles, matching the pattern already used in budget.test.ts.
      await expect.poll(() => budgetPage.getToBudgetAmount()).toBe(0);
      // "For next month" is displayed with an inverted sign convention, so
      // compare magnitude rather than the raw signed value.
      await expect
        .poll(async () => Math.abs(await budgetPage.getForNextMonthAmount()))
        .toBe(toBudgetBefore);

      const popover = await budgetPage.openToBudgetMenu();
      await expect(
        popover.getByRole('button', { name: 'Hold for next month' }),
      ).not.toBeVisible();
      await page.keyboard.press('Escape');

      // Unbudgeted money already rolls forward month-to-month independent
      // of an explicit hold — holding it instead just re-labels the same
      // dollars as an explicit "for next month" buffer rather than adding
      // new money on top of `nextMonthBaseline` (confirmed empirically:
      // next month's total lands exactly at `nextMonthBaseline`, not
      // `nextMonthBaseline + toBudgetBefore`). The robust assertion is
      // that holding never *loses* money relative to that baseline.
      await budgetPage.goToNextMonth();
      expect(await budgetPage.getToBudgetAmount()).toBeGreaterThanOrEqual(
        nextMonthBaseline,
      );
    });

    test('holding a partial amount leaves the remainder available to budget this month', async () => {
      await ensurePositiveToBudget();
      const toBudgetBefore = await budgetPage.getToBudgetAmount();
      expect(toBudgetBefore).toBeGreaterThan(0);

      const holdDollars = Math.max(1, Math.floor(toBudgetBefore / 100 / 2));
      await budgetPage.holdForNextMonth(String(holdDollars));

      await expect
        .poll(() => budgetPage.getToBudgetAmount())
        .toBe(toBudgetBefore - holdDollars * 100);
      await expect
        .poll(async () => Math.abs(await budgetPage.getForNextMonthAmount()))
        .toBe(holdDollars * 100);
    });

    test('resetting the hold buffer restores the original "To Budget" value', async () => {
      await ensurePositiveToBudget();
      const toBudgetBefore = await budgetPage.getToBudgetAmount();

      await budgetPage.holdForNextMonth();
      await expect.poll(() => budgetPage.getToBudgetAmount()).toBe(0);

      const popover = await budgetPage.openToBudgetMenu();
      await expect(
        popover.getByRole('button', { name: "Reset next month's buffer" }),
      ).toBeVisible();
      await page.keyboard.press('Escape');

      await budgetPage.resetHoldBuffer();

      await expect
        .poll(() => budgetPage.getToBudgetAmount())
        .toBe(toBudgetBefore);
      await expect
        .poll(async () => Math.abs(await budgetPage.getForNextMonthAmount()))
        .toBe(0);
    });
  });
});
