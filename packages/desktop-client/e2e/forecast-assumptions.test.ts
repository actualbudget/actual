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
    await expect
      .poll(() =>
        page.evaluate(async () =>
          (await window.$send('dashboard-get-widgets')).some(
            widget => widget.type === 'balance-forecast-card',
          ),
        ),
      )
      .toBe(true);
    const demo = await page.evaluate(async () => {
      const accounts = await window.$send('accounts-get');
      const account = accounts.find(item => item.name === 'Bank of America');
      if (!account) throw new Error('Demo account missing');
      const scheduleId = await window.$send('schedule/create', {
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
      const widgets = await window.$send('dashboard-get-widgets');
      const id = widgets.find(
        widget => widget.type === 'balance-forecast-card',
      )?.id;
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
      return { accountId: account.id, scheduleId, widgetId: id };
    });
    await page.goto(`/reports/forecast/${demo.widgetId}`);
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
    // Solid purchasing power beside the dashed baseline; no third line.
    const chartLines = page.locator('.recharts-line-curve');
    await expect(chartLines).toHaveCount(2);
    await expect(summary).toContainText('Dashed line: baseline forecast');
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
    await expect(chartLines).toHaveCount(1);
    await page
      .getByRole('button', { name: 'Save widget', exact: true })
      .click();
    await expect(
      page.getByText('Dashboard widget successfully saved.'),
    ).toBeVisible();
    await page.reload();
    await expect(summary).not.toBeVisible();
    // A missing summary also matches while the reloaded budget is still starting.
    await expect(
      page.getByRole('button', { name: 'Assumptions', exact: true }),
    ).toBeVisible();
    // Named lines retain their independent filters and use the widget's saved assumptions.
    await page.evaluate(async ({ accountId, scheduleId, widgetId }) => {
      await window.$send('dashboard-update-widget', {
        id: widgetId,
        meta: {
          accounts: [accountId],
          timeFrame: { start: '2017-01', end: '2018-12', mode: 'static' },
          granularity: 'Monthly',
          source: 'schedules',
          assumptions: {
            anchorDate: '2017-01-01',
            inflationRate: 0.03,
            salaryGrowthRate: 0.05,
            incomeScheduleIds: [scheduleId],
          },
          series: [
            {
              id: 'all',
              name: 'All commitments',
              accounts: [accountId],
              conditions: [],
              conditionsOp: 'and',
            },
            {
              id: 'expenses',
              name: 'Expenses only',
              accounts: [accountId],
              conditions: [{ field: 'amount', op: 'lt', value: 0 }],
              conditionsOp: 'and',
            },
          ],
        },
      });
    }, demo);
    await page.reload();
    await expect(summary).toContainText('Inflation 3% per year');
    await expect(
      page.getByRole('columnheader', { name: 'Ending purchasing power' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'All commitments' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Expenses only' }),
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Baseline (nominal)' }),
    ).toBeVisible();
    // Each named line shows purchasing power; the table carries its baseline.
    await expect(chartLines).toHaveCount(2);
    await expect(summary).not.toContainText('Dashed line');

    // Rolling ranges and assumptions must survive the same widget save.
    const startToday = page.getByRole('button', {
      name: 'Start today',
      exact: true,
    });
    await startToday.click();
    await page
      .getByRole('button', { name: 'Save widget', exact: true })
      .click();
    await expect(
      page.getByText('Dashboard widget successfully saved.'),
    ).toBeVisible();
    await page.reload();
    await expect(startToday).toHaveAttribute('aria-pressed', 'true');
    await expect(summary).toContainText('Inflation 3% per year');
    await expect(summary).toContainText('Salary growth 5% per year');
    const savedMeta = await page.evaluate(async widgetId => {
      const widgets = await window.$send('dashboard-get-widgets');
      return widgets.find(widget => widget.id === widgetId)?.meta;
    }, demo.widgetId);
    expect(savedMeta).toMatchObject({
      monthsFromToday: 24,
      assumptions: { incomeScheduleIds: [demo.scheduleId] },
    });
  } finally {
    await page.close();
  }
});

test('colors positive purchasing power independently of a negative baseline', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await new ConfigurationPage(page).createTestFile();
  const navigation = new Navigation(page);
  const settings = await navigation.goToSettingsPage();
  await settings.enableExperimentalFeature('Balance Forecast Report');
  const reports = await navigation.goToReportsPage();
  await reports.waitToLoad();
  await reports.addWidget('Balance forecast');
  await reports.goToBalanceForecastPage();
  const forecast = await page.evaluate(async () => {
    const accountId = await window.$send('account-create', {
      name: 'Salary comparison',
    });
    await window.$send('transaction-add', {
      id: crypto.randomUUID(),
      account: accountId,
      date: '2016-12-31',
      amount: 200000,
    });
    const scheduleIds = [];
    for (const [name, amount] of [
      ['Salary', 100000],
      ['Expenses', -110000],
    ] as const) {
      scheduleIds.push(
        await window.$send('schedule/create', {
          schedule: { name, posts_transaction: false },
          conditions: [
            { op: 'is', field: 'account', value: accountId },
            { op: 'is', field: 'amount', value: amount },
            {
              op: 'is',
              field: 'date',
              value: { start: '2017-01-01', frequency: 'monthly' },
            },
          ],
        }),
      );
    }
    const assumptions = {
      anchorDate: '2016-01-01',
      inflationRate: 0.03,
      salaryGrowthRate: 1,
      incomeScheduleIds: [scheduleIds[0]],
    };
    const widgetId = window.location.pathname.split('/').at(-1);
    if (!widgetId) throw new Error('Forecast widget missing');
    await window.$send('dashboard-update-widget', {
      id: widgetId,
      meta: {
        accounts: [accountId],
        source: 'schedules',
        granularity: 'Monthly',
        assumptions,
        timeFrame: { start: '2017-01', end: '2018-12', mode: 'static' },
      },
    });
    return window.$send('forecast/generate', {
      accountIds: [accountId],
      startDate: '2017-01-01',
      endDate: '2018-12-31',
      assumptions,
    });
  });
  expect(forecast.dataPoints.some(point => point.balance < 0)).toBe(true);
  expect(forecast.scenario?.dataPoints.every(point => point.balance > 0)).toBe(
    true,
  );
  await page.reload();
  const reportChart = page.locator('.recharts-wrapper');
  await expect(
    page.locator('#balance-forecast-line-gradient stop'),
  ).toHaveAttribute('stop-color', 'var(--color-reportsChartFill)');
  await expect(
    reportChart.locator('line[stroke="var(--color-pageTextSubdued)"]'),
  ).toHaveCount(1);
  await expect(reportChart.locator('.recharts-line-curve')).toHaveCount(2);

  await navigation.goToReportsPage();
  const card = reports.pageContent.locator('.react-grid-item').last();
  await card.scrollIntoViewIfNeeded();
  await expect(
    card.locator('[id^="balance-forecast-card-line-gradient-"] stop'),
  ).toHaveAttribute('stop-color', 'var(--color-reportsChartFill)');
  await expect(
    card.locator('line[stroke="var(--color-pageTextSubdued)"]'),
  ).toHaveCount(1);
  await expect(card.locator('.recharts-line-curve')).toHaveCount(2);
  await expect(card).toMatchThemeScreenshots();
});
