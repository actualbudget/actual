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
      debit: '12.34'
    });

    expect(await accountPage.getNthTransaction(0)).toMatchObject({
      payee: 'Home Depot',
      notes: 'Notes field',
      category: 'Food',
      debit: '12.34',
      credit: ''
    });
  });

  test('creates a split test transaction', async () => {
    await accountPage.createSplitTransaction([
      {
        payee: 'Krogger',
        notes: 'Notes',
        debit: '333.33'
      },
      {
        category: 'General',
        debit: '222.22'
      },
      {
        debit: '111.11'
      }
    ]);

    expect(await accountPage.getNthTransaction(0)).toMatchObject({
      payee: 'Krogger',
      notes: 'Notes',
      category: 'Split',
      debit: '333.33',
      credit: ''
    });
    expect(await accountPage.getNthTransaction(1)).toMatchObject({
      payee: 'Krogger',
      notes: '',
      category: 'General',
      debit: '222.22',
      credit: ''
    });
    expect(await accountPage.getNthTransaction(2)).toMatchObject({
      payee: 'Krogger',
      notes: '',
      category: 'Categorize',
      debit: '111.11',
      credit: ''
    });
  });
});
