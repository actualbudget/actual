import type { send } from '@actual-app/core/platform/client/connection';
// oxlint-disable-next-line eslint/no-restricted-imports -- fix me
import { ConfigurationPage } from '@actual-app/web/e2e/page-models/configuration-page';
import { expect } from '@playwright/test';

import { test } from './fixtures';

// The desktop renderer exposes this RPC client to the page.
declare const $send: typeof send;

test.describe('Onboarding', () => {
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ electronPage }) => {
    configurationPage = new ConfigurationPage(electronPage);
  });

  test('checks the page visuals', async ({ electronPage }) => {
    // The reference image shows the Start button under the pointer.
    await electronPage
      .getByRole('button', { name: 'Start', exact: true })
      .hover();
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

  test('registers an existing local budget and syncs it with the server', async ({
    electronPage: page,
  }) => {
    await configurationPage.clickOnNoServer();
    await configurationPage.startFresh();
    const [budget] = await page.evaluate(() => $send('get-budgets'));
    expect(budget.cloudFileId).toBeUndefined();
    expect(budget.groupId).toBeUndefined();

    await page.getByRole('button', { name: 'No server' }).click();
    await page.getByRole('button', { name: 'Start using a server' }).click();
    await configurationPage.clickOnStartSyncServer();
    const password = page.getByPlaceholder('Password', { exact: true });
    await password.fill('test-password');
    await page.getByPlaceholder('Confirm password').fill('test-password');
    await page.getByRole('button', { name: 'OK', exact: true }).click();
    await page.waitForURL('**/login');
    await password.fill('test-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByText(budget.name, { exact: true }).click();

    const register = page.getByRole('button', {
      name: 'Register',
      exact: true,
    });
    await expect(register).toBeVisible();
    expect(await page.evaluate(() => $send('get-remote-files'))).toEqual([]);
    expect(await page.evaluate(() => $send('load-prefs'))).not.toHaveProperty(
      'lastSyncedTimestamp',
    );
    await register.click();

    // A completed sync writes this timestamp. Uploading the file alone does not.
    await expect
      .poll(() => page.evaluate(() => $send('load-prefs')))
      .toMatchObject({
        id: budget.id,
        lastSyncedTimestamp: expect.any(String),
      });
    const [registered] = await page.evaluate(() => $send('get-budgets'));
    expect(registered).toMatchObject({
      id: budget.id,
      cloudFileId: expect.any(String),
      groupId: expect.any(String),
    });
    expect(await page.evaluate(() => $send('get-remote-files'))).toEqual([
      expect.objectContaining({
        fileId: registered.cloudFileId,
        groupId: registered.groupId,
      }),
    ]);
  });
});
