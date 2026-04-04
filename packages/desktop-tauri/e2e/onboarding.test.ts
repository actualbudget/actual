import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from './fixtures';

test.describe('Onboarding', () => {
  test('checks the page visuals', async ({ tauriSession }) => {
    // Wait for app to fully load
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Take screenshot of the onboarding page
    const screenshot1 = await tauriSession.screenshot();
    expect(screenshot1.length).toBeGreaterThan(0);

    // Save screenshot for debugging
    const outputDir = path.resolve(__dirname, 'test-results');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'onboarding-1.png'), screenshot1);

    // Get page source to understand what's rendered
    const source = (await tauriSession.executeScript(
      'return document.body.innerText',
    )) as string;
    console.log('Page text content:', source?.substring(0, 500));

    // Try to find and click the "Don't use a server" button
    try {
      const clicked = (await tauriSession.executeScript(`
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent && btn.textContent.includes("Don't use a server")) {
            btn.click();
            return 'clicked';
          }
        }
        return 'not_found: ' + Array.from(buttons).map(b => b.textContent).join(' | ');
      `)) as string;
      console.log('Button click result:', clicked);
    } catch (e) {
      console.error('Button click error:', e);
    }

    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take screenshot after clicking
    const screenshot2 = await tauriSession.screenshot();
    expect(screenshot2.length).toBeGreaterThan(0);
    fs.writeFileSync(path.join(outputDir, 'onboarding-2.png'), screenshot2);

    // Verify the page changed (screenshots should differ)
    expect(screenshot2).not.toEqual(screenshot1);
  });
});
