import { join } from 'path';

import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import type { AccountPage } from './page-models/account-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import { TransactionsPageModel } from './page-models/transactions-page';

const transactionsCsvPath = join(__dirname, 'data/test.csv');
const categoriesCsvPath = join(__dirname, 'data/categories.csv');

test.describe('Accounts', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;
  let navigation: Navigation;
  let configurationPage: ConfigurationPage;
  let accountPage: AccountPage;
  let transactionsPage: TransactionsPageModel;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);
    transactionsPage = new TransactionsPageModel(page);

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

  test.describe('On Budget Accounts', () => {
    // Reset filters
    test.afterEach(async () => {
      await accountPage?.removeFilter(0);
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

      await page.waitForTimeout(100); // Give time for the previous transaction to be rendered

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

    test('imports transactions from a CSV file', async () => {
      await transactionsPage.importCsv(true);
    });

    test('import csv file twice', async () => {
      await transactionsPage.importCsv(false);

      const importButton =
        await transactionsPage.openImportPreview(transactionsCsvPath);

      await expect(page).toMatchThemeScreenshots();

      await expect(importButton).toBeDisabled();
      expect(await importButton.innerText()).toMatch(/Import 0 transactions/);

      await accountPage.page.getByRole('button', { name: 'Close' }).click();

      await expect(importButton).not.toBeVisible();
    });

    test('import notes checkbox is not shown for CSV files', async () => {
      await transactionsPage.openImportPreview(transactionsCsvPath);

      const importNotesCheckbox = page.getByRole('checkbox', {
        name: 'Import notes from file',
      });
      await expect(importNotesCheckbox).not.toBeVisible();

      const importButton = page.getByRole('button', {
        name: /Import \d+ transactions/,
      });
      await importButton.click();

      await expect(importButton).not.toBeVisible();
    });

    test('with category mapping from CSV', async () => {
      await test.step('Load CSV and enable create categories from import', async () => {
        await transactionsPage.openImportPreview(categoriesCsvPath);

        await expect(page.getByText('Corner Market')).toBeVisible();

        await page
          .getByRole('checkbox', { name: 'Create categories from import' })
          .click();

        await expect(page).toMatchThemeScreenshots('step-1-create-categories');
      });

      await test.step('Open Import Categories modal', async () => {
        await page
          .getByRole('button', { name: /Import \d+ transactions/ })
          .click();

        await page.getByRole('heading', { name: 'Import Categories' }).waitFor({
          state: 'visible',
        });

        await expect(transactionsPage.getTopDialog()).toMatchThemeScreenshots(
          'step-2-open-categories-modal',
        );
      });

      await test.step('Map category to existing', async () => {
        const importCategoriesDialog =
          transactionsPage.getImportCategoriesDialog();

        await importCategoriesDialog.getByRole('textbox').first().click();
        await page.keyboard.type('Food');
        await page.getByTestId('Food-category-item').click();

        await expect(transactionsPage.getTopDialog()).toMatchThemeScreenshots(
          'step-3-map-existing',
        );
      });

      await test.step('Assign new category to existing group', async () => {
        const importCategoriesDialog =
          transactionsPage.getImportCategoriesDialog();

        await importCategoriesDialog
          .getByRole('button', { name: 'Usual Expenses' })
          .first()
          .click();
        await page.getByRole('button', { name: 'Bills' }).click();

        await expect(transactionsPage.getTopDialog()).toMatchThemeScreenshots(
          'step-4-assign-group',
        );
      });

      await test.step('Create new category group', async () => {
        const importCategoriesDialog =
          transactionsPage.getImportCategoriesDialog();

        await importCategoriesDialog
          .getByRole('button', { name: 'Usual Expenses' })
          .click();
        await page.getByRole('button', { name: /Create new group/ }).click();

        await page
          .getByRole('heading', { name: 'New Category Group' })
          .waitFor({
            state: 'visible',
          });
        await page.getByPlaceholder('Category group name').fill('Pets');
        await expect(transactionsPage.getTopDialog()).toMatchThemeScreenshots(
          'step-5-new-group',
        );

        await page
          .locator('form')
          .filter({
            has: page.getByPlaceholder('Category group name'),
          })
          .getByRole('button', { name: 'Add' })
          .click();

        await page.getByRole('heading', { name: 'Import Categories' }).waitFor({
          state: 'visible',
        });

        await expect(transactionsPage.getTopDialog()).toMatchThemeScreenshots(
          'step-6-after-new-group',
        );
      });

      await test.step('Continue import', async () => {
        await page.getByRole('button', { name: 'Continue Import' }).click();

        await page.getByRole('heading', { name: 'Import Categories' }).waitFor({
          state: 'hidden',
        });

        await accountPage.waitFor();

        await expect(page).toMatchThemeScreenshots('step-7-imported');
      });

      await test.step('Assert assigned categories on transactions', async () => {
        const byPayee = (name: string) =>
          accountPage.transactionTableRow.filter({ hasText: name });

        await expect(
          byPayee('Corner Market').getByTestId('category'),
        ).toHaveText('Food');
        await expect(byPayee('Hobby Shop').getByTestId('category')).toHaveText(
          'Model Trains',
        );
        await expect(byPayee('Vet Clinic').getByTestId('category')).toHaveText(
          'Pet Care',
        );
      });
    });
  });
});
