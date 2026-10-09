import { createServer } from 'node:http';

import { expect } from '@playwright/test';

import { test } from './fixtures';

for (const target of ['', '_blank', 'ipc']) {
  for (const url of [
    'https://example.invalid/help',
    'http://example.invalid/?next=app://actual',
    'https://example.invalid/?next=localhost:3001',
  ]) {
    test(`opens ${url} externally via ${target || 'ordinary click'}`, async ({
      electronApp,
      electronPage,
    }) => {
      const opened = await electronApp.evaluateHandle(({ shell }) => {
        const urls: string[] = [];
        // Capture browser handoffs without launching real OS handlers.
        shell.openExternal = async url => {
          urls.push(url);
        };
        return urls;
      });
      await expect(electronPage).toHaveURL('app://actual/config-server');
      const appUrl = electronPage.url();
      if (target === 'ipc') {
        await electronPage.evaluate(
          url => window.Actual.openURLInBrowser(url),
          url,
        );
      } else {
        await electronPage.evaluate(
          ({ url, target }) => {
            const link = document.createElement('a');
            link.id = 'external-link';
            link.href = url;
            link.target = target;
            link.textContent = 'Open link';
            document.body.append(link);
          },
          { url, target },
        );
        await electronPage
          .locator('#external-link')
          .click({ noWaitAfter: true });
      }
      await expect.poll(() => opened.jsonValue()).toEqual([url]);
      expect(electronPage.url()).toBe(appUrl);
    });
  }
}

test('redirects cannot replace the app with an external page', async ({
  electronApp,
  electronPage,
}) => {
  await expect(electronPage).toHaveURL('app://actual/config-server');
  const appUrl = electronPage.url();
  const server = createServer((_req, res) => {
    res.writeHead(302, { Location: 'https://example.invalid/redirected' });
    res.end();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Missing port');
    }
    // Main-process loadURL bypasses will-navigate, exercising the redirect guard.
    await electronApp.evaluate(async ({ BrowserWindow }, port) => {
      try {
        await BrowserWindow.getAllWindows()[0].loadURL(
          `http://127.0.0.1:${port}/`,
        );
        return null;
      } catch (error) {
        return String(error);
      }
    }, address.port);
    expect(electronPage.url()).toBe(appUrl);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve())),
    );
  }
});

const startupLogTest = test.extend({ corruptGlobalPrefs: true });

startupLogTest(
  'forwards queued startup logs to the app DevTools console',
  async ({ electronPage }) => {
    await expect(electronPage).toHaveURL('app://actual/config-server');
    const messages: string[] = [];
    const session = await electronPage.context().newCDPSession(electronPage);
    session.on('Runtime.consoleAPICalled', event => {
      messages.push(event.args.map(arg => arg.value).join(' '));
    });
    // Runtime.enable also reports console messages emitted before attachment.
    await session.send('Runtime.enable');
    await expect
      .poll(() => messages.join('\n'))
      .toContain('Could not parse global state');
    await session.detach();
  },
);
