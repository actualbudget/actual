import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';

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

  test('opens the root palette with Ctrl/Cmd+K', async () => {
    await page.keyboard.press('ControlOrMeta+k');
    const commandBar = page.getByRole('combobox', {
      name: 'Command Bar',
    });

    await expect(commandBar).toBeVisible();
    await expect(commandBar).toHaveValue('');

    await page.keyboard.press('Escape');
    await expect(commandBar).not.toBeVisible();
  });

  test('shows sidebar navigation in master order', async () => {
    await page.keyboard.press('ControlOrMeta+k');

    const commandBar = page.getByRole('dialog', {
      name: 'Command Bar',
    });
    const navigationGroup = commandBar.getByRole('group', {
      name: 'Navigation',
    });
    const navigationItems = navigationGroup.getByRole('option');

    await expect(navigationItems).toHaveText([
      'Budget',
      'Reports',
      'Schedules',
      'Payees',
      'Tags',
      'Rules',
      'Bank Sync',
      'Settings',
      /^All Accounts/,
    ]);
    await expect(
      navigationGroup.getByRole('option', { name: 'Bank Sync' }),
    ).toBeVisible();
  });

  test('searches sidebar navigation items', async () => {
    await page.keyboard.press('ControlOrMeta+k');

    const commandBar = page.getByRole('dialog', {
      name: 'Command Bar',
    });
    const search = commandBar.getByRole('combobox', {
      name: 'Command Bar',
    });

    await search.fill('Bank Sync');
    await expect(commandBar.getByRole('option')).toHaveText(['Bank Sync']);
  });

  test('matches the root palette across themes', async () => {
    await page.keyboard.press('ControlOrMeta+k');
    const commandBar = page.getByRole('dialog', {
      name: 'Command Bar',
    });
    await expect(
      commandBar.getByRole('combobox', { name: 'Command Bar' }),
    ).toBeVisible();
    const palette = commandBar.locator('[cmdk-root]');

    await expect(palette).toBeVisible();
    await expect(palette).toMatchThemeScreenshots();
  });

  test('keeps built-in themes and shows the empty theme search state', async () => {
    await page.route('**/customThemeCatalog.json', route =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          { repo: 'broken/missing-name', mode: 'dark' },
          {
            name: 'Valid community theme',
            repo: 'owner/valid-theme',
            mode: 'dark',
          },
        ]),
      }),
    );

    await page.keyboard.press('ControlOrMeta+k');
    const commandBar = page.getByRole('dialog', { name: 'Command Bar' });
    await commandBar.getByRole('option', { name: 'Change theme' }).click();
    await expect(
      commandBar.getByRole('group', { name: 'Built-in themes' }),
    ).toBeVisible();
    await expect(
      commandBar.getByRole('option', { name: /Light/ }),
    ).toBeVisible();

    const search = commandBar.getByRole('combobox', { name: 'Command Bar' });
    await expect(
      commandBar.getByRole('button', { name: 'Back' }),
    ).toBeVisible();
    await expect(commandBar.getByText('back', { exact: true })).toBeVisible();
    await search.fill('no-such-theme');
    await expect(commandBar.getByText('No matching themes')).toBeVisible();
    const palette = commandBar.locator('[cmdk-root]');
    await expect(palette).toMatchThemeScreenshots();

    await page.keyboard.press('Escape');
    await expect(commandBar.getByRole('button', { name: 'Back' })).toHaveCount(
      0,
    );
    await expect(
      commandBar.getByRole('combobox', { name: 'Command Bar' }),
    ).toHaveAttribute('placeholder', /Search/);
    await expect(commandBar.getByText('close', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(commandBar).not.toBeVisible();
  });
});
