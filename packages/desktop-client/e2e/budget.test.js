import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';

test.describe('Budget', () => {
  let page;
  let configurationPage;
  let budgetPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    budgetPage = await configurationPage.createTestFile();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('renders the summary information: available funds, overspent, budgeted and for next month', async () => {
    const summary = budgetPage.budgetSummary.first();

    await expect(summary.getByText('Available Funds')).toBeVisible({
      timeout: 10000,
    });
    await expect(summary.getByText(/^Overspent in /)).toBeVisible();
    await expect(summary.getByText('Budgeted')).toBeVisible();
    await expect(summary.getByText('For Next Month')).toBeVisible();
  });

  test('transfer funds to another category', async () => {
    const currentFundsA = await budgetPage.getBalanceForRow(1);
    const currentFundsB = await budgetPage.getBalanceForRow(2);

    await budgetPage.transferAllBalance(1, 2);
    await page.waitForTimeout(1000);

    expect(await budgetPage.getBalanceForRow(2)).toEqual(
      currentFundsA + currentFundsB,
    );
  });

  test('budget table is rendered', async () => {
    await expect(budgetPage.budgetTable).toBeVisible();
    expect(await budgetPage.getTableTotals()).toEqual({
      budgeted: expect.any(Number),
      spent: expect.any(Number),
      balance: expect.any(Number),
    });
  });

  test('clicking on spent amounts opens a transaction page', async () => {
    let categoryName = await budgetPage.getCategoryNameForRow(1);
    let accountPage = await budgetPage.clickOnSpentAmountForRow(1);
    expect(page.url()).toContain('/accounts');
    expect(await accountPage.accountName.textContent()).toMatch(
      new RegExp(String.raw`${categoryName} \(\w+ \d+\)`),
    );
    await page.getByRole('button', { name: 'Back' }).click();
  });
});
