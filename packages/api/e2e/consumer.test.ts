import { expect, test } from '@playwright/test';

// Loads the consumer fixture's production build (built in global-setup.ts,
// served by serve-dist.mjs with COOP/COEP). On master this fails: the consumer
// bundler re-bundles the prebuilt worker and `init` throws a structured-clone
// error. With the self-contained build it passes with no consumer config.
test('a consumer production build boots the worker and seeds a budget', async ({
  page,
}) => {
  await page.goto('/e2e/consumer-dist/index.html');
  const out = page.locator('#out');
  await expect(out).toHaveAttribute('data-state', 'ok', { timeout: 60_000 });
  await expect(out).toContainText('Checking');
});
