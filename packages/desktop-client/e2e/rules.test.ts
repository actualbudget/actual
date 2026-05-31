import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import type { RulesPage } from './page-models/rules-page';

test.describe('Rules', () => {
  let page: Page;
  let navigation: Navigation;
  let rulesPage: RulesPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    rulesPage = await navigation.goToRulesPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the page visuals', async () => {
    await rulesPage.searchFor('Dominion');
    await expect(page).toMatchThemeScreenshots();
  });

  test('creates a rule and makes sure it is applied when creating a transaction', async () => {
    await rulesPage.searchFor('Fast Internet');
    const editRuleModal = await rulesPage.createNewRule();
    await editRuleModal.fill({
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
    await editRuleModal.save();

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

  test('search filters rules by payee name', async () => {
    const allRows = page.getByTestId('table').getByTestId('row');

    await rulesPage.searchFor('Fast Internet');
    console.log('[rules] searched "Fast Internet" — matching rule row should be visible');
    await expect(allRows.first()).toBeVisible();
    await expect(
      allRows.filter({ hasText: 'Fast Internet' }).first(),
    ).toBeVisible();

    await rulesPage.searchFor('zzznonexistentpayeexxx');
    console.log('[rules] searched "zzznonexistentpayeexxx" — expect 0 rows');
    await expect(allRows).toHaveCount(0);
  });

  test('rule count increases by one after creating a new rule', async () => {
    const allRows = page.getByTestId('table').getByTestId('row');
    const initialCount = await allRows.count();
    console.log(`[rules] initial rule count: ${initialCount}`);

    const editRuleModal = await rulesPage.createNewRule();
    await editRuleModal.fill({
      conditions: [{ field: 'payee', op: 'is', value: 'Kroger' }],
      actions: [{ field: 'category', value: 'Food' }],
    });
    await editRuleModal.save();
    console.log(`[rules] created rule: payee is "Kroger" → set category to "Food", expected count: ${initialCount + 1}`);

    await expect(allRows).toHaveCount(initialCount + 1);
  });

  test('search is case-insensitive', async () => {
    const allRows = page.getByTestId('table').getByTestId('row');

    await rulesPage.searchFor('fast internet');
    console.log('[rules] searched "fast internet" (lowercase) — matching rule should appear (case-insensitive)');
    await expect(
      allRows.filter({ hasText: /fast internet/i }).first(),
    ).toBeVisible();
  });

  test('creates a split transaction rule and makes sure it is applied when creating a transaction', async () => {
    rulesPage = await navigation.goToRulesPage();

    const editRuleModal = await rulesPage.createNewRule();
    await editRuleModal.fill({
      conditions: [
        {
          field: 'payee',
          op: 'is',
          value: 'Ikea',
        },
      ],
      actions: [
        {
          op: 'set',
          field: 'notes',
          value: 'food / entertainment',
        },
      ],
      splits: [
        [
          {
            field: 'a fixed percent of the remainder',
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
    });
    await editRuleModal.save();

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
