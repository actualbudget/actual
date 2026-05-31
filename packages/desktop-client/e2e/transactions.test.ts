import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import type { AccountPage } from './page-models/account-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Transactions', () => {
  let page: Page;
  let navigation: Navigation;
  let accountPage: AccountPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    accountPage = await navigation.goToAccountPage('Ally Savings');
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the page visuals', async () => {
    await expect(page).toMatchThemeScreenshots();
  });

  test.describe('filters transactions', () => {
    // Reset filters
    test.afterEach(async () => {
      await accountPage.removeFilter(0);
    });

    test('by date', async () => {
      const filterTooltip = await accountPage.filterBy('Date');
      await expect(filterTooltip.locator).toMatchThemeScreenshots();

      // Open datepicker
      await page.keyboard.press('Space');
      const datepicker = page.getByTestId('date-select-tooltip');
      await expect(datepicker).toMatchThemeScreenshots();

      // Select "is xxxxx"
      await datepicker.getByText('20', { exact: true }).click();
      await filterTooltip.applyButton.click();

      // Assert that there are no transactions
      await expect(accountPage.transactionTable).toHaveText('No transactions');
      await expect(page).toMatchThemeScreenshots();
    });

    test('by category', async () => {
      const filterTooltip = await accountPage.filterBy('Category');
      await expect(filterTooltip.locator).toMatchThemeScreenshots();

      // Type in the autocomplete box
      const autocomplete = page.getByTestId('autocomplete');
      await expect(autocomplete).toMatchThemeScreenshots();

      // Ensure that autocomplete filters properly
      await page.keyboard.type('C');
      await expect(autocomplete).toMatchThemeScreenshots();

      // Select the active item
      await page.getByTestId('Clothing-category-item').click();
      await filterTooltip.applyButton.click();

      // Assert that there are only clothing transactions
      for (let i = 0; i < 5; i++) {
        await expect(accountPage.getNthTransaction(i).category).toHaveText(
          'Clothing',
        );
      }
      await expect(page).toMatchThemeScreenshots();
    });

    test('by category group', async () => {
      // Use Capital One Checking because it has transactions that aren't just Clothing
      accountPage = await navigation.goToAccountPage('Capital One Checking');

      const filterTooltip = await accountPage.filterBy('Category');

      await filterTooltip.locator
        .getByRole('button', { name: 'Category', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Category group', exact: true })
        .click();

      await expect(filterTooltip.locator).toMatchThemeScreenshots();

      // Type in the autocomplete box
      const autocomplete = page.getByTestId('autocomplete');
      await expect(autocomplete).toMatchThemeScreenshots();

      // Ensure that autocomplete filters properly
      await page.keyboard.type('U');
      await expect(autocomplete).toMatchThemeScreenshots();

      // Select the active item
      await page.getByTestId('Usual Expenses-category-group-item').click();
      await filterTooltip.applyButton.click();

      // Assert that there are only transactions with categories in the Usual Expenses group
      for (let i = 0; i < 5; i++) {
        await expect(accountPage.getNthTransaction(i).category).toHaveText(
          /^(Savings|Medical|Gift|General|Clothing|Entertainment|Restaurants|Food)$/,
        );
      }
      await expect(page).toMatchThemeScreenshots();
    });

    test('by payee', async () => {
      accountPage = await navigation.goToAccountPage('Capital One Checking');
      const filterTooltip = await accountPage.filterBy('Payee');
      const filtersMenuTooltip = page.getByTestId('filters-menu-tooltip');
      await expect(filterTooltip.locator).toMatchThemeScreenshots();

      // Type in the autocomplete box
      const autocomplete = filtersMenuTooltip.getByLabel('Payee');
      await expect(autocomplete).toMatchThemeScreenshots();

      // Open the textbox, auto-open is currently broken for anything that's not "is not"
      await autocomplete.click();

      await page.getByTestId('Kroger-payee-item').click();
      await filterTooltip.applyButton.click();

      // Assert that all Payees are Kroger
      for (let i = 0; i < 10; i++) {
        await expect(accountPage.getNthTransaction(i).payee).toHaveText(
          'Kroger',
        );
      }
      await accountPage.removeFilter(0);

      await accountPage.filterBy('Payee');
      await filtersMenuTooltip
        .getByRole('button', { name: 'contains' })
        .click();
      const textInput = filtersMenuTooltip.getByPlaceholder('nothing');

      await textInput.fill('De');
      await filterTooltip.applyButton.click();
      // Assert that all Payees are Deposit
      for (let i = 0; i < 9; i++) {
        await expect(accountPage.getNthTransaction(i).payee).toHaveText(
          'Deposit',
        );
      }

      await accountPage.removeFilter(0);

      await accountPage.filterBy('Payee');
      await filtersMenuTooltip
        .getByRole('button', { name: 'contains' })
        .click();

      await textInput.fill('l');
      await filterTooltip.applyButton.click();
      // Assert that both Payees contain the letter 'l'
      for (let i = 0; i < 2; i++) {
        await expect(accountPage.getNthTransaction(i).payee).toHaveText(/l/);
      }

      await accountPage.removeFilter(0);

      await accountPage.filterBy('Payee');
      await filtersMenuTooltip
        .getByRole('button', { name: 'does not contain' })
        .click();

      await textInput.fill('l');
      await filterTooltip.applyButton.click();
      // Assert that all Payees DO NOT contain the letter 'l'
      for (let i = 0; i < 19; i++) {
        await expect(accountPage.getNthTransaction(i).payee).not.toHaveText(
          /l/,
        );
      }

      await expect(page).toMatchThemeScreenshots();
    });
  });

  test('creates a test transaction', async () => {
    await accountPage.createSingleTransaction({
      payee: 'Home Depot',
      notes: 'Notes field',
      category: 'Food',
      debit: '12.34',
    });

    const transaction = accountPage.getNthTransaction(0);
    await expect(transaction.payee).toHaveText('Home Depot');
    await expect(transaction.notes).toHaveText('Notes field');
    await expect(transaction.category).toHaveText('Food');
    await expect(transaction.debit).toHaveText('12.34');
    await expect(transaction.credit).toHaveText('');
    await expect(page).toMatchThemeScreenshots();
  });

  test('creates a split test transaction', async () => {
    await accountPage.createSplitTransaction([
      {
        payee: 'Krogger',
        notes: 'Notes',
        debit: '333.33',
      },
      {
        category: 'General',
        debit: '222.22',
      },
      {
        debit: '111.11',
      },
    ]);

    const firstTransaction = accountPage.getNthTransaction(0);
    await expect(firstTransaction.payee).toHaveText('Krogger');
    await expect(firstTransaction.notes).toHaveText('Notes');
    await expect(firstTransaction.category).toHaveText('Split');
    await expect(firstTransaction.debit).toHaveText('333.33');
    await expect(firstTransaction.credit).toHaveText('');

    const secondTransaction = accountPage.getNthTransaction(1);
    await expect(secondTransaction.payee).toHaveText('Krogger');
    await expect(secondTransaction.notes).toHaveText('');
    await expect(secondTransaction.category).toHaveText('General');
    await expect(secondTransaction.debit).toHaveText('222.22');
    await expect(secondTransaction.credit).toHaveText('');

    const thirdTransaction = accountPage.getNthTransaction(2);
    await expect(thirdTransaction.payee).toHaveText('Krogger');
    await expect(thirdTransaction.notes).toHaveText('');
    await expect(thirdTransaction.category).toHaveText('Categorize');
    await expect(thirdTransaction.debit).toHaveText('111.11');
    await expect(thirdTransaction.credit).toHaveText('');
    await expect(page).toMatchThemeScreenshots();
  });

  test('searches transactions and filters the list', async () => {
    // The demo Ally Savings account contains pre-existing transactions.
    // Searching for a known payee should narrow the list; an unknown string
    // should show the empty state; clearing restores the full list.
    await accountPage.waitFor();
    await expect(accountPage.transactionTableRow.first()).toBeVisible();
    const totalBefore = await accountPage.getTransactionCount();
    console.log(`[search] total transactions before search: ${totalBefore}`);
    expect(totalBefore).toBeGreaterThan(0);

    await accountPage.searchTransactions('Kroger');
    await expect(async () => {
      const filteredCount = await accountPage.getTransactionCount();
      expect(filteredCount).toBeGreaterThan(0);
      expect(filteredCount).toBeLessThan(totalBefore);
    }).toPass();
    const krogerCount = await accountPage.getTransactionCount();
    console.log(
      `[search] after "Kroger" — ${krogerCount} rows shown (down from ${totalBefore})`,
    );
    await expect(accountPage.getNthTransaction(0).payee).toHaveText('Kroger');

    await accountPage.searchTransactions('ZZZZZ_NONEXISTENT_XYZ');
    await expect(accountPage.transactionTable).toContainText('No transactions');
    console.log(
      `[search] after "ZZZZZ_NONEXISTENT_XYZ" — "No transactions" shown`,
    );

    await accountPage.clearSearch();
    await expect(async () => {
      const restoredCount = await accountPage.getTransactionCount();
      expect(restoredCount).toBe(totalBefore);
    }).toPass();
    console.log(`[search] after clear — restored to ${totalBefore} rows`);
  });

  test('edits a transaction notes field inline', async () => {
    // Use an existing payee (Kroger) to avoid triggering the "merge unused
    // payees" modal that appears when a brand-new payee name is committed.
    await accountPage.createSingleTransaction({
      payee: 'Kroger',
      notes: 'original note',
      debit: '25.00',
    });

    const firstTx = accountPage.getNthTransaction(0);
    await expect(firstTx.notes).toHaveText('original note');
    console.log(`[edit-inline] notes before edit: "original note"`);

    await firstTx.notes.click();
    const notesInput = firstTx.notes.getByRole('combobox');
    await accountPage.selectInputText(notesInput);
    await notesInput.pressSequentially('updated note');
    await page.keyboard.press('Enter');

    await expect(firstTx.notes).toHaveText('updated note');
    console.log(`[edit-inline] notes after edit:  "updated note"`);
    // Payee and amount must be unchanged
    await expect(firstTx.payee).toHaveText('Kroger');
    await expect(firstTx.debit).toHaveText('25.00');
    console.log(
      `[edit-inline] payee: "Kroger" unchanged, debit: "$25.00" unchanged`,
    );
  });

  test('deletes a transaction and reverts the account balance', async () => {
    let balanceBeforeCreate: string | null;
    let balanceAfterCreate: string | null;

    await test.step('record account balance before any changes', async () => {
      // Wait for the balance to show a real value — on slower CI machines
      // the account page may still show '0.00' while the data loads.
      await expect(accountPage.accountBalance).not.toHaveText('0.00');
      balanceBeforeCreate = await accountPage.accountBalance.textContent();
      console.log(`[delete-tx] balance before create: ${balanceBeforeCreate}`);
    });

    await test.step('create a $99.99 Home Depot debit transaction', async () => {
      await accountPage.createSingleTransaction({
        payee: 'Home Depot',
        debit: '99.99',
      });
      const firstTx = accountPage.getNthTransaction(0);
      await expect(firstTx.payee).toHaveText('Home Depot');
      await expect(firstTx.debit).toHaveText('99.99');
    });

    await test.step('assert account balance decreased after transaction was added', async () => {
      await expect(async () => {
        const b = await accountPage.accountBalance.textContent();
        expect(b).not.toBe(balanceBeforeCreate);
      }).toPass();
      balanceAfterCreate = await accountPage.accountBalance.textContent();
      console.log(
        `[delete-tx] balance after  create: ${balanceAfterCreate} (decreased by $99.99)`,
      );
    });

    await test.step('select transaction → Delete → confirm dialog', async () => {
      await accountPage.selectNthTransaction(0);
      await page.waitForTimeout(300);
      await accountPage.clickSelectAction('Delete');
      await page.getByRole('button', { name: 'Delete' }).click();
    });

    await test.step('assert balance reverted to original value', async () => {
      await expect(async () => {
        const b = await accountPage.accountBalance.textContent();
        expect(b).toBe(balanceBeforeCreate);
      }).toPass();
      const finalBalance = await accountPage.accountBalance.textContent();
      console.log(
        `[delete-tx] balance after  delete: ${finalBalance} — reverted: ${finalBalance === balanceBeforeCreate}`,
      );
      expect(balanceAfterCreate).not.toBe(balanceBeforeCreate);
    });
  });

  test('creates a transfer test transaction', async () => {
    await accountPage.enterSingleTransaction({
      payee: 'Bank of America',
      notes: 'Notes field',
      debit: '12.34',
    });

    let transaction = accountPage.getEnteredTransaction();
    await expect(transaction.category.locator('input')).toHaveValue('Transfer');
    await expect(page).toMatchThemeScreenshots();

    const balanceBeforeTransaction =
      await accountPage.accountBalance.textContent();
    const allAccountsBefore =
      await accountPage.sidebarAllAccountsBalance.textContent();
    const onBudgetBefore =
      await accountPage.sidebarOnBudgetBalance.textContent();

    await accountPage.addEnteredTransaction();

    transaction = accountPage.getNthTransaction(0);
    await expect(transaction.payee).toHaveText('Bank of America');
    await expect(transaction.notes).toHaveText('Notes field');
    await expect(transaction.category).toHaveText('Transfer');
    await expect(transaction.debit).toHaveText('12.34');
    await expect(transaction.credit).toHaveText('');

    // Wait for balance to update after adding transaction
    await expect(async () => {
      const balanceAfterTransaction =
        await accountPage.accountBalance.textContent();
      expect(balanceAfterTransaction).not.toBe(balanceBeforeTransaction);
    }).toPass();

    // For an on-budget transfer, net totals should be unchanged
    await expect(async () => {
      const allAccounts =
        await accountPage.sidebarAllAccountsBalance.textContent();
      const onBudget = await accountPage.sidebarOnBudgetBalance.textContent();
      expect(allAccounts).toBe(allAccountsBefore);
      expect(onBudget).toBe(onBudgetBefore);
    }).toPass();

    await expect(page).toMatchThemeScreenshots();
  });
});
