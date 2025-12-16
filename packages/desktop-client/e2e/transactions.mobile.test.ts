import { type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';

async function enableMobileCalculatorKeypad(page: Page) {
  await page.waitForFunction(() =>
    Boolean(window.__actionsForMenu?.saveSyncedPrefs),
  );

  await page.evaluate(async () => {
    await window.__actionsForMenu.saveSyncedPrefs({
      prefs: {
        'flags.mobileCalculatorKeypad': 'true',
      },
    });
  });
}

test.describe('Mobile Transactions', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.setViewportSize({
      width: 350,
      height: 600,
    });
    await page.goto('/');
    await configurationPage.createTestFile();

    await enableMobileCalculatorKeypad(page);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('creates a transaction via footer button', async () => {
    const transactionEntryPage = await navigation.goToTransactionEntryPage();
    await expect(page).toMatchThemeScreenshots();

    await expect(transactionEntryPage.header).toHaveText('New Transaction');

    await transactionEntryPage.enterAmountWithKeypad('12.34');
    await transactionEntryPage.fillField(
      page.getByTestId('payee-field'),
      'Kroger',
    );
    await transactionEntryPage.fillField(
      page.getByTestId('category-field'),
      'Clothing',
    );
    await transactionEntryPage.fillField(
      page.getByTestId('account-field'),
      'Ally Savings',
    );
    await expect(page).toMatchThemeScreenshots();

    await transactionEntryPage.createTransaction();
    await expect(page.getByLabel('Transaction list')).toHaveCount(0);
    await expect(page).toMatchThemeScreenshots();
  });

  test('supports arithmetic entry via calculator keypad (Amount field)', async () => {
    const transactionEntryPage = await navigation.goToTransactionEntryPage();

    await transactionEntryPage.openAmountKeypad();
    await transactionEntryPage.pressKeypadSequence(['Clear', '1', '+', '2']);
    await page
      .getByTestId('money-keypad-modal')
      .getByRole('button', { name: 'Done' })
      .click();

    await expect(page.getByTestId('money-keypad-modal')).toHaveCount(0);
    await expect(transactionEntryPage.amountDisplayButton).toContainText('3');
  });

  test('opens calculator keypad when splitting and tapping child amount', async () => {
    const transactionEntryPage = await navigation.goToTransactionEntryPage();

    // Split button only appears once there is a non-zero total amount.
    await transactionEntryPage.enterAmountWithKeypad('12.34');

    await transactionEntryPage.splitTransaction();

    const firstChildAmount = transactionEntryPage.childAmountInputs().first();
    await expect(firstChildAmount).toBeVisible();

    // Keypad should only open on explicit user interaction.
    await expect(page.getByTestId('money-keypad-modal')).toHaveCount(0);

    await firstChildAmount.click();
    await expect(page.getByTestId('money-keypad-modal')).toBeVisible();
  });

  test('prefills a new transaction with URL search params', async () => {
    const transactionEntryPage = await navigation.goToTransactionEntryPage();
    await page.goto(
      transactionEntryPage.page.url() +
        '?category=Food&amount=23.42&account=HSBC&date=2025-10-31&cleared=true&payee=Kroger&notes=just+a+note',
    );
    // Note: no easy way to test cleared checkbox
    await expect(page.getByTestId('transaction-form'))
      .toMatchAriaSnapshot(`- text: Amount
- button "-"
- button "23.42"
- text: Payee
- button "Kroger"
- text: Category
- button "Food"
- button "Split":
  - img
  - text: Split
- text: Account
- button "HSBC"
- text: Date
- textbox: 2025-10-31
- text: Cleared Notes
- textbox: just a note`);
  });

  test('creates a transaction from `/accounts/:id` page', async () => {
    const accountsPage = await navigation.goToAccountsPage();
    const accountPage = await accountsPage.openNthAccount(2);
    const transactionEntryPage = await accountPage.clickCreateTransaction();

    await expect(transactionEntryPage.header).toHaveText('New Transaction');
    await expect(page).toMatchThemeScreenshots();

    await transactionEntryPage.enterAmountWithKeypad('12.34');
    await transactionEntryPage.fillField(
      page.getByTestId('payee-field'),
      'Kroger',
    );
    await transactionEntryPage.fillField(
      page.getByTestId('category-field'),
      'Clothing',
    );

    await transactionEntryPage.createTransaction();

    await expect(accountPage.transactions.nth(0)).toHaveText(
      'KrogerClothing-12.34',
    );
  });

  test('creates an uncategorized transaction from `/categories/uncategorized` page', async () => {
    // Create uncategorized transaction
    let transactionEntryPage = await navigation.goToTransactionEntryPage();
    await transactionEntryPage.enterAmountWithKeypad('12.35');
    await transactionEntryPage.fillField(
      page.getByTestId('account-field'),
      'Ally Savings',
    );
    await transactionEntryPage.createTransaction();

    const uncategorizedPage = await navigation.goToUncategorizedPage();
    transactionEntryPage = await uncategorizedPage.clickCreateTransaction();

    await expect(transactionEntryPage.header).toHaveText('New Transaction');

    await transactionEntryPage.enterAmountWithKeypad('12.34');
    await transactionEntryPage.fillField(
      page.getByTestId('payee-field'),
      'Kroger',
    );

    await transactionEntryPage.createTransaction();

    await expect(uncategorizedPage.transactions.nth(0)).toHaveText(
      'KrogerUncategorized-12.34',
    );
    await expect(page).toMatchThemeScreenshots();
  });

  test('creates a categorized transaction from `/categories/uncategorized` page', async () => {
    // Create uncategorized transaction
    let transactionEntryPage = await navigation.goToTransactionEntryPage();
    await transactionEntryPage.enterAmountWithKeypad('12.35');
    await transactionEntryPage.fillField(
      page.getByTestId('account-field'),
      'Ally Savings',
    );
    await transactionEntryPage.createTransaction();

    const uncategorizedPage = await navigation.goToUncategorizedPage();
    transactionEntryPage = await uncategorizedPage.clickCreateTransaction();

    await expect(transactionEntryPage.header).toHaveText('New Transaction');

    await transactionEntryPage.enterAmountWithKeypad('12.34');
    await transactionEntryPage.fillField(
      page.getByTestId('payee-field'),
      'Kroger',
    );
    await transactionEntryPage.fillField(
      page.getByTestId('category-field'),
      'Clothing',
    );

    await transactionEntryPage.createTransaction();

    await expect(uncategorizedPage.transactions.nth(0)).toHaveText(
      '(No payee)Uncategorized-12.35',
    );
    await expect(page).toMatchThemeScreenshots();
  });
});
