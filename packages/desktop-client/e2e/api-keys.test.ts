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
      fileId: 'budget',
      createdAt: 1,
    };
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
        expect(request.headers()['x-actual-token']).toBe('test-session');
        if (request.method() === 'POST') {
          expect(request.postDataJSON()).toEqual({
            fileId: 'budget',
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
    await page.getByRole('button', { name: 'Manage keys' }).click();
    await page.getByRole('textbox', { name: 'Key name' }).fill(key.name);
    await page.getByRole('button', { name: 'Create key' }).click();
    const secret = page.locator('#new-api-key');
    await expect(secret).toHaveValue('actual_example-only-not-a-real-key');
    const section = page
      .getByRole('heading', { name: 'Security', exact: true })
      .locator('../..');
    await expect(section).toMatchThemeScreenshots();
    await section.screenshot({
      path: test.info().outputPath(`api-keys-${width}.png`),
    });
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(secret).toHaveCount(0);
    await page.getByRole('button', { name: `Revoke ${key.name}` }).click();
    await page.getByRole('button', { name: 'Revoke key', exact: true }).click();
    await expect(
      page.getByText('You have no API keys for this budget.'),
    ).toBeVisible();
    expect(keys).toEqual([]);
    await page.close();
  });
}
