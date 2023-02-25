import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Schedules', () => {
  let page;
  let navigation;
  let schedulesPage;
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
    schedulesPage = await navigation.goToSchedulesPage();
  });

  test('creates a new schedule, posts the transaction and later completes it', async () => {
    await schedulesPage.addNewSchedule({
      payee: 'Home Depot',
      account: 'HSBC',
      amount: 25,
    });

    expect(await schedulesPage.getNthSchedule(0)).toMatchObject({
      payee: 'Home Depot',
      account: 'HSBC',
      amount: '~25.00',
      status: 'Due',
    });

    await schedulesPage.postNthSchedule(0);
    expect(await schedulesPage.getNthSchedule(0)).toMatchObject({
      status: 'Paid',
    });

    // Go to transactions page
    const accountPage = await navigation.goToAccountPage('HSBC');
    expect(await accountPage.getNthTransaction(0)).toMatchObject({
      payee: 'Home Depot',
      category: 'Categorize',
      debit: '25.00',
      credit: '',
    });

    // Go back to schedules page
    await navigation.goToSchedulesPage();
    await schedulesPage.completeNthSchedule(0);
    expect(await schedulesPage.getNthScheduleRow(0)).toHaveText(
      'Show completed schedules',
    );
  });
});
