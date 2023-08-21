import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Transactions', () => {
  let page;
  let navigation;
  let accountPage;
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
    accountPage = await navigation.goToAccountPage('Ally Savings');
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
  });
});
