import { readFile } from 'node:fs/promises';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

for (const format of ['png', 'pdf'] as const) {
  test(`downloads the complete dashboard as ${format.toUpperCase()}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
    const reports = await new Navigation(page).goToReportsPage();
    await reports.waitToLoad();
    await page.getByTestId('dashboard-menu-button').click();
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId(`export-dashboard-${format}`).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format}$`));
    const path = testInfo.outputPath(`dashboard.${format}`);
    await download.saveAs(path);
    const bytes = await readFile(path);
    expect(bytes.length).toBeGreaterThan(10_000);
    if (format === 'pdf') {
      expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
      expect(bytes.toString()).toContain('/Type /Page');
    } else {
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      // The export includes the cards below the first viewport.
      expect(bytes.readUInt32BE(20)).toBeGreaterThan(2000);
    }
    await expect(page.getByTestId('export-dashboard-modal')).not.toBeVisible();
  });
}

test('persists the number of months shown in a calendar widget', async ({
  page,
}) => {
  await page.goto('/');
  await new ConfigurationPage(page).createTestFile();
  const navigation = new Navigation(page);
  let reports = await navigation.goToReportsPage();
  await reports.waitToLoad();
  await reports.rightClickReportCard('Transaction Calendar');
  await page.getByRole('button', { name: '4 months', exact: true }).click();
  await reports.rightClickReportCard('Transaction Calendar');
  await expect(
    page.getByRole('button', { name: '4 months (current)', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  reports = await navigation.goToReportsPage();
  await reports.waitToLoad();
  await reports.rightClickReportCard('Transaction Calendar');
  await expect(
    page.getByRole('button', { name: '4 months (current)', exact: true }),
  ).toBeVisible();
});

test('cycles themes and remembers the selection after reloading', async ({
  browser,
}) => {
  // The production toggle is deliberately hidden in the normal test environment.
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Actual theme test)',
  });
  try {
    await page.goto('/');
    await new ConfigurationPage(page).createDemoFile();
    const toggle = page.getByTestId('theme-toggle');
    await expect(toggle).toHaveAttribute('data-theme', 'light');
    await toggle.click();
    await expect(toggle).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(toggle).toHaveAttribute('data-theme', 'dark');
    await toggle.click();
    await expect(toggle).toHaveAttribute('data-theme', 'midnight');
    await toggle.click();
    await expect(toggle).toHaveAttribute('data-theme', 'light');
  } finally {
    await page.close();
  }
});

test('explains budget terms on keyboard focus', async ({ page }) => {
  await page.goto('/');
  await new ConfigurationPage(page).createTestFile();
  const term = page.locator('[data-term="available-funds"]').first();
  await term.focus();
  await expect(page.getByTestId('term-definition')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('term-definition')).not.toBeVisible();
});
