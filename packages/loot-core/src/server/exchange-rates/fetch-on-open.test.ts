import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as prefs from '#server/prefs';

import { isAutoUpdateEnabled, startMissingRateUpdates } from './fetch-on-open';
import {
  onMissingRatesFinished,
  startMissingRates,
  stopAutomaticMissingRates,
} from './missing-rates';

vi.mock('./missing-rates', () => ({
  onMissingRatesFinished: vi.fn(() => () => undefined),
  startMissingRates: vi.fn(async () => ({ runId: 'r' })),
  stopAutomaticMissingRates: vi.fn(() => 0),
}));

const start = vi.mocked(startMissingRates);

async function setBudget({ flags = true } = {}) {
  await db.update('preferences', { id: 'defaultCurrencyCode', value: 'USD' });
  await prefs.savePrefs({
    amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
  });
  for (const flag of ['currency', 'multicurrency']) {
    await db.update('preferences', {
      id: `flags.${flag}`,
      value: String(flags),
    });
  }
}
function finished(): Parameters<typeof onMissingRatesFinished>[0] {
  const listener = vi.mocked(onMissingRatesFinished).mock.calls.at(-1)?.[0];
  if (!listener) throw new Error('lifecycle did not subscribe');
  return listener;
}
async function tick(ms = 2000) {
  await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(async () => {
  vi.useFakeTimers({
    toFake: [
      'Date',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
    ],
  });
  vi.setSystemTime(new Date('2026-03-10T12:00:00'));
  vi.stubGlobal('currentDay', '2026-03-10');
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await setBudget();
  start.mockClear();
  vi.mocked(stopAutomaticMissingRates).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('is on when the preference is absent and off only for an explicit false', async () => {
  expect(await isAutoUpdateEnabled()).toBe(true);
  await db.update('preferences', {
    id: 'exchange-rates-auto-update',
    value: 'false',
  });
  expect(await isAutoUpdateEnabled()).toBe(false);
});

it('starts an automatic run when the budget opens', async () => {
  onTestFinished(startMissingRateUpdates());
  await tick();
  expect(start).toHaveBeenCalledWith({ reason: 'automatic' });
});

it('makes no request when multicurrency is unavailable or automation is off', async () => {
  await setBudget({ flags: false });
  onTestFinished(startMissingRateUpdates());
  await tick();
  await db.update('preferences', { id: 'flags.multicurrency', value: 'true' });
  await db.update('preferences', { id: 'flags.currency', value: 'true' });
  await db.update('preferences', {
    id: 'exchange-rates-auto-update',
    value: 'false',
  });
  await tick();
  expect(start).not.toHaveBeenCalled();
});

it('holds automatic runs after Stop until the local day changes', async () => {
  onTestFinished(startMissingRateUpdates());
  await tick();
  finished()('user', { dirty: false, missing: 0 });
  start.mockClear();
  await db.update('preferences', { id: 'notes', value: 'x' });
  await tick(60 * 1000);
  expect(start).not.toHaveBeenCalled();
  vi.stubGlobal('currentDay', '2026-03-11');
  await tick(60 * 1000 + 2000);
  expect(start).toHaveBeenCalledWith({ reason: 'automatic' });
});

it('waits an hour after a failing run before trying again', async () => {
  onTestFinished(startMissingRateUpdates());
  await tick();
  finished()('failing', { dirty: false, missing: 0 });
  start.mockClear();
  await tick(59 * 60 * 1000);
  expect(start).not.toHaveBeenCalled();
  await tick(60 * 1000 + 2000);
  expect(start).toHaveBeenCalledWith({ reason: 'automatic' });
});

it('plans again at once after a run that a trigger joined', async () => {
  onTestFinished(startMissingRateUpdates());
  await tick();
  start.mockClear();
  finished()('done', { dirty: true, missing: 0 });
  await tick();
  expect(start).toHaveBeenCalledWith({ reason: 'automatic' });
});

it('asks again an hour after a run left recent days missing', async () => {
  onTestFinished(startMissingRateUpdates());
  await tick();
  start.mockClear();
  finished()('done', { dirty: false, missing: 1 });
  await tick(59 * 60 * 1000);
  expect(start).not.toHaveBeenCalled();
  await tick(60 * 1000 + 2000);
  expect(start).toHaveBeenCalledWith({ reason: 'automatic' });
});

it('replaces an automatic run when the local day changes and rechecks its misses', async () => {
  onTestFinished(startMissingRateUpdates());
  await tick();
  vi.mocked(stopAutomaticMissingRates).mockReturnValueOnce(2);
  vi.stubGlobal('currentDay', '2026-03-11');
  await tick(60 * 1000);
  expect(stopAutomaticMissingRates).toHaveBeenCalled();
  await tick(2000);
  start.mockClear();
  await tick(60 * 60 * 1000);
  expect(start).toHaveBeenCalledWith({ reason: 'automatic' });
});
