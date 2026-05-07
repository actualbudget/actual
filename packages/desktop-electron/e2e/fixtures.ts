import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { _electron, test as base } from '@playwright/test';
import type { ElectronApplication, Page, TestInfo } from '@playwright/test';

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

    await rm(testDataDir, { recursive: true, force: true }); // ensure any leftover test data is removed
    await mkdir(testDataDir, { recursive: true });

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

    // TEMP debug: capture electron stdout+stderr to file inside test-results
    const logPath = path.join(
      testInfo.outputDir ?? testInfo.outputPath('.'),
      'electron.log',
    );
    await mkdir(path.dirname(logPath), { recursive: true });
    const logStream = createWriteStream(logPath, { flags: 'a' });
    app.process().stdout?.on('data', d => {
      logStream.write(`[stdout] ${d}`);
      process.stderr.write(`[electron stdout] ${d}`);
    });
    app.process().stderr?.on('data', d => {
      logStream.write(`[stderr] ${d}`);
      process.stderr.write(`[electron stderr] ${d}`);
    });

    await use(app);

    // Cleanup after tests
    await app.close();
    logStream.end();
    await rm(testDataDir, { recursive: true, force: true });
  },

  electronPage: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    await use(page);
  },
});
