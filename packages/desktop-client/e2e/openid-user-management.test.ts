import { type Page } from '@playwright/test';

import { type RemoteFile } from 'loot-core/server/cloud-storage';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';

const fakeServerUrl = 'http://fake.actual';

type FakeServerControls = {
  waitForNeedsBootstrap: () => Promise<void>;
  remoteFiles: RemoteFile[];
};

function setupFakeOpenIdServer(page: Page): FakeServerControls {
  const adminUser = {
    id: 'user-1',
    userName: 'owner',
    displayName: 'Owner McAdmin',
    role: 'ADMIN',
    enabled: true,
    owner: true,
  } as const;

  const editorUser = {
    id: 'user-2',
    userName: 'editor',
    displayName: 'Editor McUser',
    role: 'BASIC',
    enabled: true,
    owner: false,
  } as const;

  const viewerUser = {
    id: 'user-3',
    userName: 'viewer',
    displayName: 'Viewer Person',
    role: 'BASIC',
    enabled: true,
    owner: false,
  } as const;

  const directoryUsers = [adminUser, editorUser, viewerUser];

  const availableUsers = [
    {
      userId: adminUser.id,
      userName: adminUser.userName,
      displayName: adminUser.displayName,
      owner: 1,
      haveAccess: 1,
    },
    {
      userId: editorUser.id,
      userName: editorUser.userName,
      displayName: editorUser.displayName,
      owner: 0,
      haveAccess: 1,
    },
    {
      userId: viewerUser.id,
      userName: viewerUser.userName,
      displayName: viewerUser.displayName,
      owner: 0,
      haveAccess: 0,
    },
  ];

  const remoteFiles: RemoteFile[] = [
    {
      deleted: false,
      fileId: 'cloud-file-1',
      groupId: 'group-1',
      name: 'Playwright Test Budget',
      encryptKeyId: 'key-1',
      hasKey: true,
      owner: adminUser.id,
      usersWithAccess: availableUsers.map(user => ({
        userId: user.userId,
        userName: user.userName,
        displayName: user.displayName,
        owner: user.owner === 1,
      })),
    },
  ];

  const loginMethods = [
    { method: 'openid', displayName: 'OpenID', active: true },
    { method: 'password', displayName: 'Password', active: false },
  ];

  const jsonHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  let resolveBootstrap: (() => void) | null = null;
  const bootstrapPromise = new Promise<void>(resolve => {
    resolveBootstrap = resolve;
  });

  page.route('**', async route => {
    const requestUrl = route.request().url();

    if (!requestUrl.startsWith(fakeServerUrl)) {
      await route.continue();
      return;
    }

    const url = new URL(requestUrl);
    const pathname = url.pathname;
    const normalizedPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
    const method = route.request().method().toUpperCase();

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: jsonHeaders, body: '' });
      return;
    }

    if (normalizedPath.endsWith('/account/needs-bootstrap/')) {
      if (resolveBootstrap) {
        resolveBootstrap();
        resolveBootstrap = null;
      }

      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          status: 'ok',
          data: {
            bootstrapped: true,
            loginMethod: 'openid',
            availableLoginMethods: loginMethods,
            multiuser: true,
          },
        }),
      });
      return;
    }

    if (normalizedPath.endsWith('/account/login-methods/')) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ methods: loginMethods }),
      });
      return;
    }

    if (normalizedPath.endsWith('/account/validate/')) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          status: 'ok',
          data: {
            userName: adminUser.userName,
            displayName: adminUser.displayName,
            permission: 'ADMIN',
            userId: adminUser.id,
            loginMethod: 'openid',
          },
        }),
      });
      return;
    }

    if (normalizedPath.endsWith('/info/')) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ build: { version: '99.9.9' } }),
      });
      return;
    }

    if (normalizedPath.endsWith('/admin/users/')) {
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          headers: jsonHeaders,
          body: JSON.stringify(directoryUsers),
        });
      } else {
        await route.fulfill({
          status: 200,
          headers: jsonHeaders,
          body: JSON.stringify({ status: 'ok', data: {} }),
        });
      }
      return;
    }

    if (normalizedPath.endsWith('/admin/access/users/')) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify(availableUsers),
      });
      return;
    }

    if (pathname.includes('/admin/access/')) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ status: 'ok', data: {} }),
      });
      return;
    }

    if (pathname.includes('/sync/list-user-files')) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ status: 'ok', data: remoteFiles }),
      });
      return;
    }

    if (pathname.startsWith('/sync/')) {
      await route.abort();
      return;
    }

    if (pathname.startsWith('/openid/')) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ status: 'ok', data: {} }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ status: 'ok', data: {} }),
    });
  });

  return {
    waitForNeedsBootstrap: () => bootstrapPromise,
    remoteFiles,
  };
}

async function seedMultiuserState(
  page: Page,
  waitForNeedsBootstrap: () => Promise<void>,
  remoteFiles: RemoteFile[],
) {
  await page.evaluate(
    ({ url }) => window.$send('set-server-url', { url, validate: false }),
    { url: fakeServerUrl },
  );

  await page.evaluate(() =>
    window.$send('subscribe-set-token', { token: 'fake-token' }),
  );

  await page.reload();
  await waitForNeedsBootstrap();

  await page.waitForFunction(
    () => typeof window.__actionsForMenu?.mergeLocalPrefs === 'function',
  );

  await page.evaluate(
    ({ cloudFileId, groupId }) => {
      window.__actionsForMenu.mergeLocalPrefs({
        cloudFileId,
        groupId,
      });
    },
    {
      cloudFileId: 'cloud-file-1',
      groupId: 'group-1',
    },
  );

  await page.evaluate(
    ({ user }) => {
      window.__actionsForMenu.loadUserData({ data: user });
    },
    {
      user: {
        offline: false,
        userId: 'user-1',
        userName: 'owner',
        displayName: 'Owner McAdmin',
        permission: 'ADMIN',
        loginMethod: 'openid',
        tokenExpired: false,
      },
    },
  );

  await page.evaluate(
    ({ remoteFiles }) => {
      window.__actionsForMenu.setRemoteFiles({ remoteFiles });
    },
    { remoteFiles },
  );
}

async function goToUserDirectory(page: Page) {
  await page.goto('/user-directory');
  await page.waitForURL('**/user-directory');
}

async function goToUserAccess(page: Page) {
  await page.goto('/user-access');
  await page.waitForURL('**/user-access');
}

test.describe('OpenID user management', () => {
  let page: Page;
  let waitForNeedsBootstrap: () => Promise<void>;
  let remoteFiles: RemoteFile[];
  let configurationPage: ConfigurationPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    const serverControls = setupFakeOpenIdServer(page);
    waitForNeedsBootstrap = serverControls.waitForNeedsBootstrap;
    remoteFiles = serverControls.remoteFiles;
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    let usedUiFlow = false;
    try {
      await page
        .getByRole('button', { name: 'Create test file' })
        .waitFor({ timeout: 5000 });
      await configurationPage.createTestFile();
      usedUiFlow = true;
    } catch (error) {
      await page.waitForFunction(
        () => typeof window.__actionsForMenu?.createBudget === 'function',
      );
      await page.evaluate(async () => {
        await window.__actionsForMenu.createBudget({ testMode: true });
      });
    }

    if (!usedUiFlow) {
      await page.waitForURL('**/budget', { waitUntil: 'load' });
    }

    await seedMultiuserState(page, waitForNeedsBootstrap, remoteFiles);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('renders the user directory with filterable results', async () => {
    await goToUserDirectory(page);

    const directoryTable = page.getByTestId('table').first();
    await directoryTable.waitFor();

    const ownerRow = directoryTable
      .getByTestId('row')
      .filter({ hasText: 'Owner McAdmin' });
    const editorRow = directoryTable
      .getByTestId('row')
      .filter({ hasText: 'Editor McUser' });

    await expect(ownerRow).toBeVisible();
    await expect(editorRow).toBeVisible();

    const filterInput = page.getByPlaceholder('Filter users...');
    await filterInput.fill('Editor');

    await expect(editorRow).toBeVisible();
    await expect(ownerRow).toHaveCount(0);
  });

  test('shows current access to the selected file', async () => {
    await goToUserAccess(page);

    const accessTable = page.getByTestId('table').first();
    await accessTable.waitFor();

    const ownerAccessRow = accessTable
      .getByTestId('row')
      .filter({ hasText: 'Owner McAdmin' });
    const editorAccessRow = accessTable
      .getByTestId('row')
      .filter({ hasText: 'Editor McUser' });
    const viewerAccessRow = accessTable
      .getByTestId('row')
      .filter({ hasText: 'Viewer Person' });

    await expect(ownerAccessRow).toBeVisible();
    await expect(editorAccessRow).toBeVisible();
    await expect(viewerAccessRow).toBeVisible();
  });
});
