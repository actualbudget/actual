import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';

test.describe('Tour', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  async function startTourFromHelpMenu() {
    await page.getByRole('button', { name: 'Help' }).click();
    await page.getByText('Take a tour').click();
    return page.getByTestId('tour-tooltip');
  }

  test('walks through every step of the welcome tour', async () => {
    const tooltip = await startTourFromHelpMenu();

    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Welcome to Actual!');
    await expect(tooltip.getByTestId('tour-chapter')).toHaveText(
      'Getting started',
    );

    const counter = tooltip.getByTestId('tour-progress');
    await expect(counter).toBeVisible();
    const total = Number((await counter.textContent())?.match(/of (\d+)/)?.[1]);
    expect(total).toBeGreaterThan(1);

    for (let step = 2; step <= total; step++) {
      // Steps that invite the user to click something offer "Do it later"
      // instead of "Next".
      await tooltip
        .getByRole('button', { name: /^(Next|Do it later)$/ })
        .click();
      await expect(counter).toHaveText(`${step} of ${total}`);
    }

    await expect(tooltip).toContainText("What's next");
    await tooltip.getByRole('button', { name: 'Finish' }).click();
    await expect(tooltip).not.toBeVisible();
  });

  test('pauses while the add account modal is open and resumes afterwards', async () => {
    const tooltip = await startTourFromHelpMenu();
    await expect(tooltip).toBeVisible();

    // Advance to the interactive "add your first account" step (the fourth
    // step of the welcome tour).
    for (let step = 2; step <= 4; step++) {
      await tooltip.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(tooltip.getByTestId('tour-progress')).toHaveText(
        `${step} of 6`,
      );
    }
    await expect(tooltip).toContainText('Add your first account');

    await page.getByTestId('sidebar-add-account').click();
    await expect(
      page.getByRole('heading', { name: 'Add account' }),
    ).toBeVisible();
    await expect(tooltip).not.toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Help is always nearby');
  });

  test('the getting started checklist launches tour chapters', async () => {
    await page.getByRole('button', { name: 'Help' }).click();
    await page.getByText('Getting started checklist').click();

    const checklist = page.getByTestId('onboarding-checklist');
    await expect(checklist).toBeVisible();
    await expect(checklist.getByRole('listitem')).toHaveCount(5);

    await checklist
      .getByRole('button', { name: /Schedule a recurring bill/ })
      .click();

    const tooltip = page.getByTestId('tour-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip.getByTestId('tour-chapter')).toHaveText(
      'Schedule bills & income',
    );
    await expect(page).toHaveURL(/\/schedules/);

    await tooltip.getByRole('button', { name: 'Skip tour' }).click();
    await expect(tooltip).not.toBeVisible();
  });

  test('skipping the tour dismisses it', async () => {
    const tooltip = await startTourFromHelpMenu();

    await expect(tooltip).toBeVisible();
    await tooltip.getByRole('button', { name: 'Skip tour' }).click();
    await expect(tooltip).not.toBeVisible();
  });
});
