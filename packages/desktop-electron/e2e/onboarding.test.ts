// oxlint-disable-next-line eslint/no-restricted-imports -- fix me
import { ConfigurationPage } from '@actual-app/web/e2e/page-models/configuration-page';
import { expect } from '@playwright/test';

import { test } from './fixtures';

test.describe('Onboarding', () => {
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ electronPage }) => {
    configurationPage = new ConfigurationPage(electronPage);
  });

  test('checks the page visuals', async ({ electronPage }) => {
    // Electron windows share the system pointer; keep it off the Start button.
    await electronPage.mouse.move(0, 0);
    await expect(electronPage).toHaveScreenshot();
    await configurationPage.clickOnNoServer();
    await expect(electronPage).toHaveScreenshot();
  });

  test('starts the sync server and navigates to bootstrap page', async ({
    electronPage,
  }) => {
    const bootstrapPage = await configurationPage.clickOnStartSyncServer();

    await expect(bootstrapPage.getHeading()).toHaveText('Welcome to Actual!');
    await expect(electronPage).toHaveScreenshot();
  });
});
