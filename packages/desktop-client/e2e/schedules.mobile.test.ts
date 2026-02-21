import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';
import type { MobileSchedulesPage } from './page-models/mobile-schedules-page';

test.describe('Mobile Schedules', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let schedulesPage: MobileSchedulesPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    // Set mobile viewport
    await page.setViewportSize({
      width: 350,
      height: 600,
    });

    await page.goto('/');
    await configurationPage.createTestFile();

    // Navigate to schedules page and wait for it to load
    schedulesPage = await navigation.goToSchedulesPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the page visuals', async () => {
    await schedulesPage.waitForLoadingToComplete();

    // Check that the header is present
    await expect(
      page.getByRole('heading', { name: 'Schedules' }),
    ).toBeVisible();

    // Check that the add button is present
    await expect(schedulesPage.addButton).toBeVisible();

    // Check that the search box is present with proper placeholder
    await expect(schedulesPage.searchBox).toBeVisible();
    await expect(schedulesPage.searchBox).toHaveAttribute(
      'placeholder',
      'Filter schedules…',
    );

    await expect(page).toMatchThemeScreenshots();
  });

  test('page handles empty state gracefully', async () => {
    // Search for something that won't match to get empty state
    await schedulesPage.searchFor('NonExistentSchedule123456789');
    await page.waitForTimeout(500);

    // Check that empty message is shown
    await expect(schedulesPage.emptyMessage).toBeVisible();

    await expect(page).toMatchThemeScreenshots();
  });

  test('clicking on a schedule opens edit form', async () => {
    await schedulesPage.waitForLoadingToComplete();

    // Wait for at least one schedule to be present
    await expect(async () => {
      const scheduleCount = await schedulesPage.getScheduleCount();
      expect(scheduleCount).toBeGreaterThan(0);
    }).toPass();

    // Click on the first schedule
    await schedulesPage.clickSchedule(0);

    // Wait for the edit page to load
    await expect(
      page.getByRole('heading', { name: 'Edit Schedule' }),
    ).toBeVisible();

    // Check that the save button is present
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();

    await expect(page).toMatchThemeScreenshots();
  });

  test('searches and filters schedules', async () => {
    await schedulesPage.waitForLoadingToComplete();

    // Wait for schedules to load
    await expect(async () => {
      const scheduleCount = await schedulesPage.getScheduleCount();
      expect(scheduleCount).toBeGreaterThan(0);
    }).toPass();

    // Search for a specific schedule
    await schedulesPage.searchFor('Dominion Power');
    await page.waitForTimeout(500);

    // Verify search box has the value
    await expect(schedulesPage.searchBox).toHaveValue('Dominion Power');
    expect(await schedulesPage.getScheduleCount()).toBe(1);

    await expect(page).toMatchThemeScreenshots();

    // Clear search
    await schedulesPage.clearSearch();
    await page.waitForTimeout(500);

    // Verify all schedules are visible again
    expect(await schedulesPage.getScheduleCount()).toBeGreaterThan(1);

    await expect(page).toMatchThemeScreenshots();
  });

  test('displays schedule details correctly in list', async () => {
    await schedulesPage.waitForLoadingToComplete();

    // Wait for schedules to load
    await expect(async () => {
      const scheduleCount = await schedulesPage.getScheduleCount();
      expect(scheduleCount).toBeGreaterThan(0);
    }).toPass();

    // Get the first schedule and verify it has content
    const firstSchedule = schedulesPage.getNthSchedule(0);
    await expect(firstSchedule).toBeVisible();

    // Verify schedule contains expected text elements
    const scheduleText = await firstSchedule.textContent();
    expect(scheduleText).toBeTruthy();
    expect(scheduleText?.length).toBeGreaterThan(0);

    await expect(page).toMatchThemeScreenshots();
  });
});
