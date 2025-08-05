import { type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';

test.describe('Help menu', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    // Move mouse to corner of the screen;
    // sometimes the mouse hovers on a budget element thus rendering an input box
    // and this breaks screenshot tests
    await page.mouse.move(0, 0);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Check the help menu visuals', async () => {
    await page.getByRole('button', { name: 'Help' }).click();
    expect(page.getByText('Keyboard shortcuts')).toBeVisible();
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

    await keyboardShortcutsModal.getByText('General').click();
    await expect(
      keyboardShortcutsModal.getByText('Open the help menu'),
    ).toBeVisible();
    await expect(page).toMatchThemeScreenshots();
  });
});
