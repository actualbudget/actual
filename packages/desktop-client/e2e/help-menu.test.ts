import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Help menu', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;
  let navigation: Navigation;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    configurationPage = new ConfigurationPage(page);
    navigation = new Navigation(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    // Move mouse to corner of the screen;
    // sometimes the mouse hovers on a budget element thus rendering an input box
    // and this breaks screenshot tests
    await page.mouse.move(0, 0);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('Check the help menu visuals', async () => {
    await page.getByRole('button', { name: 'Help' }).click();
    await expect(page.locator('[data-popover]')).toBeVisible();
    await expect(page.getByText('Keyboard shortcuts')).toBeVisible();
    await expect(page).toMatchThemeScreenshots();
    await page.keyboard.press('Escape');
  });

  test('Check the keyboard shortcuts modal visuals', async () => {
    await page.getByRole('button', { name: 'Help' }).click();
    await page.getByText('Keyboard shortcuts').click();

    const keyboardShortcutsModal = page.getByRole('dialog', {
      name: 'Modal dialog',
    });
    await expect(keyboardShortcutsModal).toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    const searchBox =
      keyboardShortcutsModal.getByPlaceholder('Search shortcuts');
    await expect(searchBox).toHaveValue('');

    await searchBox.fill('command');
    await expect(
      keyboardShortcutsModal.getByText('Open the Command Palette'),
    ).toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    const backButton = keyboardShortcutsModal.getByRole('button', {
      name: 'Back',
    });
    await backButton.click();
    await expect(searchBox).toHaveValue('');

    await keyboardShortcutsModal.getByText('Global').click();
    await expect(
      keyboardShortcutsModal.getByText('Open the help menu'),
    ).toBeVisible();
    await expect(page).toMatchThemeScreenshots();
  });

  test("Opens the What's new page when the news feed feature is enabled", async () => {
    // Hidden while the experimental feature is off
    await page.getByRole('button', { name: 'Help' }).click();
    await expect(page.getByText('Keyboard shortcuts')).toBeVisible();
    await expect(page.getByText("What's new")).not.toBeVisible();
    await page.keyboard.press('Escape');

    const settingsPage = await navigation.goToSettingsPage();
    await settingsPage.enableExperimentalFeature(
      'In-app news and release notes',
    );
    await navigation.goToBudgetPage();

    await page.getByRole('button', { name: 'Help' }).click();
    await page.getByText("What's new").click();

    await expect(page).toHaveURL(/\/whats-new$/);
    const whatsNewList = page.getByTestId('whats-new-list');
    await expect(whatsNewList.getByText('Release 99.9.9')).toBeVisible();
    await expect(whatsNewList.getByText('A fixture blog post')).toBeVisible();
    await expect(
      whatsNewList.getByRole('link', { name: 'View on actualbudget.org' }),
    ).toHaveAttribute('href', 'https://actualbudget.org/docs/releases#9999');

    await expect(whatsNewList.getByText('Bugfixes')).not.toBeVisible();
    await whatsNewList
      .getByRole('button', { name: 'Show all changes' })
      .click();
    await expect(whatsNewList.getByText('Bugfixes')).toBeVisible();
  });
});
