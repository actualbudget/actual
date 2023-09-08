import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import screenshotConfig from './screenshot.config';

test.describe('Rules', () => {
  let page;
  let navigation;
  let rulesPage;
  let configurationPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    rulesPage = await navigation.goToRulesPage();
  });

  test('checks the page visuals', async () => {
    await expect(page).toHaveScreenshot(screenshotConfig(page));
  });

  test('creates a rule and makes sure it is applied when creating a transaction', async () => {
    await rulesPage.createRule({
      conditions: [
        {
          field: 'payee',
          op: 'is',
          value: 'Fast Internet',
        },
      ],
      actions: [
        {
          field: 'category',
          value: 'General',
        },
      ],
    });

    const rule = rulesPage.getNthRule(0);
    await expect(rule.conditions).toHaveText(['payee is Fast Internet']);
    await expect(rule.actions).toHaveText(['set category to General']);
    await expect(page).toHaveScreenshot(screenshotConfig(page));

    const accountPage = await navigation.goToAccountPage('HSBC');

    await accountPage.createSingleTransaction({
      payee: 'Fast Internet',
      debit: '12.34',
    });

    const transaction = accountPage.getNthTransaction(0);
    await expect(transaction.payee).toHaveText('Fast Internet');
    await expect(transaction.category).toHaveText('General');
    await expect(transaction.debit).toHaveText('12.34');
    await expect(page).toHaveScreenshot(screenshotConfig(page));
  });
});
