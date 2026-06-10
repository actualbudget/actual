import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * App setup file — matched by the `setup` project in playwright.config.ts.
 *
 * Purpose: complete the one-time "server selection" step and persist the
 * resulting localStorage / sessionStorage to `.auth/app-session.json`.
 *
 * Every subsequent test in the `chromium` project will start with this
 * storageState already applied, so the server-selection screen is skipped
 * and tests go straight to the budget or welcome screen.
 *
 * Note: Actual Budget stores its budget data in the browser's Origin Private
 * File System (OPFS), which is NOT captured by storageState. Tests therefore
 * still need to handle the "choose a budget" step on their own (handled by
 * the `page` fixture override in `fixtures/test-fixtures.ts`).
 */

const STORAGE_STATE_PATH = path.join(__dirname, '..', '.auth', 'app-session.json');

setup('save app session state', async ({ page }) => {
  // Ensure the .auth directory exists before Playwright tries to write to it
  const authDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  await page.goto('/');
  await page.waitForLoadState('load');

  // If we land directly on the budget page the app is already set up in this
  // context — save state and exit early.
  if (/\/(budget|accounts)/.test(page.url())) {
    await page.context().storageState({ path: STORAGE_STATE_PATH });
    return;
  }

  // Server selection screen — click "Don't use a server"
  const noServerButton = page.getByRole('button', { name: /don't use a server/i });
  await expect(noServerButton).toBeVisible({ timeout: 15_000 });
  await noServerButton.click();
  // Wait for the server-selection screen to go away before saving state
  await expect(noServerButton).toBeHidden({ timeout: 15_000 });

  // Verify we advanced past the server screen (now on budget selection or budget)
  await expect(page).not.toHaveURL(/server/i);

  // Save localStorage/sessionStorage so subsequent tests skip this screen
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
