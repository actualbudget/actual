// Import Playwright test and assertion dependencies
import { test, expect } from '@playwright/test';

// Import Page Models and Screenshot Configuration
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import screenshotConfig from './screenshot.config';

// Define a test suite named 'Accounts'
test.describe('Accounts', () => {
  // Declare variables for page, navigation, and configurationPage
  let page;
  let navigation;
  let configurationPage;

  // Run before all tests in the suite, setting up the browser
  test.beforeAll(async ({ browser }) => {
    // Create a new page in the browser
    page = await browser.newPage();
    
    // Initialize navigation and configurationPage objects
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    // Navigate to the application's homepage
    await page.goto('/');
    
    // Create a test file using the configurationPage
    await configurationPage.createTestFile();
  });

  // Run after all tests in the suite, closing the browser page
  test.afterAll(async () => {
    await page.close();
  });

  // Test: 'creates a new account and views the initial balance transaction'
  test('creates a new account and views the initial balance transaction', async () => {
    // Create a new account using the navigation object
    const accountPage = await navigation.createAccount({
      name: 'New Account',
      offBudget: false,
      balance: 100,
    });

    // Get the first transaction from the account page
    const transaction = accountPage.getNthTransaction(0);

    // Perform assertions on various transaction details
    await expect(transaction.payee).toHaveText('Starting Balance');
    await expect(transaction.notes).toHaveText('');
    await expect(transaction.category).toHaveText('Starting Balances');
    await expect(transaction.debit).toHaveText('');
    await expect(transaction.credit).toHaveText('100.00');

    // Capture a screenshot and assert its properties
    await expect(page).toHaveScreenshot(screenshotConfig(page));
  });

  // Test: 'closes an account'
  test('closes an account', async () => {
    // Navigate to the 'Roth IRA' account page using navigation
    const accountPage = await navigation.goToAccountPage('Roth IRA');

    // Assert the account name on the page
    await expect(accountPage.accountName).toHaveText('Roth IRA');

    // Close the account, selecting a transfer account
    const modal = await accountPage.clickCloseAccount();
    await modal.selectTransferAccount('Vanguard 401k');

    // Capture a screenshot after the transfer modal action
    await expect(page).toHaveScreenshot(screenshotConfig(page));

    // Close the modal
    await modal.closeAccount();

    // Assert the updated account name
    await expect(accountPage.accountName).toHaveText('Closed: Roth IRA');

    // Capture a screenshot after the account closure
    await expect(page).toHaveScreenshot(screenshotConfig(page));
  });
});
