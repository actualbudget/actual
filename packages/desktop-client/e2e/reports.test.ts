import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import type { CustomReportPage } from './page-models/custom-report-page';
import { Navigation } from './page-models/navigation';
import type { ReportsPage } from './page-models/reports-page';

test.describe.parallel('Reports', () => {
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

  test('loads net worth graph and checks visuals', async () => {
    await reportsPage.goToNetWorthPage();
    await expect(page).toMatchThemeScreenshots();
  });

  test('loads cash flow graph and checks visuals', async () => {
    await reportsPage.goToCashFlowPage();
    await expect(page).toMatchThemeScreenshots();
  });

  test.describe.parallel('custom reports', () => {
    let customReportPage: CustomReportPage;

    test.beforeEach(async () => {
      customReportPage = await reportsPage.goToCustomReportPage();
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
