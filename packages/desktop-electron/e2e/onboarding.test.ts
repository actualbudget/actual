import { test, expect, _electron } from '@playwright/test';

test.describe('Onboarding', () => {
  test('checks the page visuals', async () => {
    const electronApp = await _electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        ACTUAL_DOCUMENT_DIR: 'e2e/data',
        ACTUAL_DATA_DIR: 'e2e/data',
        EXECUTION_CONTEXT: 'playwright',
        NODE_ENV: 'development',
      },
    });

    const window = await electronApp.firstWindow();

    await expect(window).toHaveScreenshot();
    await electronApp.close();
  });
});
