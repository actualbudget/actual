import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';
import { Navigation } from './page-models/navigation';

for (const width of [1280, 375]) {
  test(`manages budget API keys at ${width}px`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const key = {
      id: 'key-id',
      name: 'Transaction importer',
      fileIds: ['budget'],
      createdAt: 1,
    };
    let failLoad = true;
    let failRevoke = true;
    let keys: (typeof key)[] = [];
    await page.context().route('https://sync.example.test/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      let data: unknown = {};
      let status = 200;
      if (path === '/sync/sync') {
        await route.fulfill({
          status: 503,
          json: { status: 'error', reason: 'network-failure' },
        });
        return;
      }
      if (path === '/account/needs-bootstrap') data = { bootstrapped: true };
      if (path === '/account/validate') data = { validated: true };
      if (path === '/sync/list-user-files') data = [];
      if (path === '/account/login-methods') {
        await route.fulfill({
          json: { methods: [{ method: 'password', active: true }] },
        });
        return;
      }
      if (path === '/api-keys') {
        if (request.method() === 'GET' && failLoad) {
          failLoad = false;
          await route.fulfill({ status: 503 });
          return;
        }
        expect(request.headers()['x-actual-token']).toBe('test-session');
        if (request.method() === 'POST') {
          expect(request.postDataJSON()).toEqual({
            fileIds: ['budget'],
            name: key.name,
          });
          keys = [key];
          data = { ...key, key: 'actual_example-only-not-a-real-key' };
          status = 201;
        } else {
          data = keys;
        }
      }
      if (path === '/api-keys/key-id' && request.method() === 'DELETE') {
        if (failRevoke) {
          failRevoke = false;
          await route.fulfill({ status: 503 });
          return;
        }
        keys = [];
      }
      await route.fulfill({ status, json: { status: 'ok', data } });
    });
    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
    await page.evaluate(async () => {
      await window.$send('set-server-url', {
        url: 'https://sync.example.test',
        validate: false,
      });
      await window.$send('subscribe-set-token', { token: 'test-session' });
      await window.$send('save-prefs', { cloudFileId: 'budget' });
    });
    await page.reload();
    const navigation =
      width < 512 ? new MobileNavigation(page) : new Navigation(page);
    const settings = await navigation.goToSettingsPage();
    if (width < 512) await settings.goToSection('General');
    await expect(page.getByRole('alert')).toContainText(
      'Could not load API keys',
    );
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(
      page.getByText('You have no API keys for this budget.'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Retry', exact: true }),
    ).toHaveCount(0);
    const section = page
      .getByRole('heading', { name: 'Security', exact: true })
      .locator('../..');
    await section.screenshot({
      path: test.info().outputPath(`api-keys-list-${width}.png`),
    });
    await page.getByRole('button', { name: 'Add key', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAccessibleName('Add API key');
    await dialog.getByRole('textbox', { name: 'Key name' }).fill(key.name);
    await dialog.getByRole('button', { name: 'Create key' }).click();
    const secret = dialog.locator('#new-api-key');
    await expect(secret).toHaveValue('actual_example-only-not-a-real-key');
    await expect(secret).toBeFocused();
    await expect
      .poll(() =>
        secret.evaluate((input: HTMLInputElement) =>
          input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0),
        ),
      )
      .toBe('actual_example-only-not-a-real-key');
    await expect(dialog).toMatchThemeScreenshots();
    await dialog.screenshot({
      path: test.info().outputPath(`api-keys-create-${width}.png`),
    });
    await secret.press('Enter');
    await expect(secret).toHaveValue('actual_example-only-not-a-real-key');
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(section.getByText(key.name, { exact: true })).toBeVisible();
    await expect(section).toMatchThemeScreenshots();
    await section.screenshot({
      path: test.info().outputPath(`api-keys-populated-${width}.png`),
    });
    await page.getByRole('button', { name: `Revoke ${key.name}` }).click();
    await expect(dialog).toHaveAccessibleName('Revoke API key');
    await dialog.screenshot({
      path: test.info().outputPath(`api-keys-revoke-${width}.png`),
    });
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(keys).toEqual([key]);
    await page.getByRole('button', { name: `Revoke ${key.name}` }).click();
    await dialog
      .getByRole('button', { name: 'Revoke key', exact: true })
      .click();
    await expect(dialog.getByRole('alert')).toContainText('Could not revoke');
    expect(keys).toEqual([key]);
    await dialog
      .getByRole('button', { name: 'Revoke key', exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByText('You have no API keys for this budget.'),
    ).toBeVisible();
    expect(keys).toEqual([]);
    await page.close();
  });
}
