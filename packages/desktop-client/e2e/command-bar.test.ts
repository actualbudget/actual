import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Command bar', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    // Move mouse to corner of the screen;
    // sometimes the mouse hovers on a budget element thus rendering an input box
    // and this breaks screenshot tests
    await page.mouse.move(0, 0);

    // ensure page is loaded
    await expect(page.getByTestId('budget-table')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add group' })).toBeVisible({
      timeout: 10000,
    });
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('Check the command bar visuals', async () => {
    // Open the command bar
    await page.keyboard.press('ControlOrMeta+k');
    const commandBar = page.getByRole('combobox', {
      name: 'Command Bar',
    });

    await expect(commandBar).toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    // Close the command bar
    await page.keyboard.press('Escape');
    await expect(commandBar).not.toBeVisible();
  });

  test('Check the command bar search works correctly', async () => {
    await page.keyboard.press('ControlOrMeta+k');

    const commandBar = page.getByRole('combobox', {
      name: 'Command Bar',
    });

    await expect(commandBar).toBeVisible();
    await expect(commandBar).toHaveValue('');

    // Search and navigate to reports
    await commandBar.fill('reports');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('reports-page')).toBeVisible();

    // Navigate to schedule page
    await page.keyboard.press('ControlOrMeta+k');
    await commandBar.fill('Schedules');
    const schedulesOption = page.getByRole('option', {
      name: 'Schedules',
      exact: true,
    });
    await expect(schedulesOption).toBeVisible();

    await schedulesOption.press('Enter');
    await expect(
      page.getByRole('button', {
        name: 'Add new schedule',
      }),
    ).toBeVisible();
  });

  async function openAllySavingsPageActions() {
    const navigation = new Navigation(page);
    await navigation.goToAccountPage('Ally Savings');

    await page.keyboard.press('ControlOrMeta+k');
    const commandBarInput = page.getByRole('combobox', {
      name: 'Command Bar',
    });
    await expect(commandBarInput).toBeVisible();

    const commandBar = page.locator(
      '[cmdk-dialog][data-state="open"] [cmdk-root]',
    );
    const accountOption = commandBar.getByRole('option', {
      name: 'Ally Savings',
      exact: true,
    });
    await expect(accountOption).toBeVisible();

    for (let i = 0; i < 50; i++) {
      if ((await accountOption.getAttribute('data-selected')) === 'true') {
        break;
      }
      await commandBarInput.press('ArrowDown');
    }

    await expect(accountOption).toHaveAttribute('data-selected', 'true');
    await expect(
      commandBar.getByRole('group', { name: 'Page actions' }),
    ).toBeVisible();

    return commandBar;
  }

  test('opens Filter from the active account Page actions', async () => {
    const commandBar = await openAllySavingsPageActions();
    await commandBar
      .getByRole('option', { name: 'Filter', exact: true })
      .click();

    await expect(
      page
        .getByTestId('filters-select-tooltip')
        .or(page.getByTestId('filters-menu-tooltip')),
    ).toBeVisible();
  });

  test('captures the active account Page-actions view', async () => {
    const commandBar = await openAllySavingsPageActions();

    await expect(commandBar).toMatchThemeScreenshots();
  });
});
