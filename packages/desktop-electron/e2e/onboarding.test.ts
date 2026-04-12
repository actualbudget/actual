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
    await expect(electronPage).toHaveScreenshot();
    await configurationPage.clickOnNoServer();
    await expect(electronPage).toHaveScreenshot();
  });

  test('starts the sync server and navigates to bootstrap page', async ({
    electronPage,
  }) => {
    const consoleMessages: string[] = [];

    electronPage.on('console', msg => {
      consoleMessages.push(msg.text());
      console.info('Console message:', msg.text());
    });

    await electronPage.waitForTimeout(20_000); // wait for potential console messages to arrive
    console.error(
      'Collected console messages:',
      JSON.stringify(consoleMessages),
    );
    expect(consoleMessages.length).toBeGreaterThan(0);

    expect(consoleMessages).toContain(
      'Sync-Server: Listening on localhost:5007...',
    );

    // await expect
    //   .poll(() => consoleMessages, { timeout: 15_000 })
    //   .toEqual(
    //     expect.arrayContaining([
    //       expect.stringContaining('Sync-Server: Migrations: DONE'),
    //       expect.stringContaining(
    //         'Sync-Server: Actual Sync Server has started!',
    //       ),
    //       expect.stringContaining(
    //         'Sync-Server: Listening on localhost:5007...',
    //       ),
    //     ]),
    //   );

    const bootstrapPage = await configurationPage.clickOnStartSyncServer();
    await expect(bootstrapPage.getHeading()).toHaveText('Welcome to Actual!');
    await expect(electronPage).toHaveScreenshot();
  });
});
