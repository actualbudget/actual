import { type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { type BudgetPage } from './page-models/budget-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Budget Multi-Currency', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;
  let budgetPage: BudgetPage;
  let navigation: Navigation;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    configurationPage = new ConfigurationPage(page);
    navigation = new Navigation(page);

    await page.goto('/');
    budgetPage = await configurationPage.createTestFile();

    // Wait for the budget page to fully load before modifying preferences
    await page.waitForSelector('[data-testid="budget-table"]');

    // Enable multi-currency features via direct database calls
    // These are SyncedPrefs, so we need to use the preferences/save method
    await page.evaluate(async () => {
      // Set default currency
      await window.$send('preferences/save', {
        id: 'defaultCurrencyCode',
        value: 'USD',
      });
      // Enable multi-currency (experimental feature)
      await window.$send('preferences/save', {
        id: 'enableMultiCurrency',
        value: 'true',
      });
      // Enable multi-currency on budget accounts
      await window.$send('preferences/save', {
        id: 'enableMultiCurrencyOnBudget',
        value: 'true',
      });
    });

    // Reload to pick up the new preferences
    await page.reload();
    await page.waitForSelector('[data-testid="budget-table"]');
  });

  test.afterEach(async () => {
    await page?.close();
  });

  async function createAccountWithCurrency(
    accountName: string,
    balance: string,
    currencyName: string,
  ) {
    await page.getByRole('button', { name: 'Add account' }).click();
    await page.getByRole('button', { name: 'Create a local account' }).click();

    await page.getByLabel('Name:').fill(accountName);
    await page.getByLabel('Balance:').fill(balance);

    // Select currency
    await page.getByRole('button', { name: /Currency/ }).click();
    await page.getByRole('button', { name: currencyName }).click();

    await page.getByRole('button', { name: 'Create', exact: true }).click();

    // Wait for account to be created
    await page.waitForTimeout(500);
  }

  async function navigateToBudget() {
    await page.getByRole('link', { name: 'Budget', exact: true }).click();
    await page.waitForSelector('[data-testid="budget-table"]');
  }

  async function getToBudgetValueForCurrency(
    currencyCode: string,
  ): Promise<string> {
    // Find the budget summary where this currency has a non-zero positive To Budget value
    // We need to look through all visible budget summaries
    const budgetSummaries = page.getByTestId('budget-summary');
    const count = await budgetSummaries.count();

    for (let i = 0; i < count; i++) {
      const summary = budgetSummaries.nth(i);
      const amountLocator = summary.getByTestId(
        `to-budget-${currencyCode}-amount`,
      );
      if ((await amountLocator.count()) > 0) {
        const text = (await amountLocator.textContent()) ?? '';
        // Check if this value contains digits other than just zeros
        const digits = text.replace(/[^0-9]/g, '');
        if (digits && parseInt(digits, 10) > 0) {
          return text;
        }
      }
    }
    // Fall back to first if no positive value found
    const budgetSummary = page.getByTestId('budget-summary').first();
    const amountLocator = budgetSummary.getByTestId(
      `to-budget-${currencyCode}-amount`,
    );
    return (await amountLocator.textContent()) ?? '';
  }

  async function clickToBudgetForCurrency(currencyCode: string) {
    // Find the budget summary where this currency has a non-zero positive To Budget value
    const budgetSummaries = page.getByTestId('budget-summary');
    const count = await budgetSummaries.count();

    for (let i = 0; i < count; i++) {
      const summary = budgetSummaries.nth(i);
      const amountLocator = summary.getByTestId(
        `to-budget-${currencyCode}-amount`,
      );
      if ((await amountLocator.count()) > 0) {
        const text = (await amountLocator.textContent()) ?? '';
        // Check if this value contains digits other than just zeros
        // Extract only digits and check if any are non-zero
        const digits = text.replace(/[^0-9]/g, '');
        if (digits && parseInt(digits, 10) > 0) {
          await amountLocator.click();
          return;
        }
      }
    }
    // Fall back to first if no positive value found
    const budgetSummary = page.getByTestId('budget-summary').first();
    const amountLocator = budgetSummary.getByTestId(
      `to-budget-${currencyCode}-amount`,
    );
    await amountLocator.click();
  }

  test.describe('Hold for Next Month', () => {
    test('holds EUR funds for next month without affecting USD', async () => {
      // Create an EUR account with starting balance
      await createAccountWithCurrency('EUR Account', '1000', 'EUR - Euro (€)');
      await navigateToBudget();

      // Get the initial USD To Budget value
      const usdBefore = await getToBudgetValueForCurrency('USD');

      // Click on the EUR To Budget value to open the menu
      await clickToBudgetForCurrency('EUR');

      // Click on "Hold for next month"
      await page.getByRole('button', { name: 'Hold for next month' }).click();

      // The hold dialog should appear with the EUR amount
      const holdInput = page.getByRole('textbox');
      await expect(holdInput).toBeVisible();
      const holdValue = await holdInput.inputValue();
      // The value should be 1,000.00 (the EUR amount)
      expect(holdValue).toMatch(/1[,.]?000/);

      // Click Hold button
      await page.getByRole('button', { name: 'Hold' }).click();

      // Wait for the budget to update
      await page.waitForTimeout(500);

      // The key test: Verify USD To Budget is NOT affected - should be the same as before
      const usdAfter = await getToBudgetValueForCurrency('USD');
      expect(usdAfter).toBe(usdBefore);
    });

    test('holds GBP funds for next month without affecting USD', async () => {
      // Create a GBP account with starting balance
      await createAccountWithCurrency(
        'GBP Account',
        '500',
        'GBP - Pound Sterling (£)',
      );
      await navigateToBudget();

      // Get the initial USD To Budget value
      const usdBefore = await getToBudgetValueForCurrency('USD');

      // Click on the GBP To Budget value to open the menu
      await clickToBudgetForCurrency('GBP');

      // Click on "Hold for next month"
      await page.getByRole('button', { name: 'Hold for next month' }).click();

      // The hold dialog should appear with the GBP amount
      const holdInput = page.getByRole('textbox');
      await expect(holdInput).toBeVisible();
      const holdValue = await holdInput.inputValue();
      // The value should be 500.00 (the GBP amount)
      expect(holdValue).toMatch(/500/);

      // Click Hold button
      await page.getByRole('button', { name: 'Hold' }).click();

      // Wait for the budget to update
      await page.waitForTimeout(500);

      // The key test: Verify USD To Budget is NOT affected - should be the same as before
      const usdAfter = await getToBudgetValueForCurrency('USD');
      expect(usdAfter).toBe(usdBefore);
    });
  });

  test.describe('Currency Isolation', () => {
    test('multiple currencies can be held independently', async () => {
      // Create both EUR and GBP accounts
      await createAccountWithCurrency('EUR Account', '1000', 'EUR - Euro (€)');
      await createAccountWithCurrency(
        'GBP Account',
        '500',
        'GBP - Pound Sterling (£)',
      );
      await navigateToBudget();

      // Verify all three currencies show in To Budget
      const budgetSummary = page.getByTestId('budget-summary').first();
      await expect(budgetSummary.getByTestId('to-budget-USD')).toBeVisible();
      await expect(budgetSummary.getByTestId('to-budget-EUR')).toBeVisible();
      await expect(budgetSummary.getByTestId('to-budget-GBP')).toBeVisible();

      // Get initial values
      const usdInitial = await getToBudgetValueForCurrency('USD');

      // Hold EUR funds
      await clickToBudgetForCurrency('EUR');
      await page.getByRole('button', { name: 'Hold for next month' }).click();
      await page.getByRole('button', { name: 'Hold' }).click();
      await page.waitForTimeout(500);

      // Hold GBP funds
      await clickToBudgetForCurrency('GBP');
      await page.getByRole('button', { name: 'Hold for next month' }).click();
      await page.getByRole('button', { name: 'Hold' }).click();
      await page.waitForTimeout(500);

      // The key test: Verify USD is unchanged after holding both EUR and GBP
      const usdFinal = await getToBudgetValueForCurrency('USD');
      expect(usdFinal).toBe(usdInitial);
    });
  });

  test.describe('Category Currency Budgeting', () => {
    async function findCategoryRow(categoryName: string) {
      // Find the row containing the category name
      const rows = page.getByTestId('row');
      const count = await rows.count();

      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        const nameCell = row.getByTestId('category-name');
        if ((await nameCell.count()) > 0) {
          const text = await nameCell.textContent();
          if (text?.includes(categoryName)) {
            return row;
          }
        }
      }
      return null;
    }

    async function changeCategoryCurrency(
      categoryName: string,
      newCurrencyCode: string,
    ) {
      const row = await findCategoryRow(categoryName);
      if (!row) {
        throw new Error(`Category "${categoryName}" not found`);
      }

      // The currency dropdown is a custom Select component (Button + Popover)
      // Find the button in the row that has a currency code or "USD" text
      const buttons = row.getByRole('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        // Look for currency code patterns (USD, EUR, GBP, etc.)
        if (text && /^[A-Z]{3}$/.test(text.trim())) {
          await button.click();
          // Wait for menu to open in a popover
          await page.waitForTimeout(200);
          // Find the menu item within the popover that just opened
          const popover = page.locator('[data-popover]');
          await popover
            .getByRole('button', { name: newCurrencyCode, exact: true })
            .click();
          await page.waitForTimeout(300);
          return;
        }
      }
      throw new Error(
        `Currency dropdown not found for category "${categoryName}"`,
      );
    }

    async function enterBudgetAmountForCategory(
      categoryName: string,
      amount: string,
    ) {
      const row = await findCategoryRow(categoryName);
      if (!row) {
        throw new Error(`Category "${categoryName}" not found`);
      }

      // Find and click the budget cell to start editing
      const budgetCell = row.getByTestId('budget');
      await budgetCell.click();

      // Wait for input to appear and fill it
      const input = row.getByRole('textbox');
      await input.fill(amount);
      await input.press('Tab');
      await page.waitForTimeout(300);
    }

    test('budgeting in EUR category affects only EUR To Budget', async () => {
      // Create a EUR account with starting balance
      await createAccountWithCurrency('EUR Account', '1000', 'EUR - Euro (€)');
      await navigateToBudget();

      // First, clear the Food category budget to start fresh (this removes any existing USD budget)
      await enterBudgetAmountForCategory('Food', '0');

      // Change the category's currency to EUR BEFORE taking our baseline snapshot
      await changeCategoryCurrency('Food', 'EUR');

      // Now get initial USD To Budget value (with category already set to EUR and no budget)
      const usdBefore = await getToBudgetValueForCurrency('USD');

      // Enter a budget amount for the Food category (now in EUR)
      await enterBudgetAmountForCategory('Food', '200');

      // The key test: USD To Budget should be unchanged (budgeting in EUR doesn't affect USD)
      const usdAfter = await getToBudgetValueForCurrency('USD');
      expect(usdAfter).toBe(usdBefore);
    });

    test('budgeting in GBP category affects only GBP To Budget', async () => {
      // Create a GBP account with starting balance
      await createAccountWithCurrency(
        'GBP Account',
        '500',
        'GBP - Pound Sterling (£)',
      );
      await navigateToBudget();

      // First, clear the Clothing category budget to start fresh
      await enterBudgetAmountForCategory('Clothing', '0');

      // Change the category's currency to GBP BEFORE taking our baseline snapshot
      await changeCategoryCurrency('Clothing', 'GBP');

      // Get initial USD To Budget value (with category already set to GBP and no budget)
      const usdBefore = await getToBudgetValueForCurrency('USD');

      // Enter a budget amount for the Clothing category (now in GBP)
      await enterBudgetAmountForCategory('Clothing', '100');

      // The key test: USD To Budget should be unchanged
      const usdAfter = await getToBudgetValueForCurrency('USD');
      expect(usdAfter).toBe(usdBefore);
    });

    test('changing category currency back to default affects correct budget', async () => {
      // Create a EUR account with starting balance
      await createAccountWithCurrency('EUR Account', '1000', 'EUR - Euro (€)');
      await navigateToBudget();

      // First, clear the Food category budget to start fresh
      await enterBudgetAmountForCategory('Food', '0');

      // Change Food category to EUR FIRST (before measuring baseline)
      await changeCategoryCurrency('Food', 'EUR');

      // Get baseline values with category in EUR and no budget
      const usdBaseline = await getToBudgetValueForCurrency('USD');

      // Budget an amount in EUR
      await enterBudgetAmountForCategory('Food', '200');

      // USD should still be the same (we budgeted in EUR)
      const usdAfterEurBudget = await getToBudgetValueForCurrency('USD');
      expect(usdAfterEurBudget).toBe(usdBaseline);

      // Now change the category back to USD (default)
      await changeCategoryCurrency('Food', 'USD');
      await page.waitForTimeout(500);

      // Get values after changing back
      const usdAfterRevert = await getToBudgetValueForCurrency('USD');

      // USD To Budget should have decreased now (the €200 budget is now counted as $200 against USD)
      expect(usdAfterRevert).not.toBe(usdAfterEurBudget);
    });
  });
});
