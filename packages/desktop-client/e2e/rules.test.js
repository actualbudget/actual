import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

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

    expect(await rulesPage.getNthRule(0)).toMatchObject({
      conditions: ['payee is Fast Internet'],
      actions: ['set category to General'],
    });

    const accountPage = await navigation.goToAccountPage('Bank of America');

    await accountPage.createSingleTransaction({
      payee: 'Fast Internet',
      debit: '12.34',
    });

    expect(await accountPage.getNthTransaction(0)).toMatchObject({
      payee: 'Fast Internet',
      category: 'General',
      debit: '12.34',
    });
  });
});
