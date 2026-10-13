import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test('compares forecast assumptions and persists them in a widget', async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  try {
    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
    const navigation = new Navigation(page);
    const settings = await navigation.goToSettingsPage();
    await settings.enableExperimentalFeature('Balance Forecast Report');
    const reports = await navigation.goToReportsPage();
    await reports.waitToLoad();
    await reports.addWidget('Balance forecast');
    await reports.goToBalanceForecastPage();
    await page.evaluate(async () => {
      const accounts = await window.$send('accounts-get');
      const account = accounts.find(item => item.name === 'Bank of America');
      if (!account) throw new Error('Demo account missing');
      await window.$send('schedule/create', {
        schedule: { name: 'Demo salary', posts_transaction: false },
        conditions: [
          { op: 'is', field: 'account', value: account.id },
          { op: 'is', field: 'amount', value: 300000 },
          {
            op: 'is',
            field: 'date',
            value: { start: '2017-02-01', frequency: 'monthly' },
          },
        ],
      });
      const id = window.location.pathname.split('/').at(-1);
      if (!id) throw new Error('Forecast widget missing');
      await window.$send('dashboard-update-widget', {
        id,
        meta: {
          accounts: [account.id],
          timeFrame: { start: '2017-01', end: '2018-12', mode: 'static' },
          granularity: 'Monthly',
          source: 'schedules',
        },
      });
    });
    await page.reload();
    await page
      .getByRole('button', { name: 'Assumptions', exact: true })
      .click();
    const controls = page.getByTestId('forecast-assumptions');
    await expect(
      controls.getByRole('checkbox', { name: 'Compare with assumptions' }),
    ).not.toBeChecked();
    await controls
      .getByRole('checkbox', { name: 'Compare with assumptions' })
      .check();
    await controls
      .getByLabel('Anchor date', { exact: true })
      .fill('2017-01-01');
    await controls
      .getByLabel('Annual inflation (%)', { exact: true })
      .fill('3');
    await controls
      .getByLabel('Annual salary growth (%)', { exact: true })
      .fill('5');
    await controls.getByRole('checkbox', { name: 'Demo salary' }).check();
    await controls.getByRole('button', { name: 'Apply assumptions' }).click();
    const summary = page.getByTestId('forecast-assumptions-summary');
    await expect(summary).toContainText('Inflation 3% per year');
    await expect(summary).toContainText('Salary growth 5% per year');
    await expect(
      page.getByText('Ending purchasing power:', { exact: false }),
    ).toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    // Invalid edits cannot replace the last applied scenario.
    await controls
      .getByLabel('Annual inflation (%)', { exact: true })
      .fill('101');
    await controls.getByRole('button', { name: 'Apply assumptions' }).click();
    await expect(summary).toContainText('Inflation 3% per year');
    await controls
      .getByLabel('Annual inflation (%)', { exact: true })
      .fill('3');
    await page
      .getByRole('button', { name: 'Save widget', exact: true })
      .click();
    await expect(
      page.getByText('Dashboard widget successfully saved.'),
    ).toBeVisible();
    await page.reload();
    await expect(summary).toContainText('Purchasing power in 2017-01-01 money');
    await expect(summary).toContainText('Salary growth 5% per year');

    await page
      .getByRole('button', { name: 'Assumptions', exact: true })
      .click();
    await expect(
      controls.getByRole('checkbox', { name: 'Demo salary' }),
    ).toBeChecked();
    await controls
      .getByRole('checkbox', { name: 'Compare with assumptions' })
      .uncheck();
    await controls.getByRole('button', { name: 'Apply assumptions' }).click();
    await expect(summary).not.toBeVisible();
    await expect(
      page.getByText('Ending Balance:', { exact: false }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Save widget', exact: true })
      .click();
    await expect(
      page.getByText('Dashboard widget successfully saved.'),
    ).toBeVisible();
    await page.reload();
    await expect(summary).not.toBeVisible();
  } finally {
    await page.close();
  }
});
