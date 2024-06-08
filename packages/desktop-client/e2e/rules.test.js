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

  test('checks the page visuals', async () => {
    await rulesPage.searchFor('Dominion');
    await expect(page).toMatchThemeScreenshots();
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

    await rulesPage.searchFor('Fast Internet');
    const rule = rulesPage.getNthRule(0);
    await expect(rule.conditions).toHaveText(['payee is Fast Internet']);
    await expect(rule.actions).toHaveText(['set category to General']);
    await expect(page).toMatchThemeScreenshots();

    const accountPage = await navigation.goToAccountPage('HSBC');

    await accountPage.createSingleTransaction({
      payee: 'Fast Internet',
      debit: '12.34',
    });

    const transaction = accountPage.getNthTransaction(0);
    await expect(transaction.payee).toHaveText('Fast Internet');
    await expect(transaction.category).toHaveText('General');
    await expect(transaction.debit).toHaveText('12.34');
    await expect(page).toMatchThemeScreenshots();
  });

  test('creates a split transaction rule and makes sure it is applied when creating a transaction', async () => {
    const settingsPage = await navigation.goToSettingsPage();
    await settingsPage.enableExperimentalFeature('splits in rules');

    await expect(settingsPage.page.getByLabel('splits in rules')).toBeChecked();

    rulesPage = await navigation.goToRulesPage();

    await rulesPage.createRule({
      conditions: [
        {
          field: 'payee',
          op: 'is',
          value: 'Ikea',
        },
      ],
      splits: {
        beforeSplitActions: [
          {
            field: 'notes',
            value: 'food / entertainment',
          },
        ],
        splitActions: [
          [
            {
              field: 'a fixed percent',
              value: '90',
            },
            {
              field: 'category',
              value: 'Entertainment',
            },
          ],
          [
            {
              field: 'an equal portion of the remainder',
            },
            {
              field: 'category',
              value: 'Food',
            },
          ],
        ],
      },
    });

    const accountPage = await navigation.goToAccountPage(
      'Capital One Checking',
    );

    await accountPage.createSingleTransaction({
      debit: '100.00',
      payee: 'Ikea',
    });

    const transaction = accountPage.getNthTransaction(0);
    await expect(transaction.payee).toHaveText('Ikea');
    await expect(transaction.notes).toHaveText('food / entertainment');
    await expect(transaction.category).toHaveText('Split');
    await expect(transaction.debit).toHaveText('100.00');
    await expect(page).toMatchThemeScreenshots();

    const firstSplitTransaction = accountPage.getNthTransaction(1);
    await expect(firstSplitTransaction.payee).toHaveText('Ikea');
    await expect(firstSplitTransaction.debit).toHaveText('90.00');
    await expect(firstSplitTransaction.category).toHaveText('Entertainment');

    const secondSplitTransaction = accountPage.getNthTransaction(2);
    await expect(secondSplitTransaction.payee).toHaveText('Ikea');
    await expect(secondSplitTransaction.debit).toHaveText('10.00');
    await expect(secondSplitTransaction.category).toHaveText('Food');
  });
});
