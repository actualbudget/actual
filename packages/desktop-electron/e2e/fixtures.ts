/* oxlint-disable react-hooks/rules-of-hooks */
import path from 'node:path';

import {
  test as base,
  _electron,
  Page,
  ElectronApplication,
  TestInfo,
} from '@playwright/test';
import { remove, ensureDir } from 'fs-extra';

type ElectronFixtures = {
  electronApp: ElectronApplication;
  electronPage: Page;
};

// Create the extended test with fixtures
export const test = base.extend<ElectronFixtures>({
  // oxlint-disable-next-line no-empty-pattern
  electronApp: async ({}, use, testInfo: TestInfo) => {
    const uniqueTestId = testInfo.testId.replace(/[^\w-]/g, '-');
    const testDataDir = path.join('e2e/data/', uniqueTestId);

    await remove(testDataDir); // ensure any leftover test data is removed
    await ensureDir(testDataDir);

    const app = await _electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        ACTUAL_DOCUMENT_DIR: testDataDir,
        ACTUAL_DATA_DIR: testDataDir,
        EXECUTION_CONTEXT: 'playwright',
        NODE_ENV: 'development',
      },
    });

    await use(app);

    // Cleanup after tests
    await app.close();
    await remove(testDataDir);
  },

  electronPage: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    await use(page);
  },
});
