import { join } from 'path';

import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import type { AccountPage } from './page-models/account-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Accounts', () => {
  let page: Page;
  let navigation: Navigation;
  let configurationPage: ConfigurationPage;
  let accountPage: AccountPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('creates a new account and views the initial balance transaction', async () => {
    accountPage = await navigation.createAccount({
      name: 'New Account',
      offBudget: false,
      balance: 100,
    });

    const transaction = accountPage.getNthTransaction(0);
    await expect(transaction.payee).toHaveText('Starting Balance');
    await expect(transaction.notes).toHaveText('');
    await expect(transaction.category).toHaveText('Starting Balances');
    await expect(transaction.debit).toHaveText('');
    await expect(transaction.credit).toHaveText('100.00');
    await expect(page).toMatchThemeScreenshots();
  });

  test('closes an account', async () => {
    accountPage = await navigation.goToAccountPage('Roth IRA');

    await expect(accountPage.accountName).toHaveText('Roth IRA');

    const modal = await accountPage.clickCloseAccount();
    await modal.selectTransferAccount('Vanguard 401k');
    await expect(page).toMatchThemeScreenshots();
    await modal.closeAccount();

    await expect(accountPage.accountName).toHaveText('Closed: Roth IRA');
    await expect(page).toMatchThemeScreenshots();
  });

  test('shift-click range selection skips hidden reconciled transactions', async () => {
    accountPage = await navigation.createAccount({
      name: 'Range Select',
      offBudget: false,
      balance: 0,
    });
    await accountPage.waitFor();

    // Newest transactions are shown first, so the rows read
    // 'range-five' through 'range-one' from top to bottom.
    for (const note of ['one', 'two', 'three', 'four', 'five']) {
      await accountPage.createSingleTransaction({
        payee: '',
        notes: `range-${note}`,
        category: 'Food',
        debit: '10.00',
      });
    }

    // Mark two transactions in the middle of the list as cleared and
    // lock them via reconciliation so they become reconciled.
    for (const note of ['range-two', 'range-four']) {
      await accountPage.transactionTableRow
        .filter({ hasText: note })
        .getByTestId('cleared')
        .click();
    }

    await page.getByRole('button', { name: 'Reconcile' }).click();
    // The reconciliation amount is pre-filled with the cleared balance,
    // so submitting right away results in a zero difference.
    const reconcilePopover = page.locator('[data-popover]');
    await reconcilePopover.getByRole('textbox').waitFor();
    await reconcilePopover.getByRole('button', { name: 'Reconcile' }).click();
    await page.getByRole('button', { name: 'Lock transactions' }).click();

    // Showing the running balance keeps reconciled transactions loaded
    // even when they are hidden; they must still be excluded from
    // range selection.
    await accountPage.accountMenuButton.click();
    await page.getByRole('button', { name: 'Show running balance' }).click();
    await accountPage.accountMenuButton.click();
    await page
      .getByRole('button', { name: 'Hide reconciled transactions' })
      .click();

    await expect(
      accountPage.transactionTableRow.filter({ hasText: 'range-two' }),
    ).not.toBeVisible();

    // Shift-click from the first to the last visible transaction.
    await accountPage.transactionTableRow
      .filter({ hasText: 'range-five' })
      .getByTestId('select')
      .click();
    await accountPage.transactionTableRow
      .filter({ hasText: 'range-one' })
      .getByTestId('select')
      .click({ modifiers: ['Shift'] });

    // Only the three visible transactions should be selected — not the
    // hidden reconciled ones in between.
    await expect(accountPage.selectButton).toHaveText('3 transactions');
  });

  test.describe('On Budget Accounts', () => {
    // Reset filters
    test.afterEach(async () => {
      await accountPage.removeFilter(0);
    });

    test('creates a transfer from two existing transactions', async () => {
      accountPage = await navigation.goToAccountPage('On budget');
      await accountPage.waitFor();

      await expect(accountPage.accountName).toHaveText('On Budget Accounts');

      await accountPage.filterByNote('Test Acc Transfer');

      await accountPage.createSingleTransaction({
        account: 'Ally Savings',
        payee: '',
        notes: 'Test Acc Transfer',
        category: 'Food',
        debit: '34.56',
      });

      await accountPage.createSingleTransaction({
        account: 'HSBC',
        payee: '',
        notes: 'Test Acc Transfer',
        category: 'Food',
        credit: '34.56',
      });

      // Wait for both newly created transactions to actually be in the
      // transaction list before selecting them. A bare waitForTimeout(100)
      // here is not enough under parallel CI load: the second
      // createSingleTransaction's row may still be mounting when the
      // selection clicks land, so the selection doesn't stick and the
      // 'Make transfer' button (rendered only when items are selected)
      // never appears.
      await expect(accountPage.getNthTransaction(1).payee).toBeVisible();

      await accountPage.selectNthTransaction(0);
      await accountPage.selectNthTransaction(1);
      await accountPage.clickSelectAction('Make transfer');

      let transaction = accountPage.getNthTransaction(0);
      await expect(transaction.payee).toHaveText('Ally Savings');
      await expect(transaction.category).toHaveText('Transfer');
      await expect(transaction.credit).toHaveText('34.56');
      await expect(transaction.account).toHaveText('HSBC');

      transaction = accountPage.getNthTransaction(1);
      await expect(transaction.payee).toHaveText('HSBC');
      await expect(transaction.category).toHaveText('Transfer');
      await expect(transaction.debit).toHaveText('34.56');
      await expect(transaction.account).toHaveText('Ally Savings');
    });
  });

  test.describe('Import Transactions', () => {
    test.beforeEach(async () => {
      accountPage = await navigation.createAccount({
        name: 'CSV import',
        offBudget: false,
        balance: 0,
      });
      await accountPage.waitFor();
    });

    async function importCsv(screenshot = false) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await accountPage.page.getByRole('button', { name: 'Import' }).click();

      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(join(__dirname, 'data/test.csv'));

      const importButton = accountPage.page.getByRole('button', {
        name: /Import \d+ transactions/,
      });

      await importButton.waitFor({ state: 'visible' });

      if (screenshot) await expect(page).toMatchThemeScreenshots();

      await importButton.click();

      await expect(importButton).not.toBeVisible();
    }

    test('imports transactions from a CSV file', async () => {
      await importCsv(true);
    });

    test('import csv file twice', async () => {
      await importCsv(false);

      const fileChooserPromise = page.waitForEvent('filechooser');
      await accountPage.page.getByRole('button', { name: 'Import' }).click();

      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(join(__dirname, 'data/test.csv'));

      const importButton = accountPage.page.getByRole('button', {
        name: /Import \d+ transactions/,
      });

      await importButton.waitFor({ state: 'visible' });

      await expect(page).toMatchThemeScreenshots();

      await expect(importButton).toBeDisabled();
      expect(await importButton.innerText()).toMatch(/Import 0 transactions/);

      await accountPage.page.getByRole('button', { name: 'Close' }).click();

      await expect(importButton).not.toBeVisible();
    });

    test('import notes checkbox is not shown for CSV files', async () => {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await accountPage.page.getByRole('button', { name: 'Import' }).click();

      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(join(__dirname, 'data/test.csv'));

      // Verify the import notes checkbox is not visible for CSV files
      const importNotesCheckbox = page.getByRole('checkbox', {
        name: 'Import notes from file',
      });
      await expect(importNotesCheckbox).not.toBeVisible();

      // Import the transactions
      const importButton = page.getByRole('button', {
        name: /Import \d+ transactions/,
      });
      await importButton.click();

      // Verify the transactions were imported
      await expect(importButton).not.toBeVisible();
    });
  });
});
