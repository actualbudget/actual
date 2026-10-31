import { readFile } from 'fs/promises';
import { join } from 'path';

import type { BrowserContext, Locator, Page, Route } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import type { SettingsPage } from './page-models/settings-page';

// Browser execution is user-deferred. These tests are runnable definitions.
//
// Local history, import, and export cases below do not need a sync server.
// The three cases in "supplied sync server" drive the real core backfill job,
// SQLite writes, progress, cancel, and fetched removal. Playwright's config
// starts only the frontend. A sync server must already be listening.
// FX22_E2E_SERVER_URL and FX22_E2E_SERVER_PASSWORD are the only inputs. This
// file does not start that server, bootstrap it at import time, or read a
// credential file. When either variable is unset, only those three tests skip.
//
// Login uses window.$send (src/index.tsx). This file types only those five
// calls, not the server handler map. set-server-url stores the URL.
// subscribe-bootstrap runs only when subscribe-needs-bootstrap reports that
// the server is not bootstrapped; that call does not store a token.
// subscribe-sign-in with loginMethod password stores the token.
// subscribe-get-user checks it. /account/* is not intercepted.
//
// browserContext.route fulfills only POST /exchange-rates/providers and
// POST /exchange-rates/lookup. The JSON matches the envelopes fxRequest
// accepts and the business-day rates from the unit fixture. The shipped
// binding stays createExchangeRateHandlers(null). This is a browser-transport
// integration definition, not proof of that shipped host. Request visibility
// was not checked in a browser.

const dataDir = join(__dirname, 'data');

async function setInput(locator: Locator, value: string) {
  await locator.evaluate((el, next) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(input, next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function chooseMenu(page: Page, id: string, label: string) {
  await page.locator(id).click();
  await page
    .getByRole('menu')
    .getByRole('button', { name: label, exact: true })
    .click();
}

async function openRateSettings(page: Page): Promise<SettingsPage> {
  const navigation = new Navigation(page);
  const settings = await navigation.goToSettingsPage();
  await page.locator('#default-currency-select').click();
  await page.getByRole('button', { name: 'USD - US Dollar ($)' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Back up your budget')).toBeVisible();
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await settings.enableExperimentalFeature('Currency support');
  await settings.enableExperimentalFeature('Multiple currencies');
  await settings.goToSection('General');
  await expect(page.getByTestId('exchange-rates')).toBeVisible();
  await expect(page.getByText('No exchange rates saved yet.')).toBeVisible();
  return settings;
}

async function saveStanding(
  page: Page,
  currency: string,
  date: string,
  rate: string,
) {
  await chooseMenu(page, '#exchange-rate-quote', currency);
  await chooseMenu(page, '#exchange-rate-kind', 'Standing rate');
  await setInput(page.locator('#exchange-rate-date'), date);
  await setInput(page.locator('#exchange-rate-value'), rate);
  await page.getByRole('button', { name: 'Save rate' }).click();
}

function rateRow(currency: string, name: string, rate: string, date: string) {
  return `${currency} (${name}): ${rate} standing ${date}`;
}

async function removeListedRate(page: Page, text: string) {
  const row = page.getByText(text, { exact: true });
  await row.locator('..').getByRole('button', { name: 'Remove' }).click();
  await expect(row).not.toBeVisible();
}

async function fillBackfill(
  page: Page,
  from = '2016-12-26',
  to = '2017-01-01',
) {
  await chooseMenu(page, '#exchange-rate-backfill-quote', 'EUR - Euro (€)');
  await setInput(page.locator('#exchange-rate-backfill-from'), from);
  await setInput(page.locator('#exchange-rate-backfill-to'), to);
}

async function chooseCsv(page: Page, file: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose file' }).click();
  await (await chooser).setFiles(file);
}

test.describe('Exchange rate history', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
    await openRateSettings(page);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('exports live manual rows and re-imports that file as unchanged', async () => {
    await saveStanding(page, 'EUR - Euro (€)', '2026-02-28', '0.92');
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.92', '2026-02-28')),
    ).toBeVisible();
    await saveStanding(page, 'EUR - Euro (€)', '2026-02-20', '0.80');
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.8', '2026-02-20')),
    ).toBeVisible();
    await removeListedRate(page, rateRow('EUR', 'Euro', '0.8', '2026-02-20'));

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export rates' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^exchange-rates-USD-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    await expect(
      page.getByText('Rates exported: 1. Invalid rates left out: 0.'),
    ).toBeVisible();
    // Import accepts only .csv paths, and download.path() has no extension.
    const exported = test.info().outputPath(download.suggestedFilename());
    await download.saveAs(exported);
    const csv = await readFile(exported, 'utf8');
    expect(csv).toBe(
      'base_currency,quote_currency,rate,kind,date,source,timestamp\n' +
        'USD,EUR,0.92,standing,2026-02-28,manual,2026-02-28T00:00:00.000Z\n',
    );

    await chooseCsv(page, exported);
    await expect(page.getByText('Unchanged: 1')).toBeVisible();
    await expect(page.getByText('Fetched rates skipped: 0')).toBeVisible();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(
      page.getByText('Rates written: 0. Replaced: 0. Kept unchanged: 0.'),
    ).toBeVisible();
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.92', '2026-02-28')),
    ).toBeVisible();
  });

  test('classifies the approved X1 file as unchanged and skipped fetched', async () => {
    await saveStanding(page, 'EUR - Euro (€)', '2026-02-28', '0.92');
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.92', '2026-02-28')),
    ).toBeVisible();
    await chooseCsv(page, join(dataDir, 'exchange-rates-x1.csv'));
    await expect(page.getByText('Unchanged: 1')).toBeVisible();
    await expect(page.getByText('Fetched rates skipped: 1')).toBeVisible();
    await expect(page.getByText('New: 0')).toBeVisible();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(
      page.getByText('Rates written: 0. Replaced: 0. Kept unchanged: 0.'),
    ).toBeVisible();
    await expect(page.getByText(/plugin:fxtest/)).toHaveCount(0);
  });

  test('imports M1 with Keep, then replaces the saved conflict from the same file', async () => {
    await saveStanding(page, 'EUR - Euro (€)', '2026-02-28', '0.90');
    await saveStanding(page, 'EUR - Euro (€)', '2026-02-27', '0.88');
    await saveStanding(page, 'EUR - Euro (€)', '2026-02-26', '0.85');
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.9', '2026-02-28')),
    ).toBeVisible();
    await removeListedRate(page, rateRow('EUR', 'Euro', '0.88', '2026-02-27'));

    const file = join(dataDir, 'exchange-rates-m1.csv');
    await chooseCsv(page, file);
    await expect(page.getByText('New: 2')).toBeVisible();
    await expect(page.getByText('Unchanged: 1')).toBeVisible();
    await expect(
      page.getByText('Different from a saved rate: 1'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(
      page.getByText('Rates written: 2. Replaced: 0. Kept unchanged: 1.'),
    ).toBeVisible();
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.9', '2026-02-28')),
    ).toBeVisible();
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.88', '2026-02-27')),
    ).toBeVisible();
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.84', '2026-02-25')),
    ).toBeVisible();

    await chooseCsv(page, file);
    await expect(
      page.getByText('Different from a saved rate: 1'),
    ).toBeVisible();
    await chooseMenu(page, '#exchange-rate-import-policy', 'Replace existing');
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(
      page.getByText(
        'Saved rates to replace: 1. Replace them with the rates in this file? You can undo the import.',
      ),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Replace and import' }).click();
    await expect(
      page.getByText('Rates written: 1. Replaced: 1. Kept unchanged: 0.'),
    ).toBeVisible();
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.92', '2026-02-28')),
    ).toBeVisible();
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.9', '2026-02-28')),
    ).toHaveCount(0);
  });

  test('leaves both in-file conflicts unwritten', async () => {
    await chooseCsv(page, join(dataDir, 'exchange-rates-p13.csv'));
    await expect(
      page.getByText('Conflicting within the file: 2'),
    ).toBeVisible();
    await expect(
      page.getByText(/Line 2: conflicts with another row in the file/),
    ).toBeVisible();
    await expect(
      page.getByText(/Line 3: conflicts with another row in the file/),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(
      page.getByText('Rates written: 0. Replaced: 0. Kept unchanged: 0.'),
    ).toBeVisible();
    await expect(page.getByText('No exchange rates saved yet.')).toBeVisible();
  });

  test('pages 250 saved EUR rows as 100, 100, then 50', async () => {
    await chooseCsv(page, join(dataDir, 'exchange-rates-paging.csv'));
    await expect(page.getByText('New: 250')).toBeVisible();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(
      page.getByText('Rates written: 250. Replaced: 0. Kept unchanged: 0.'),
    ).toBeVisible();

    const newest = rateRow('EUR', 'Euro', '1.5', '2024-09-06');
    const oldest = rateRow('EUR', 'Euro', '1.5', '2024-01-01');
    const loadMore = page.getByRole('button', { name: 'Load more' });
    await expect(page.getByText(newest)).toBeVisible();
    await expect(page.getByText(oldest)).toHaveCount(0);
    await expect(loadMore).toBeVisible();
    await loadMore.click();
    await expect(page.getByText(oldest)).toHaveCount(0);
    await expect(loadMore).toBeVisible();
    await loadMore.click();
    await expect(page.getByText(oldest)).toBeVisible();
    await expect(page.getByText(newest)).toBeVisible();
    await expect(loadMore).toHaveCount(0);
  });

  test('updates the current month FX changes line after a rate import without reloading', async () => {
    // Playwright's user agent fixes the app clock at 2017-01-01. The standing
    // rate has to apply on that acquisition day, and the imported rate has to
    // apply by the close of the selected month.
    await saveStanding(page, 'JPY - Japanese Yen (¥)', '2016-12-31', '150');
    await expect(
      page.getByText(rateRow('JPY', 'Japanese Yen', '150', '2016-12-31')),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Add account' }).click();
    await expect(
      page.getByRole('heading', { name: 'Add account' }),
    ).toBeVisible();
    await setInput(page.getByLabel('Name'), 'Yen');
    await chooseMenu(
      page,
      '#account-currency-select',
      'JPY - Japanese Yen (¥)',
    );
    await setInput(page.getByLabel('Balance'), '15000');
    await expect(page.getByText('at 1 USD = 150 JPY')).toBeVisible();
    const create = page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create', exact: true });
    await create.evaluate((el: HTMLElement) => el.click());
    await expect(page.getByTestId('account-name')).toHaveText('Yen');

    const navigation = new Navigation(page);
    const budget = await navigation.goToBudgetPage();
    expect(await budget.getSelectedMonth()).toBe('2017-01');
    const summary = page.locator(
      '[data-testid="budget-summary"][data-month="2017-01"]',
    );
    await expect(summary.getByText('FX changes (included)')).toBeVisible();
    await summary.getByRole('button', { name: 'FX details' }).click();
    const details = page.getByRole('dialog');
    await expect(
      details.getByText('Included in To Budget', { exact: true }),
    ).toBeVisible();
    // Amounts are wrapped in bidi isolation marks, so match around them.
    await expect(details).toContainText(/Included in To Budget\W*\$\W*0\.00/);
    await details.getByRole('button', { name: 'Close' }).first().click();
    await expect(details).not.toBeVisible();

    await page.evaluate(() => {
      document.documentElement.dataset.fx22Stay = '1';
    });
    const settings = await navigation.goToSettingsPage();
    await settings.goToSection('General');
    await chooseCsv(page, join(dataDir, 'exchange-rates-v2.csv'));
    await expect(page.getByText('New: 1')).toBeVisible();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(
      page.getByText('Rates written: 1. Replaced: 0. Kept unchanged: 0.'),
    ).toBeVisible();

    await navigation.goToBudgetPage();
    expect(
      await page.evaluate(() => document.documentElement.dataset.fx22Stay),
    ).toBe('1');
    const after = page.locator(
      '[data-testid="budget-summary"][data-month="2017-01"]',
    );
    expect(await budget.getSelectedMonth()).toBe('2017-01');
    await expect(after.getByText('FX changes (included)')).toBeVisible();
    await after.getByRole('button', { name: 'FX details' }).click();
    await expect(page.getByRole('dialog')).toContainText(
      /Included in To Budget\W*\$\W*20\.00/,
    );
  });
});

// Same derivation as the unit fixture's business-days mode. Weekend dates
// resolve to the previous Friday, and a trailing zero in the rate is removed.
function businessDayRate(date: string) {
  const day = new Date(`${date}T00:00:00.000Z`);
  const weekday = day.getUTCDay();
  day.setUTCDate(
    day.getUTCDate() - (weekday === 0 ? 2 : weekday === 6 ? 1 : 0),
  );
  const effectiveDate = day.toISOString().slice(0, 10);
  const rate = `0.${900 + Number(effectiveDate.slice(8))}`.replace(/0+$/, '');
  return { rate, effectiveDate };
}

function fetchedRow(date: string) {
  const { rate, effectiveDate } = businessDayRate(date);
  return `EUR (Euro): ${rate} fetched ${effectiveDate} (plugin:fxtest)`;
}

// POST /exchange-rates/lookup body fields this route reads. The sync server
// also requires providerId; these three are the query the fixture answers.
type LookupWireQuery = {
  base: string;
  quote: string;
  date: string;
};

// JSON envelopes fxRequest accepts: status ok and an object data payload.
type ProviderWireReply = {
  status: 'ok';
  data: {
    providers: Array<{
      id: string;
      name: string;
      version: string;
      origins: string[];
      fields: [];
    }>;
  };
};

type LookupWireReply = {
  status: 'ok';
  data: {
    outcome: 'ok';
    plugin: { id: string; version: string };
    base: string;
    quote: string;
    rate: string;
    effectiveDate: string;
  };
};

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function isJsonObject(
  value: JsonValue | null,
): value is { [key: string]: JsonValue } {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const providerReply: ProviderWireReply = {
  status: 'ok',
  data: {
    providers: [
      {
        id: 'fxtest',
        name: 'Test rates',
        version: '1.0.0',
        origins: ['https://rates.invalid'],
        fields: [],
      },
    ],
  },
};

function lookupReply(query: LookupWireQuery): LookupWireReply {
  const { rate, effectiveDate } = businessDayRate(query.date);
  return {
    status: 'ok',
    data: {
      outcome: 'ok',
      plugin: { id: 'fxtest', version: '1.0.0' },
      base: query.base,
      quote: query.quote,
      rate,
      effectiveDate,
    },
  };
}

function readLookup(route: Route): LookupWireQuery | null {
  const parsed: JsonValue | null = route.request().postDataJSON();
  if (!isJsonObject(parsed)) return null;
  const { base, quote, date } = parsed;
  if (
    typeof base !== 'string' ||
    typeof quote !== 'string' ||
    typeof date !== 'string'
  ) {
    return null;
  }
  return { base, quote, date };
}

async function fulfillJson(
  route: Route,
  body: ProviderWireReply | LookupWireReply,
) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installProviderRoute(context: BrowserContext) {
  const handler = async (route: Route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await fulfillJson(route, providerReply);
  };
  await context.route('**/exchange-rates/providers', handler);
  return () => context.unroute('**/exchange-rates/providers', handler);
}

async function installLookupRoute(context: BrowserContext, hold: boolean) {
  const dates: string[] = [];
  const waiting = new Map<string, Array<() => void>>();
  let holding = hold;
  const handler = async (route: Route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const query = readLookup(route);
    if (!query) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', reason: 'invalid-request' }),
      });
      return;
    }
    dates.push(query.date);
    if (holding) {
      await new Promise<void>(resolve => {
        if (!holding) {
          resolve();
          return;
        }
        const queue = waiting.get(query.date) ?? [];
        queue.push(resolve);
        waiting.set(query.date, queue);
      });
    }
    await fulfillJson(route, lookupReply(query));
  };
  await context.route('**/exchange-rates/lookup', handler);
  return {
    dates,
    release(date: string) {
      const queue = waiting.get(date) ?? [];
      waiting.delete(date);
      for (const resolve of queue) resolve();
    },
    releaseAll() {
      holding = false;
      for (const date of [...waiting.keys()]) {
        const queue = waiting.get(date) ?? [];
        waiting.delete(date);
        for (const resolve of queue) resolve();
      }
    },
    unroute: () => context.unroute('**/exchange-rates/lookup', handler),
  };
}

type NeedsBootstrapReply = {
  error?: string;
  bootstrapped?: boolean;
};
type ErrorReply = {
  error?: string;
};
type SignedInUser = {
  offline?: boolean;
  tokenExpired?: boolean;
};
type ServerSend = {
  (
    name: 'subscribe-needs-bootstrap',
    args: { url: string },
  ): Promise<NeedsBootstrapReply>;
  (
    name: 'set-server-url',
    args: { url: string; validate: boolean },
  ): Promise<ErrorReply>;
  (
    name: 'subscribe-bootstrap',
    args: { password: string },
  ): Promise<ErrorReply>;
  (
    name: 'subscribe-sign-in',
    args: { password: string; loginMethod: 'password' },
  ): Promise<ErrorReply>;
  (name: 'subscribe-get-user'): Promise<SignedInUser | null>;
};

async function connectSuppliedServer(page: Page) {
  const url = process.env.FX22_E2E_SERVER_URL ?? '';
  const password = process.env.FX22_E2E_SERVER_PASSWORD ?? '';
  const failure = await page.evaluate(
    async ({ url, password }) => {
      // src/index.tsx assigns window.$send. The DOM Window type does not
      // include it. An optional field still overlaps Window; the page checks
      // that the function is present before the five auth calls.
      const host: Window & { $send?: ServerSend } = window;
      const send = host.$send;
      if (typeof send !== 'function') return 'send:missing';
      const needs = await send('subscribe-needs-bootstrap', { url });
      if (needs?.error) return `needs-bootstrap:${needs.error}`;
      const set = await send('set-server-url', { url, validate: true });
      if (set?.error) return `set-server-url:${set.error}`;
      if (needs?.bootstrapped === false) {
        const boot = await send('subscribe-bootstrap', { password });
        if (boot?.error) return `bootstrap:${boot.error}`;
      }
      const signed = await send('subscribe-sign-in', {
        password,
        loginMethod: 'password',
      });
      if (signed?.error) return `sign-in:${signed.error}`;
      const user = await send('subscribe-get-user');
      if (!user || user.offline === true || user.tokenExpired === true) {
        return 'get-user:unvalidated';
      }
      return '';
    },
    { url, password },
  );
  expect(failure).toBe('');
}

async function checkAndStart(page: Page, summary: string) {
  await page.getByRole('button', { name: 'Check dates' }).click();
  await expect(page.getByText(summary)).toBeVisible();
  await page.getByRole('button', { name: 'Start backfill' }).click();
}

test.describe('Exchange rate history on a supplied sync server', () => {
  let page: Page;
  let unrouteProviders: (() => Promise<void>) | undefined;
  let lookups: Awaited<ReturnType<typeof installLookupRoute>> | undefined;

  test.beforeEach(async ({ browser }) => {
    test.skip(
      !process.env.FX22_E2E_SERVER_URL || !process.env.FX22_E2E_SERVER_PASSWORD,
      'Set FX22_E2E_SERVER_URL and FX22_E2E_SERVER_PASSWORD. Playwright starts only the frontend; this file does not start a sync server.',
    );
    page = await browser.newPage();
    unrouteProviders = await installProviderRoute(page.context());
    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
    await openRateSettings(page);
    await connectSuppliedServer(page);
  });

  test.afterEach(async () => {
    lookups?.releaseAll();
    await lookups?.unroute();
    await unrouteProviders?.();
    await page?.close();
  });

  test('shows backfill progress and the five business-day rows', async () => {
    lookups = await installLookupRoute(page.context(), true);
    await fillBackfill(page);
    await checkAndStart(page, 'Dates: 7. Already saved: 0. To fetch: 7.');
    const progress = page.getByTestId('exchange-rate-backfill-progress');
    await expect(progress).toContainText(
      'Backfill running. Processed 0 of 7 dates',
    );
    lookups.releaseAll();
    await expect(progress).toContainText(
      'Backfill finished. Processed 7 of 7 dates: 5 added, 0 replaced, 2 already saved, 0 cached, 0 missing, 0 failed.',
    );
    for (const date of [
      '2016-12-26',
      '2016-12-27',
      '2016-12-28',
      '2016-12-29',
      '2016-12-30',
    ]) {
      await expect(page.getByText(fetchedRow(date))).toBeVisible();
    }
    await expect(page.getByText('2016-12-31')).toHaveCount(0);
    await expect(page.getByText('2017-01-01')).toHaveCount(0);
  });

  test('cancels while later lookups are held and does not write them', async () => {
    const held = await installLookupRoute(page.context(), true);
    lookups = held;
    await fillBackfill(page);
    await checkAndStart(page, 'Dates: 7. Already saved: 0. To fetch: 7.');
    await expect
      .poll(() => held.dates.slice())
      .toEqual(['2016-12-26', '2016-12-27', '2016-12-28', '2016-12-29']);
    held.release('2016-12-26');
    await expect.poll(() => held.dates.length).toBe(5);
    expect(held.dates[4]).toBe('2016-12-30');
    await expect(page.getByText(fetchedRow('2016-12-26'))).toBeVisible();
    await page.getByRole('button', { name: 'Cancel backfill' }).click();
    await expect(
      page.getByTestId('exchange-rate-backfill-progress'),
    ).toContainText('Backfill cancelled.');
    for (const date of [
      '2016-12-27',
      '2016-12-28',
      '2016-12-29',
      '2016-12-30',
    ]) {
      held.release(date);
    }
    await expect(page.getByText(fetchedRow('2016-12-27'))).toHaveCount(0);
    expect(held.dates).toHaveLength(5);
    await expect(page.getByText(fetchedRow('2016-12-26'))).toBeVisible();
  });

  test('removes a fetched row and a later Keep backfill does not restore it', async () => {
    lookups = await installLookupRoute(page.context(), false);
    await fillBackfill(page, '2016-12-26', '2016-12-26');
    await checkAndStart(page, 'Dates: 1. Already saved: 0. To fetch: 1.');
    const progress = page.getByTestId('exchange-rate-backfill-progress');
    await expect(progress).toContainText(
      'Backfill finished. Processed 1 of 1 dates: 1 added, 0 replaced, 0 already saved, 0 cached, 0 missing, 0 failed.',
    );
    const row = page.getByText(fetchedRow('2016-12-26'));
    await expect(row).toBeVisible();
    await expect(
      page.getByText(
        'A removed fetched rate stays removed. Only a backfill with Replace existing brings it back; Keep existing does not.',
      ),
    ).toBeVisible();
    await row.locator('..').getByRole('button', { name: 'Remove' }).click();
    await expect(row).toHaveCount(0);
    await expect(page.getByText('No exchange rates saved yet.')).toBeVisible();

    await checkAndStart(page, 'Dates: 1. Already saved: 0. To fetch: 1.');
    await expect(progress).toContainText(
      'Backfill finished. Processed 1 of 1 dates: 0 added, 0 replaced, 1 already saved, 0 cached, 0 missing, 0 failed.',
    );
    await expect(page.getByText(fetchedRow('2016-12-26'))).toHaveCount(0);
    await expect(page.getByText('No exchange rates saved yet.')).toBeVisible();
  });
});
