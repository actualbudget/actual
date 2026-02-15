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

    await expect(page).toMatchThemeScreenshots();
  });
});
