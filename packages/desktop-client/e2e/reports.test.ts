import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { AccountPage } from './page-models/account-page';
import { ConfigurationPage } from './page-models/configuration-page';
import type { CustomReportPage } from './page-models/custom-report-page';
import { Navigation } from './page-models/navigation';
import type { ReportsPage } from './page-models/reports-page';

test.describe('Reports', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;
  let navigation: Navigation;
  let reportsPage: ReportsPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    reportsPage = await navigation.goToReportsPage();
    await reportsPage.waitToLoad();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('loads net worth and cash flow reports', async () => {
    const reports = await reportsPage.getAvailableReportList();

    expect(reports).toEqual([
      'Total Income (YTD)',
      'Total Expenses (YTD)',
      'Avg Per Month',
      'Avg Per Transaction',
      'Net Worth',
      'Cash Flow',
      'This Month',
      'Budget Overview',
      '3-Month Average',
    ]);
    await expect(page).toMatchThemeScreenshots();
  });

  test('right clicking a report card opens context menu', async () => {
    await reportsPage.rightClickReportCard('Net Worth');
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Rename' })).toBeVisible();
  });

  test('loads net worth graph and checks visuals', async () => {
    await reportsPage.goToNetWorthPage();
    await expect(page).toMatchThemeScreenshots();
  });

  test('loads cash flow graph and checks visuals', async () => {
    await reportsPage.goToCashFlowPage();
    await expect(page).toMatchThemeScreenshots();
  });

  test('opens the date range picker and checks visuals', async () => {
    await reportsPage.goToNetWorthPage();

    await page.getByTestId('date-range-picker-trigger').click();
    const picker = page.locator('[data-popover]');
    await expect(picker).toMatchThemeScreenshots();

    // Switch to day granularity
    await picker.getByRole('button', { name: 'Day', exact: true }).click();
    await expect(picker).toMatchThemeScreenshots();
  });

  test.describe('balance forecast', () => {
    test.beforeEach(async () => {
      const settingsPage = await navigation.goToSettingsPage();
      await settingsPage.enableExperimentalFeature('Balance Forecast Report');

      reportsPage = await navigation.goToReportsPage();
      await reportsPage.waitToLoad();
      await reportsPage.addWidget('Balance forecast');
      await reportsPage.goToBalanceForecastPage();
    });

    test('loads balance forecast report with monthly granularity', async () => {
      await expect(page).toMatchThemeScreenshots();
    });

    test('switches to daily granularity', async () => {
      await reportsPage.selectForecastGranularity('Daily');

      await expect(page).toMatchThemeScreenshots();
    });

    test('loads tracking budget forecast report', async () => {
      const settingsPage = await navigation.goToSettingsPage();
      await settingsPage.useBudgetType('Tracking');

      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.goToNextMonth();
      await budgetPage.setBudgetedAmount('Food', '1200', 0);
      await budgetPage.goToNextMonth();
      await budgetPage.setBudgetedAmount('Food', '1200', 0);
      await budgetPage.goToNextMonth();
      await budgetPage.setBudgetedAmount('Food', '1200', 0);

      reportsPage = await navigation.goToReportsPage();
      await reportsPage.waitToLoad();
      await reportsPage.goToBalanceForecastPage();
      await reportsPage.selectForecastSource('Tracking budget');

      await expect(page).toMatchThemeScreenshots();
    });
  });

  test.describe('custom reports', () => {
    let customReportPage: CustomReportPage;

    test.beforeEach(async () => {
      customReportPage = await reportsPage.goToCustomReportPage();
      await page.addStyleTag({
        content: '[role="tooltip"] { display: none !important; }',
      });
    });

    test('splits transactions into exact tag buckets and scopes them', async () => {
      test.setTimeout(90_000);
      await page.getByRole('button', { name: 'More', exact: true }).click();
      await page.getByRole('link', { name: 'Tags', exact: true }).click();
      await page.getByRole('button', { name: 'Add New', exact: true }).click();
      for (const tag of ['red', 'circle']) {
        await page.getByPlaceholder('New tag', { exact: true }).fill(tag);
        await page.getByTestId('new-tag').getByTestId('add-button').click();
        await expect(page.getByText(`#${tag}`, { exact: true })).toBeVisible();
      }

      const accountPage = await navigation.goToAccountPage(
        'Capital One Checking',
      );
      await accountPage.createSingleTransaction({
        debit: '10.00',
        payee: 'Kroger',
        notes: '#red',
        category: 'Food',
      });
      await accountPage.createSingleTransaction({
        debit: '20.00',
        payee: 'Kroger',
        notes: '#circle',
        category: 'Food',
      });
      await accountPage.createSingleTransaction({
        debit: '30.00',
        payee: 'Kroger',
        notes: '#red #circle',
        category: 'Food',
      });

      reportsPage = await navigation.goToReportsPage();
      await reportsPage.waitToLoad();
      customReportPage = await reportsPage.goToCustomReportPage();

      const splitRow = page.getByText('Split:', { exact: true }).locator('..');
      await splitRow.getByRole('button').click();
      await page.getByRole('button', { name: 'Tag', exact: true }).click();
      await customReportPage.selectViz('Data Table');

      await expect(page.getByText('#red', { exact: true })).toBeVisible();
      await expect(page.getByText('#circle', { exact: true })).toBeVisible();
      await expect(
        page.getByText('#circle + #red', { exact: true }),
      ).toBeVisible();
      await expect(page.getByTestId('report-row-#circle + #red')).toContainText(
        '-30.00',
      );

      await page.getByRole('button', { name: 'Tag scope: All tags' }).click();
      const tagScopePopover = page.locator('[data-popover]');
      await expect(tagScopePopover).toMatchThemeScreenshots();
      await page.keyboard.press('Escape');
      const typeRow = page.getByText('Type:', { exact: true }).locator('..');
      await expect(splitRow).toMatchThemeScreenshots();

      await page
        .getByTestId('report-row-#circle + #red')
        .getByText('-30.00', { exact: true })
        .click();
      await page.waitForURL('**/accounts');

      const drilldownAccountPage = new AccountPage(page);
      await expect(
        drilldownAccountPage.transactionTable
          .getByTestId('notes')
          .filter({ hasText: '#red #circle' }),
      ).toHaveCount(1);
      const visibleTagNotes = (
        await drilldownAccountPage.transactionTable
          .getByTestId('notes')
          .allTextContents()
      ).filter(note => note.includes('#'));
      expect(visibleTagNotes).toEqual(['#red #circle']);

      await page.goBack();
      await page.getByTestId('reports-page').waitFor();
      await splitRow.getByRole('button').click();
      await page.getByRole('button', { name: 'Tag', exact: true }).click();
      await customReportPage.selectViz('Data Table');
      await page.getByRole('button', { name: 'Tag scope: All tags' }).click();
      const scopedTagPopover = page.getByTestId('tag-scope-popover');
      await scopedTagPopover
        .getByRole('textbox', { name: 'Search tags' })
        .fill('red');
      await scopedTagPopover
        .getByRole('button', { name: '#red', exact: true })
        .click();
      await expect(
        scopedTagPopover.locator('button').filter({ hasText: '#red' }),
      ).toBeVisible();
      await scopedTagPopover.getByRole('button', { name: 'Apply' }).click();

      await expect(
        page.getByRole('button', { name: 'Tag scope: #red' }),
      ).toBeVisible();
      await expect(page.getByTestId('report-row-#red')).toContainText('-40.00');
      await expect(
        page.getByText('#circle + #red', { exact: true }),
      ).not.toBeVisible();

      await typeRow
        .getByRole('button', { name: 'Payment', exact: true })
        .click();
      await page.getByRole('button', { name: 'Budgeted', exact: true }).click();
      await expect(splitRow.getByRole('button')).toHaveText('Category');
    });

    test('Switches to Data Table and checks the visuals', async () => {
      await customReportPage.selectMode('time');
      await customReportPage.selectViz('Data Table');
      await expect(page).toMatchThemeScreenshots();
    });

    test('Switches to Bar Graph and checks the visuals', async () => {
      await customReportPage.selectMode('time');
      await customReportPage.selectViz('Bar Graph');
      await expect(page).toMatchThemeScreenshots();
    });

    test('Switches to Line Graph and checks the visuals', async () => {
      await customReportPage.selectMode('time');
      await customReportPage.selectViz('Line Graph');
      await expect(page).toMatchThemeScreenshots();
    });

    test('Switches to Area Graph and checks the visuals', async () => {
      await customReportPage.selectMode('total');
      await customReportPage.selectViz('Area Graph');
      await expect(page).toMatchThemeScreenshots();
    });

    test('Switches to Donut Graph and checks the visuals', async () => {
      await customReportPage.selectMode('total');
      await customReportPage.selectViz('Donut Graph');
      await expect(page).toMatchThemeScreenshots();
    });

    test('Validates that "show legend" button shows the legend side-bar', async () => {
      await customReportPage.selectViz('Bar Graph');
      await customReportPage.showLegendButton.click();
      await expect(page).toMatchThemeScreenshots();

      await customReportPage.showLegendButton.click();
    });

    test('Validates that "show summary" button shows the summary', async () => {
      await customReportPage.selectViz('Bar Graph');
      await customReportPage.showSummaryButton.click();
      await expect(page).toMatchThemeScreenshots();

      await customReportPage.showSummaryButton.click();
    });

    test('Validates that "show labels" button shows the labels', async () => {
      await customReportPage.selectViz('Bar Graph');
      await customReportPage.showLabelsButton.click();
      await expect(page).toMatchThemeScreenshots();

      await customReportPage.showLabelsButton.click();
    });
  });
});

test.describe('Reports without transactions', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('creates a custom report in an empty budget', async () => {
    const pageErrors: Error[] = [];
    page.on('pageerror', error => pageErrors.push(error));

    const configurationPage = new ConfigurationPage(page);
    const navigation = new Navigation(page);

    await page.goto('/');
    await configurationPage.startFresh();

    const reportsPage = await navigation.goToReportsPage();
    await reportsPage.waitToLoad();
    const customReportPage = await reportsPage.goToCustomReportPage();

    await expect(page).toHaveURL(/\/reports\/custom/);
    await expect(
      customReportPage.pageContent.getByRole('button', {
        name: 'Total',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      customReportPage.pageContent.getByRole('button', {
        name: 'Time',
        exact: true,
      }),
    ).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
