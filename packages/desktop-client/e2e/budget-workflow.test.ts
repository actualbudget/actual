import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import type { AccountPage } from './page-models/account-page';
import type { BudgetPage } from './page-models/budget-page';
import type { Navigation } from './page-models/navigation';
import { setBudgetedAmountAndSettle } from './qe-budget';
import { DEMO_CATEGORY_ROW, DEMO_SEEDED_ACCOUNT } from './qe-demo-data';
import { closeDemoSession, createDemoSession } from './qe-session';

const FOOD_ROW = DEMO_CATEGORY_ROW.Food;
const RESTAURANTS_ROW = DEMO_CATEGORY_ROW.Restaurants;
const ENTERTAINMENT_ROW = DEMO_CATEGORY_ROW.Entertainment;

test.describe('Budget workflow', () => {
  let page: Page;
  let navigation: Navigation;
  let budgetPage: BudgetPage;

  test.beforeEach(async ({ browser }) => {
    ({ page, navigation, budgetPage } = await createDemoSession(browser));
  });

  test.afterEach(async () => {
    await closeDemoSession({ page });
  });

  test('B1: budgeting an amount updates the category and the Budgeted total by the same delta', async () => {
    const budgetedBefore = await budgetPage.getBudgetedForRow(FOOD_ROW);
    const balanceBefore = await budgetPage.getBalanceForRow(FOOD_ROW);
    const totalsBefore = await budgetPage.getTableTotals();

    await budgetPage.setBudgetedAmount('Food', '500.00');
    const delta = 50000 - budgetedBefore;

    await expect
      .poll(() => budgetPage.getBudgetedForRow(FOOD_ROW))
      .toEqual(50000);
    await expect
      .poll(() => budgetPage.getBalanceForRow(FOOD_ROW))
      .toEqual(balanceBefore + delta);

    const totalsAfter = await budgetPage.getTableTotals();
    expect(totalsAfter.budgeted).toEqual(totalsBefore.budgeted + delta);
  });

  test('B2: a transaction in a category moves Spent and balance by the same amount (cross-feature)', async () => {
    const spentBefore = await budgetPage.getSpentForRow(RESTAURANTS_ROW);
    const balanceBefore = await budgetPage.getBalanceForRow(RESTAURANTS_ROW);

    const accountPage: AccountPage =
      await navigation.goToAccountPage(DEMO_SEEDED_ACCOUNT);
    await accountPage.waitFor();
    await accountPage.createSingleTransaction({
      payee: 'Test Restaurant',
      category: 'Restaurants',
      debit: '23.45',
    });

    budgetPage = await navigation.goToBudgetPage();

    // Spent is displayed as a negative number in this app (confirmed by
    // direct observation), so spending more makes it more negative.
    await expect
      .poll(() => budgetPage.getSpentForRow(RESTAURANTS_ROW))
      .toEqual(spentBefore - 2345);
    await expect
      .poll(() => budgetPage.getBalanceForRow(RESTAURANTS_ROW))
      .toEqual(balanceBefore - 2345);
  });

  test('B3: overspending surfaces in the Overspent summary; covering it zeroes the overspend and debits the source category', async () => {
    const balanceBefore = await budgetPage.getBalanceForRow(RESTAURANTS_ROW);
    // Spend well past the category's current balance so it goes negative
    // regardless of the demo data's starting values.
    const overspendAmount = balanceBefore / 100 + 50;

    const accountPage: AccountPage =
      await navigation.goToAccountPage(DEMO_SEEDED_ACCOUNT);
    await accountPage.waitFor();
    await accountPage.createSingleTransaction({
      payee: 'Big Dinner',
      category: 'Restaurants',
      debit: overspendAmount.toFixed(2),
    });

    budgetPage = await navigation.goToBudgetPage();

    await expect
      .poll(() => budgetPage.getBalanceForRow(RESTAURANTS_ROW))
      .toBeLessThan(0);
    await expect(
      budgetPage.budgetSummary.first().getByText(/^Overspent in /),
    ).toBeVisible();

    const overspentAmount =
      -(await budgetPage.getBalanceForRow(RESTAURANTS_ROW));

    // Guarantee the source category has enough to cover, independent of
    // demo data.
    await setBudgetedAmountAndSettle(budgetPage, 'Food', FOOD_ROW, '1000.00');
    const sourceBalanceBeforeCover =
      await budgetPage.getBalanceForRow(FOOD_ROW);

    await budgetPage.coverOverspending(RESTAURANTS_ROW, 'Food');

    await expect
      .poll(() => budgetPage.getBalanceForRow(RESTAURANTS_ROW))
      .toEqual(0);
    await expect
      .poll(() => budgetPage.getBalanceForRow(FOOD_ROW))
      .toEqual(sourceBalanceBeforeCover - overspentAmount);
  });

  test('B4: a positive category balance carries forward to next month', async () => {
    // Guarantee a positive balance to roll over, independent of demo data.
    await setBudgetedAmountAndSettle(budgetPage, 'Food', FOOD_ROW, '1000.00');
    const balanceThisMonth = await budgetPage.getBalanceForRow(FOOD_ROW);
    expect(balanceThisMonth).toBeGreaterThan(0);

    await budgetPage.goToNextMonth();

    await expect.poll(() => budgetPage.getBudgetedForRow(FOOD_ROW)).toEqual(0);
    await expect
      .poll(() => budgetPage.getBalanceForRow(FOOD_ROW))
      .toEqual(balanceThisMonth);
  });

  test("B5: a transaction dated next month hits next month's Spent, not the current month's", async () => {
    const spentThisMonthBefore =
      await budgetPage.getSpentForRow(ENTERTAINMENT_ROW);

    // Read next month's baseline too, in case demo data already seeds a
    // next-month transaction -- keeps this a delta assertion either way.
    await budgetPage.goToNextMonth();
    const spentNextMonthBefore =
      await budgetPage.getSpentForRow(ENTERTAINMENT_ROW);
    await budgetPage.goToPrevMonth();

    // Derive "next month" from the app's own current month, not the host
    // clock: under Playwright, months.ts's currentMonth() is hardcoded to
    // '2017-01' (Platform.isPlaywright check) for deterministic E2E runs,
    // so real-world "today" is the wrong reference point here.
    const [year, month] = (await budgetPage.getSelectedMonth())
      .split('-')
      .map(Number);
    const nextMonthDate = new Date(year, month, 15); // `month` (1-indexed) as the Date constructor's 0-indexed arg is next month.
    const dateStr = `${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}/${String(
      nextMonthDate.getDate(),
    ).padStart(2, '0')}/${nextMonthDate.getFullYear()}`;

    const accountPage: AccountPage =
      await navigation.goToAccountPage(DEMO_SEEDED_ACCOUNT);
    await accountPage.waitFor();
    await accountPage.createSingleTransaction({
      payee: 'Future Concert',
      category: 'Entertainment',
      debit: '75.00',
      date: dateStr,
    });

    budgetPage = await navigation.goToBudgetPage();

    // This month's Spent is unaffected by a next-month transaction.
    await expect
      .poll(() => budgetPage.getSpentForRow(ENTERTAINMENT_ROW))
      .toEqual(spentThisMonthBefore);

    await budgetPage.goToNextMonth();
    // Spent is negative in this app; spending more makes it more negative.
    await expect
      .poll(() => budgetPage.getSpentForRow(ENTERTAINMENT_ROW))
      .toEqual(spentNextMonthBefore - 7500);
  });

  test('B6: budgeting a negative or non-numeric amount is accepted without validation', async () => {
    const budgetedBefore = await budgetPage.getBudgetedForRow(FOOD_ROW);
    const balanceBefore = await budgetPage.getBalanceForRow(FOOD_ROW);

    await budgetPage.setBudgetedAmount('Food', '-50');
    const deltaNegative = -5000 - budgetedBefore;

    await expect
      .poll(() => budgetPage.getBudgetedForRow(FOOD_ROW))
      .toEqual(-5000);
    // No special-casing for negative input -- balance moves by the same
    // delta arithmetic B1 exercises for positive amounts.
    await expect
      .poll(() => budgetPage.getBalanceForRow(FOOD_ROW))
      .toEqual(balanceBefore + deltaNegative);

    // Non-numeric input is coerced to 0, not rejected or reverted.
    await budgetPage.setBudgetedAmount('Food', 'abc');
    await expect.poll(() => budgetPage.getBudgetedForRow(FOOD_ROW)).toEqual(0);
  });

  test('B7: an overspent category starts the next month at zero -- the negative balance does not carry forward', async () => {
    // The counterpart to B4: a *positive* balance rolls over, a negative one
    // does not. envelope.ts's `leftover-${cat.id}` adds the previous month's
    // `leftover-pos` (clamped at 0 by `leftover-pos-${cat.id}`) unless that
    // category's `carryover` flag is set, and `carryover` is createStatic'd
    // to false. So last month's overspend is absorbed, not inherited.
    const balanceBefore = await budgetPage.getBalanceForRow(RESTAURANTS_ROW);
    // Same arithmetic as B3: land the balance on exactly -50.00 regardless of
    // what the demo data seeded.
    const overspendAmount = balanceBefore / 100 + 50;

    const accountPage: AccountPage =
      await navigation.goToAccountPage(DEMO_SEEDED_ACCOUNT);
    await accountPage.waitFor();
    await accountPage.createSingleTransaction({
      payee: 'B7 Overspend',
      category: 'Restaurants',
      debit: overspendAmount.toFixed(2),
    });

    budgetPage = await navigation.goToBudgetPage();

    await expect
      .poll(() => budgetPage.getBalanceForRow(RESTAURANTS_ROW))
      .toEqual(-5000);

    await budgetPage.goToNextMonth();

    // Nothing budgeted next month (B4 relies on the same demo-data fact), and
    // the -50.00 did not follow the category across the month boundary.
    await expect
      .poll(() => budgetPage.getBudgetedForRow(RESTAURANTS_ROW))
      .toEqual(0);
    await expect
      .poll(() => budgetPage.getBalanceForRow(RESTAURANTS_ROW))
      .toEqual(0);
  });

  test('B8: a transaction in an off-budget account leaves category Spent and the on-budget total untouched', async () => {
    // The core on-budget/off-budget boundary. base.ts builds each category's
    // `sum-amount` with `AND a.offbudget = 0`, so an off-budget transaction
    // must not reach the budget at all -- it only moves that account's own
    // balance. A regression here would silently distort every category.
    const spentBefore = await budgetPage.getSpentForRow(FOOD_ROW);
    const balanceBefore = await budgetPage.getBalanceForRow(FOOD_ROW);

    const accountPage: AccountPage = await navigation.createAccount({
      name: 'B8 Off Budget',
      offBudget: true,
      balance: 0,
    });
    await accountPage.waitFor();

    const onBudgetBefore =
      await accountPage.sidebarOnBudgetBalance.textContent();

    // Deliberately uncategorised: an off-budget transaction has no business
    // reaching a budget category, so the isolation must hold without one.
    await accountPage.createSingleTransaction({
      payee: 'B8 Payee',
      debit: '99.00',
    });

    // The account's own balance still moves...
    await expect
      .poll(() => accountPage.getAccountBalanceValue())
      .toEqual(-9900);
    // ...but the on-budget total does not, because this account is off budget.
    await expect(accountPage.sidebarOnBudgetBalance).toHaveText(
      onBudgetBefore ?? '',
    );

    budgetPage = await navigation.goToBudgetPage();

    await expect
      .poll(() => budgetPage.getSpentForRow(FOOD_ROW))
      .toEqual(spentBefore);
    await expect
      .poll(() => budgetPage.getBalanceForRow(FOOD_ROW))
      .toEqual(balanceBefore);
  });

  test('B9: transferring a category balance debits the source as well as crediting the destination', async () => {
    // budget.test.ts already exercises transferAllBalance, but only asserts
    // the *destination* gains the money. A transfer that credits the
    // destination without emptying the source would pass that test while
    // inventing money out of nothing. This asserts both halves.
    // Settle before reading baselines -- see setBudgetedAmountAndSettle for
    // why a bare setBudgetedAmount makes this test intermittently fail.
    await setBudgetedAmountAndSettle(budgetPage, 'Food', FOOD_ROW, '600.00');

    const sourceBefore = await budgetPage.getBalanceForRow(FOOD_ROW);
    const destBefore = await budgetPage.getBalanceForRow(RESTAURANTS_ROW);
    expect(sourceBefore).toBeGreaterThan(0);

    await budgetPage.transferAllBalance(FOOD_ROW, RESTAURANTS_ROW);

    // The source is emptied...
    await expect.poll(() => budgetPage.getBalanceForRow(FOOD_ROW)).toEqual(0);
    // ...and the destination gains exactly what the source lost. Nothing is
    // created or destroyed in the move.
    await expect
      .poll(() => budgetPage.getBalanceForRow(RESTAURANTS_ROW))
      .toEqual(destBefore + sourceBefore);
  });

  test("B10: clicking a category's Spent opens a transaction list scoped to that category", async () => {
    // budget.test.ts asserts this drill-down navigates to /accounts, but not
    // that the transactions shown actually belong to the category clicked --
    // a wrong-category drill-down would pass it. This checks the data.
    // Two marker transactions in the same account, differing only by
    // category. Asserting on these two specific payees rather than "every
    // visible row" keeps the test immune to the demo file's pinned
    // schedule-preview rows, which can appear in an all-accounts view.
    const accountPage: AccountPage = await navigation.createAccount({
      name: 'B10 Account',
      offBudget: false,
      balance: 0,
    });
    await accountPage.waitFor();
    await accountPage.createSingleTransaction({
      payee: 'B10 Entertainment Marker',
      category: 'Entertainment',
      debit: '17.00',
    });
    await accountPage.createSingleTransaction({
      payee: 'B10 Food Marker',
      category: 'Food',
      debit: '18.00',
    });

    budgetPage = await navigation.goToBudgetPage();
    await budgetPage.waitFor();

    const drillDown =
      await budgetPage.clickOnSpentAmountForRow(ENTERTAINMENT_ROW);
    await drillDown.waitFor();

    // The Entertainment transaction is listed...
    await expect(
      drillDown.transactionTableRow.filter({
        hasText: 'B10 Entertainment Marker',
      }),
    ).toHaveCount(1);
    // ...and the Food one, from the same account, is filtered out -- so the
    // drill-down is scoped by category, not just showing the whole ledger.
    await expect(
      drillDown.transactionTableRow.filter({ hasText: 'B10 Food Marker' }),
    ).toHaveCount(0);
  });
});
