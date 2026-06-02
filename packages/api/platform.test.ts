/**
 * Regression test for: ReferenceError: navigator is not defined
 *
 * @actual-app/api is consumed in Node.js environments. The shared platform
 * module has three variants: platform.web.ts (browser), platform.electron.ts
 * (Electron/desktop), and platform.api.ts (Node.js API).
 *
 * When the API package is built or tested, the vite `api` condition must
 * resolve `#shared/platform` to platform.api.ts — NOT platform.web.ts, which
 * references `navigator` at module load time and crashes in Node.js.
 *
 * If platform.api.ts is missing or this test is run without the `api`
 * condition set (see vite.config.mts), the import below will either fail to
 * resolve or load platform.web.ts and throw ReferenceError at import time.
 */

import * as Platform from '@actual-app/core/shared/platform';

test('platform resolves to a Node.js-safe variant under the api condition', () => {
  // platform.web.ts sets isBrowser = true; platform.api.ts sets it to false.
  // A truthy value here means the wrong variant was loaded.
  expect(Platform.isBrowser).toBe(false);

  // Playwright detection is browser-only; always false in Node.js API context.
  expect(Platform.isPlaywright).toBe(false);

  // iOS detection is browser-only; always false in Node.js API context.
  expect(Platform.isIOSAgent).toBe(false);
});
