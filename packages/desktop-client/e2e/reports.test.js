import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import screenshotConfig from './screenshot.config';

test.describe('Reports', () => {
  let page;
  let navigation;
  let reportsPage;
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
    reportsPage = await navigation.goToReportsPage();
    await reportsPage.waitToLoad();
  });

  test('loads net worth and cash flow reports', async () => {
    const reports = await reportsPage.getAvailableReportList();

    expect(reports).toEqual(['Net Worth', 'Cash Flow']);
    await expect(page).toHaveScreenshot(screenshotConfig(page));
  });

  test('loads net worth graph and checks visuals', async () => {
    await reportsPage.goToNetWorthPage();

    // Move cursor to the middle of the page to show tooltip
    const viewportSize = await page.viewportSize();
    await page.mouse.move(viewportSize.width / 2, viewportSize.height / 2);

    await expect(page).toHaveScreenshot(screenshotConfig(page));
  });

  test('loads cash flow graph and checks visuals', async () => {
    await reportsPage.goToCashFlowPage();

    // Move cursor to the middle of the page to show tooltip
    const viewportSize = await page.viewportSize();
    await page.mouse.move(viewportSize.width / 2, viewportSize.height / 2);

    await expect(page).toHaveScreenshot(screenshotConfig(page));
  });
});
