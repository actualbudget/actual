import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import type { AccountPage } from './page-models/account-page';
import type { BudgetPage } from './page-models/budget-page';
import type { Navigation } from './page-models/navigation';
import { DEMO_CATEGORY_ROW } from './qe-demo-data';
import { readAmountInCents } from './qe-money';
import { closeDemoSession, createDemoSession } from './qe-session';

const FOOD_ROW = DEMO_CATEGORY_ROW.Food;
const RESTAURANTS_ROW = DEMO_CATEGORY_ROW.Restaurants;

test.describe('Transaction lifecycle', () => {
  let page: Page;
  let navigation: Navigation;
  let budgetPage: BudgetPage;

  test.beforeEach(async ({ browser }) => {
    ({ page, navigation, budgetPage } = await createDemoSession(browser));
  });

  test.afterEach(async () => {
    await closeDemoSession({ page });
  });

  test('T1: creating a transaction shows correct fields and drops the account balance by that amount', async () => {
    // A freshly created account has no seeded "Upcoming/Due/Missed"
    // schedule-preview rows, which otherwise sort ahead of a newly
    // created transaction and break index-0 lookups (confirmed by direct
    // observation -- see AI_WORKFLOW.md).
    const accountPage: AccountPage = await navigation.createAccount({
      name: 'T1 Account',
      offBudget: false,
      balance: 0,
    });
    await accountPage.waitFor();

    const balanceBefore = await accountPage.getAccountBalanceValue();

    await accountPage.createSingleTransaction({
      payee: 'T1 Payee',
      category: 'Food',
      debit: '12.34',
    });

    const transaction = accountPage.getNthTransaction(0);
    await expect(transaction.payee).toHaveText('T1 Payee');
    await expect(transaction.category).toHaveText('Food');
    await expect(transaction.debit).toHaveText('12.34');

    await expect
      .poll(() => accountPage.getAccountBalanceValue())
      .toEqual(balanceBefore - 1234);
  });

  test('T2: editing a transaction amount updates both the running balance and the account balance', async () => {
    const accountPage: AccountPage = await navigation.createAccount({
      name: 'T2 Account',
      offBudget: false,
      balance: 0,
    });
    await accountPage.waitFor();

    // The account menu's "Show running balance" toggle was replaced upstream
    // by the transaction-table column manager (#8580, "Add a column manager to
    // the transaction table"), which landed in the master merge on this
    // branch. accounts.test.ts uses this same helper.
    await accountPage.setTransactionColumnVisibility('balance', true);

    const balanceBefore = await accountPage.getAccountBalanceValue();

    await accountPage.createSingleTransaction({
      payee: 'T2 Payee',
      debit: '10.00',
    });

    const transaction = accountPage.getNthTransaction(0);
    const runningBalanceAfterCreate = await readAmountInCents(
      transaction.balance,
    );
    // Newest transaction is shown first, so its running balance equals the
    // account balance at that point.
    expect(runningBalanceAfterCreate).toEqual(balanceBefore - 1000);

    await accountPage.editTransactionField(0, 'debit', '25.00');

    await expect
      .poll(() => accountPage.getAccountBalanceValue())
      .toEqual(balanceBefore - 2500);
    await expect
      .poll(() => readAmountInCents(transaction.balance))
      .toEqual(balanceBefore - 2500);
  });

  test('T3: deleting a transaction removes the row and restores the account balance', async () => {
    const accountPage: AccountPage = await navigation.createAccount({
      name: 'T3 Account',
      offBudget: false,
      balance: 0,
    });
    await accountPage.waitFor();

    const balanceBefore = await accountPage.getAccountBalanceValue();

    await accountPage.createSingleTransaction({
      payee: 'T3 Payee',
      debit: '20.00',
    });
    await expect
      .poll(() => accountPage.getAccountBalanceValue())
      .toEqual(balanceBefore - 2000);

    await accountPage.deleteNthTransaction(0);

    await expect
      .poll(() => accountPage.getAccountBalanceValue())
      .toEqual(balanceBefore);
    await expect(
      accountPage.transactionTableRow.filter({ hasText: 'T3 Payee' }),
    ).toHaveCount(0);
  });

  test('T4: a split transaction\'s children sum to the parent amount, which shows "Split"', async () => {
    const accountPage: AccountPage = await navigation.createAccount({
      name: 'T4 Account',
      offBudget: false,
      balance: 0,
    });
    await accountPage.waitFor();

    const balanceBefore = await accountPage.getAccountBalanceValue();

    // Split UI requires child amounts to sum exactly to the amount typed
    // on the root row before splitting (60.00 + 40.00 = 100.00).
    await accountPage.createSplitTransaction([
      { payee: 'T4 Split Parent', debit: '100.00' },
      { category: 'Food', debit: '60.00' },
      { debit: '40.00' },
    ]);

    const parent = accountPage.getNthTransaction(0);
    await expect(parent.payee).toHaveText('T4 Split Parent');
    await expect(parent.category).toHaveText('Split');
    await expect(parent.debit).toHaveText('100.00');

    const firstChild = accountPage.getNthTransaction(1);
    await expect(firstChild.category).toHaveText('Food');
    await expect(firstChild.debit).toHaveText('60.00');

    const secondChild = accountPage.getNthTransaction(2);
    await expect(secondChild.debit).toHaveText('40.00');

    await expect
      .poll(() => accountPage.getAccountBalanceValue())
      .toEqual(balanceBefore - 10000);
  });

  test('T5: a transfer between two on-budget accounts creates mirrored entries and leaves the combined balance unchanged', async () => {
    await navigation.createAccount({
      name: 'T5 Source',
      offBudget: false,
      balance: 0,
    });
    // Calling createAccount twice back-to-back makes getByLabel('Name')
    // ambiguous: the just-created account's "Edit account name" button
    // (aria-label "Edit account name") is still on screen and matches the
    // same substring as the next modal's Name input. Navigate away first
    // so only the modal's input is present when it opens again.
    await navigation.goToBudgetPage();
    await navigation.createAccount({
      name: 'T5 Dest',
      offBudget: false,
      balance: 0,
    });

    const sourceAccount: AccountPage =
      await navigation.goToAccountPage('T5 Source');
    await sourceAccount.waitFor();

    const onBudgetBefore =
      await sourceAccount.sidebarOnBudgetBalance.textContent();
    const sourceBalanceBefore = await sourceAccount.getAccountBalanceValue();

    await sourceAccount.createSingleTransaction({
      payee: 'T5 Dest',
      notes: 'T5 transfer',
      debit: '30.00',
    });

    await expect
      .poll(() => sourceAccount.getAccountBalanceValue())
      .toEqual(sourceBalanceBefore - 3000);
    const sourceTransaction = sourceAccount.getNthTransaction(0);
    await expect(sourceTransaction.category).toHaveText('Transfer');

    const destAccount: AccountPage =
      await navigation.goToAccountPage('T5 Dest');
    await destAccount.waitFor();

    const destTransaction = destAccount.getNthTransaction(0);
    await expect(destTransaction.category).toHaveText('Transfer');
    await expect(destTransaction.credit).toHaveText('30.00');

    // Combined on-budget balance is unchanged -- money moved between two
    // on-budget accounts, it didn't leave the budget.
    await expect(destAccount.sidebarOnBudgetBalance).toHaveText(
      onBudgetBefore ?? '',
    );
  });

  test('T6: filtering by payee shows only matching rows; clearing the filter restores the full list', async () => {
    // A fresh account avoids the ~20+ pre-seeded demo transactions on
    // "Bank of America", which made this test heavier and more prone to
    // timing flake under parallel load (observed one flaky run in a
    // --repeat-each=2 pass).
    const accountPage: AccountPage = await navigation.createAccount({
      name: 'T6 Account',
      offBudget: false,
      balance: 0,
    });
    await accountPage.waitFor();

    await accountPage.createSingleTransaction({
      payee: 'FilterTestUniquePayee',
      debit: '5.00',
    });
    await accountPage.createSingleTransaction({
      payee: 'OtherUnrelatedPayee',
      debit: '6.00',
    });

    const filterTooltip = await accountPage.filterBy('Payee');
    // Unlike Notes (free text), Payee's filter value is an autocomplete
    // combobox -- must click into it before typing, confirmed by direct
    // observation (typing without this first click goes nowhere).
    await filterTooltip.locator.getByPlaceholder('nothing').click();
    await page.keyboard.type('FilterTestUniquePayee');
    const payeeOption = page
      .getByTestId('FilterTestUniquePayee-payee-item')
      .or(page.getByRole('option', { name: 'FilterTestUniquePayee' }))
      .first();
    await expect(payeeOption).toBeVisible();
    await payeeOption.click();
    await filterTooltip.applyButton.click();

    await expect(
      accountPage.transactionTableRow.filter({
        hasText: 'FilterTestUniquePayee',
      }),
    ).toHaveCount(1);
    await expect(
      accountPage.transactionTableRow.filter({
        hasText: 'OtherUnrelatedPayee',
      }),
    ).toHaveCount(0);

    await accountPage.removeFilter(0);

    await expect(
      accountPage.transactionTableRow.filter({
        hasText: 'OtherUnrelatedPayee',
      }),
    ).toHaveCount(1);
  });

  test('T7: a $0 transaction is created and has no effect on the account balance', async () => {
    const accountPage: AccountPage = await navigation.createAccount({
      name: 'T7 Account',
      offBudget: false,
      balance: 0,
    });
    await accountPage.waitFor();

    const balanceBefore = await accountPage.getAccountBalanceValue();

    await accountPage.createSingleTransaction({
      payee: 'T7 Zero Payee',
      debit: '0',
    });

    const transaction = accountPage.getNthTransaction(0);
    await expect(transaction.payee).toHaveText('T7 Zero Payee');
    await expect(transaction.debit).toHaveText('0.00');

    await expect
      .poll(() => accountPage.getAccountBalanceValue())
      .toEqual(balanceBefore);
  });

  test('T8: deleting a category with transactions requires a transfer target and reassigns them, never orphaning them', async () => {
    const spentFoodBefore = await budgetPage.getSpentForRow(FOOD_ROW);
    const restaurantsRowBefore = budgetPage.getCategoryRowByName('Restaurants');
    const spentRestaurantsBefore = await readAmountInCents(
      restaurantsRowBefore.getByTestId('category-month-spent'),
    );

    await budgetPage.deleteCategoryWithTransfer(FOOD_ROW, 'Restaurants');

    await expect(budgetPage.getCategoryRowByName('Food')).toHaveCount(0);

    // Food's Spent moved into Restaurants -- the transactions were
    // reassigned, not deleted or left uncategorized.
    await expect
      .poll(() =>
        readAmountInCents(
          budgetPage
            .getCategoryRowByName('Restaurants')
            .getByTestId('category-month-spent'),
        ),
      )
      .toEqual(spentRestaurantsBefore + spentFoodBefore);
  });

  test('T9: transferring from an on-budget to an off-budget account moves money out of the budget without changing the combined total', async () => {
    // T5 covers on-budget -> on-budget, where the budget total is unchanged.
    // This is the case that *should* change it: money crossing the budget
    // boundary has to leave the on-budget total while the all-accounts total
    // stays put, or the app is either losing or inventing money.
    await navigation.createAccount({
      name: 'T9 On Budget',
      offBudget: false,
      balance: 0,
    });
    // Navigate away between the two createAccount calls -- see T5's comment on
    // the ambiguous getByLabel('Name') locator.
    await navigation.goToBudgetPage();
    await navigation.createAccount({
      name: 'T9 Off Budget',
      offBudget: true,
      balance: 0,
    });

    const sourceAccount: AccountPage =
      await navigation.goToAccountPage('T9 On Budget');
    await sourceAccount.waitFor();

    const onBudgetBefore =
      await sourceAccount.sidebarOnBudgetBalance.textContent();
    const allAccountsBefore =
      await sourceAccount.sidebarAllAccountsBalance.textContent();
    const sourceBalanceBefore = await sourceAccount.getAccountBalanceValue();

    await sourceAccount.createSingleTransaction({
      payee: 'T9 Off Budget',
      notes: 'T9 cross-boundary transfer',
      debit: '30.00',
    });

    await expect
      .poll(() => sourceAccount.getAccountBalanceValue())
      .toEqual(sourceBalanceBefore - 3000);

    // Not "Transfer" -- that label is reserved for transfers where *both*
    // sides are on budget (`isBudgetTransfer` in TransactionsTable.tsx). Money
    // crossing out of the budget is real outflow and has to be categorised, so
    // the cell renders the uncategorised "Categorize" prompt instead.
    // Confirmed by running this test, which first asserted 'Transfer'.
    await expect(sourceAccount.getNthTransaction(0).category).toHaveText(
      'Categorize',
    );

    // Money left the budget, so the on-budget total must move...
    await expect(sourceAccount.sidebarOnBudgetBalance).not.toHaveText(
      onBudgetBefore ?? '',
    );
    // ...while the all-accounts total is conserved -- it only moved sides.
    await expect(sourceAccount.sidebarAllAccountsBalance).toHaveText(
      allAccountsBefore ?? '',
    );

    const destAccount: AccountPage =
      await navigation.goToAccountPage('T9 Off Budget');
    await destAccount.waitFor();

    const destTransaction = destAccount.getNthTransaction(0);
    // Viewed from the off-budget side, the same row is labelled "Off budget".
    await expect(destTransaction.category).toHaveText('Off budget');
    await expect(destTransaction.credit).toHaveText('30.00');
  });

  test('T10: recategorizing a transaction moves Spent off the old category and onto the new one', async () => {
    // T8 proves transactions survive a category *deletion*. This proves the
    // everyday case: correcting a miscategorised transaction has to debit one
    // category and credit the other, not just add to the new one.
    const foodSpentBefore = await budgetPage.getSpentForRow(FOOD_ROW);
    const restaurantsSpentBefore =
      await budgetPage.getSpentForRow(RESTAURANTS_ROW);

    const accountPage: AccountPage = await navigation.createAccount({
      name: 'T10 Account',
      offBudget: false,
      balance: 0,
    });
    await accountPage.waitFor();

    await accountPage.createSingleTransaction({
      payee: 'T10 Payee',
      category: 'Food',
      debit: '40.00',
    });

    budgetPage = await navigation.goToBudgetPage();
    // Spent is negative in this app; spending more makes it more negative.
    await expect
      .poll(() => budgetPage.getSpentForRow(FOOD_ROW))
      .toEqual(foodSpentBefore - 4000);

    const reopenedAccount: AccountPage =
      await navigation.goToAccountPage('T10 Account');
    await reopenedAccount.waitFor();
    await reopenedAccount.editTransactionField(0, 'category', 'Restaurants');
    await expect(reopenedAccount.getNthTransaction(0).category).toHaveText(
      'Restaurants',
    );

    budgetPage = await navigation.goToBudgetPage();

    // Food is back to where it started -- the amount moved, it wasn't copied.
    await expect
      .poll(() => budgetPage.getSpentForRow(FOOD_ROW))
      .toEqual(foodSpentBefore);
    await expect
      .poll(() => budgetPage.getSpentForRow(RESTAURANTS_ROW))
      .toEqual(restaurantsSpentBefore - 4000);
  });

  test("T11: deleting a transaction restores the category's Spent, not just the account balance", async () => {
    // T3 proves the *account* balance is restored on delete. This proves the
    // budget side of the same action: a delete that leaves Spent behind would
    // pass T3 while permanently distorting the category.
    const spentBefore = await budgetPage.getSpentForRow(FOOD_ROW);

    const accountPage: AccountPage = await navigation.createAccount({
      name: 'T11 Account',
      offBudget: false,
      balance: 0,
    });
    await accountPage.waitFor();

    await accountPage.createSingleTransaction({
      payee: 'T11 Payee',
      category: 'Food',
      debit: '31.00',
    });

    budgetPage = await navigation.goToBudgetPage();
    await expect
      .poll(() => budgetPage.getSpentForRow(FOOD_ROW))
      .toEqual(spentBefore - 3100);

    const reopenedAccount: AccountPage =
      await navigation.goToAccountPage('T11 Account');
    await reopenedAccount.waitFor();
    await reopenedAccount.deleteNthTransaction(0);

    budgetPage = await navigation.goToBudgetPage();
    await expect
      .poll(() => budgetPage.getSpentForRow(FOOD_ROW))
      .toEqual(spentBefore);
  });

  test("T12: a split transaction's children each land in their own category's Spent", async () => {
    // T4 proves the split's children sum to the parent and the account
    // balance moves. This proves the split actually reaches the budget: each
    // child must hit its own category, not all land on one, and not be
    // double-counted via the parent.
    const foodSpentBefore = await budgetPage.getSpentForRow(FOOD_ROW);
    const restaurantsSpentBefore =
      await budgetPage.getSpentForRow(RESTAURANTS_ROW);

    const accountPage: AccountPage = await navigation.createAccount({
      name: 'T12 Account',
      offBudget: false,
      balance: 0,
    });
    await accountPage.waitFor();

    // Child amounts must sum exactly to the root amount (70 + 30 = 100).
    await accountPage.createSplitTransaction([
      { payee: 'T12 Split Parent', debit: '100.00' },
      { category: 'Food', debit: '70.00' },
      { category: 'Restaurants', debit: '30.00' },
    ]);

    budgetPage = await navigation.goToBudgetPage();

    await expect
      .poll(() => budgetPage.getSpentForRow(FOOD_ROW))
      .toEqual(foodSpentBefore - 7000);
    await expect
      .poll(() => budgetPage.getSpentForRow(RESTAURANTS_ROW))
      .toEqual(restaurantsSpentBefore - 3000);
  });
});
