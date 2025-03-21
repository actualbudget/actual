import { test, expect, _electron } from '@playwright/test';

test('Onboarding', async () => {
  const electronApp = await _electron.launch({
    args: ['.'],
    env: {
      ACTUAL_DOCUMENT_DIR: 'e2e/data',
      ACTUAL_DATA_DIR: 'e2e/data',
      EXECUTION_CONTEXT: 'playwright',
    },
  });

  const window = await electronApp.firstWindow();

  await expect(window).toHaveScreenshot('onboarding.png');
  await electronApp.close();
});
