import { expect, test } from '@playwright/test';

// Production-bundle smoke test. `vite build` of the consumer app in
// `e2e/bundled/` follows `browser.js` and would, with the wrong worker
// reference, re-bundle the prebuilt worker and corrupt its RPC so `init` throws
// a structured-clone error and never resolves. This boots the *built* app to
// prove a real bundler build works, complementing browser.test.ts which serves
// the prebuilt `dist` verbatim.
type ScenarioResult = {
  accountNames: string[];
  amounts: number[];
  budgetCount: number;
};

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- global Window augmentation requires interface
  interface Window {
    runScenario: () => Promise<ScenarioResult>;
  }
}

test('a production bundle boots, imports a budget, and reads it back', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await page.waitForFunction(() => typeof window.runScenario === 'function');

  const result = await page.evaluate(() => window.runScenario());

  expect(result.accountNames).toEqual(['Checking']);
  expect(result.amounts).toEqual([-1250, 50000]);
  expect(result.budgetCount).toBe(1);
  // A re-bundled worker fails the init handshake with a clone error surfaced as
  // a page error; assert none slipped through.
  expect(pageErrors).toEqual([]);
});
