import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Mobile Reports', () => {
  let page: Page;
  let navigation: Navigation;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  // The narrow-width branch of the calendar report renders the mobile
  // `TransactionList`, whose rows call `useDisplayPayee`. That hook throws when
  // it renders outside a `DisplayPayeeProvider`, which took the whole report
  // down to `FeatureErrorFallback`. The wide-width branch never hit it because
  // it renders `TransactionTable`, which mounts its own provider internally.
  //
  // This starts at desktop width on purpose, mirroring the original report: the
  // calendar widget is not on the default dashboard and "Add new widget" is
  // desktop-only, so the widget is added wide and then viewed narrow.
  test('transaction calendar renders its transaction list on a narrow viewport', async () => {
    const reportsPage = await navigation.goToReportsPage();
    await reportsPage.waitToLoad();
    await reportsPage.addWidget('Calendar card');
    await reportsPage.goToCalendarPage();

    await page.setViewportSize({ width: 350, height: 600 });

    const showTransactions = page.getByRole('button', {
      name: 'Show transactions',
    });
    const errorFallback = page.getByText(
      'Something went wrong loading this section.',
    );

    // Settle on whichever renders first so a crash reports as a visible error
    // boundary rather than as a timeout waiting for the button.
    await expect(showTransactions.or(errorFallback).first()).toBeVisible();
    await expect(errorFallback).not.toBeVisible();

    await showTransactions.click();

    const transactionList = page.getByLabel('Transaction list');
    await expect(transactionList).toBeVisible();

    // Rendering a row at all is the assertion that matters — a row is what
    // invokes `useDisplayPayee`.
    await expect(transactionList.getByRole('option').first()).toBeVisible();
    await expect(errorFallback).not.toBeVisible();
  });
});
