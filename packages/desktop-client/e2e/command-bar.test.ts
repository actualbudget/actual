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

  async function openAllyPageAction(actionName: string) {
    const commandBar = await openAllySavingsPageActions();
    const commandBarInput = commandBar.getByRole('combobox', {
      name: 'Command Bar',
    });
    await commandBarInput.fill(actionName);

    const actionOption = commandBar.getByRole('option', {
      name: actionName,
      exact: true,
    });
    await expect(actionOption).toBeVisible();
    await expect(actionOption).toHaveAttribute('data-selected', 'true');
    await commandBarInput.press('Control+Enter');

    await expect(
      commandBar.getByPlaceholder('Search actions...'),
    ).toBeVisible();
    await expect(
      commandBar.getByText('Page actions', { exact: true }),
    ).toBeVisible();
    await expect(
      commandBar.getByRole('option', { name: actionName, exact: true }),
    ).toBeVisible();

    return commandBar;
  }

  test('captures the Import page-action view', async () => {
    const actionPage = await openAllyPageAction('Import');

    await expect(actionPage).toMatchThemeScreenshots();
  });

  async function openMainDashboardActionPage() {
    await page.keyboard.press('ControlOrMeta+k');
    const commandBarInput = page.getByRole('combobox', {
      name: 'Command Bar',
    });
    await expect(commandBarInput).toBeVisible();

    const commandBar = page.locator(
      '[cmdk-dialog][data-state="open"] [cmdk-root]',
    );
    await commandBarInput.fill('Main');

    const mainOption = commandBar.getByRole('option', {
      name: 'Main',
      exact: true,
    });
    await expect(mainOption).toBeVisible();
    await expect(mainOption).toHaveAttribute('data-selected', 'true');
    await commandBarInput.press('Control+Enter');

    await expect(
      commandBar.getByPlaceholder('Search actions...'),
    ).toBeVisible();
    await expect(
      commandBar.getByText('Reports', { exact: true }),
    ).toBeVisible();

    return commandBar;
  }

  test('captures the Main dashboard action-page view', async () => {
    const actionPage = await openMainDashboardActionPage();

    await expect(actionPage).toMatchThemeScreenshots();
  });

  test('captures the Main dashboard remove-favorite action-page view', async () => {
    const actionPage = await openMainDashboardActionPage();
    await actionPage
      .getByRole('option', { name: 'Add to favorites', exact: true })
      .click();

    await expect(
      actionPage.getByRole('option', {
        name: 'Remove from favorites',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      actionPage.getByText('Reports', { exact: true }),
    ).toBeVisible();

    await expect(actionPage).toMatchThemeScreenshots();
  });

  async function openThemesPage() {
    await page.keyboard.press('ControlOrMeta+k');
    const commandBarInput = page.getByRole('combobox', {
      name: 'Command Bar',
    });
    await expect(commandBarInput).toBeVisible();

    const commandBar = page.locator(
      '[cmdk-dialog][data-state="open"] [cmdk-root]',
    );
    await commandBarInput.fill('Change theme…');

    const themesOption = commandBar.getByRole('option', {
      name: 'Change theme…',
      exact: true,
    });
    await expect(themesOption).toBeVisible();
    await themesOption.press('Enter');

    await expect(commandBar.getByPlaceholder('Search themes...')).toBeVisible();
    await expect(
      commandBar.getByRole('group', { name: 'Built-in themes' }),
    ).toBeVisible();

    return commandBar;
  }

  test('captures the Themes page view', async () => {
    const themesPage = await openThemesPage();

    await expect(themesPage).toMatchThemeScreenshots();
  });
});
