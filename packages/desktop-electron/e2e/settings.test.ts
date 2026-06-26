// oxlint-disable no-restricted-imports --fix me
import fs from 'node:fs/promises';
import path from 'node:path';

import { ConfigurationPage } from '@actual-app/web/e2e/page-models/configuration-page';
import { Navigation } from '@actual-app/web/e2e/page-models/navigation';
import type { SettingsPage } from '@actual-app/web/e2e/page-models/settings-page';
import { expect } from '@playwright/test';

import { test } from './fixtures';

test.describe('Settings', () => {
  let navigation: Navigation;
  let settingsPage: SettingsPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ electronPage }) => {
    navigation = new Navigation(electronPage);
    configurationPage = new ConfigurationPage(electronPage);

    await configurationPage.clickOnNoServer();
    await configurationPage.createDemoFile();

    settingsPage = await navigation.goToSettingsPage();
  });

  test('downloads the export of the budget', async ({ electronApp }) => {
    const exportPath = path.resolve('e2e/data/export-test.zip');

    // Mock the native save dialog to auto-return a known path
    await electronApp.evaluate(async ({ dialog }, filePath) => {
      dialog.showSaveDialog = () =>
        Promise.resolve({ canceled: false, filePath });
    }, exportPath);

    await settingsPage.exportData();

    // Wait for the file to appear on disk and check it's not empty
    await expect(async () => {
      const stats = await fs.stat(exportPath);
      expect(stats.size).toBeGreaterThan(0);
    }).toPass({ timeout: 10_000 });
  });
});
