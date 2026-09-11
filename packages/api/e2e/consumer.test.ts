import { expect, test } from '@playwright/test';

// Loads the consumer fixture's production build (built in global-setup.ts and
// served by serve-dist.mjs). This covers a consumer bundler re-bundling the
// prebuilt worker, with no special host configuration.
test('a consumer production build boots the worker and seeds a budget', async ({
  page,
}) => {
  await page.goto('/e2e/consumer/dist/index.html');
  const out = page.locator('#out');
  await expect(out).toHaveAttribute('data-state', 'ok', { timeout: 60_000 });
  await expect(out).toContainText('Checking');
});
