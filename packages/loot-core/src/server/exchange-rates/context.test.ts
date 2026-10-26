import { Timestamp } from '@actual-app/crdt';

import * as storage from '#platform/server/asyncStorage';
import * as memoryStorage from '#platform/server/asyncStorage/__mocks__/index';
import * as connection from '#platform/server/connection';
import { app as auth } from '#server/auth/app';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runHandler } from '#server/mutators';
import * as prefs from '#server/prefs';
import { setServer } from '#server/server-config';
import { applyMessages } from '#server/sync';

import {
  captureFxContext,
  createFxController,
  isFxContextCurrent,
  notifyFxContextChanged,
  onFxContextChanged,
  startFxContext,
} from './context';

async function current() {
  const value = await captureFxContext();
  if (!value) throw new Error('test budget context unavailable');
  return value;
}

beforeEach(async () => {
  vi.mocked(storage.getItem).mockImplementation(memoryStorage.getItem);
  vi.mocked(storage.setItem).mockImplementation(memoryStorage.setItem);
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await prefs.savePrefs({
    amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
  });
  await db.update('preferences', { id: 'defaultCurrencyCode', value: 'USD' });
  setServer('https://sync.example.com');
  await storage.setItem('user-token', 'SECRET123');
  const stop = startFxContext();
  onTestFinished(stop);
  await current();
  vi.mocked(connection.send).mockClear();
});

it('captures stable public identity without exposing session credentials', async () => {
  const first = await current();
  expect((await current()).context).toBe(first.context);
  expect(first.baseCurrency).toBe('USD');
  expect(first.context).toContain('USD');
  expect(first.context).not.toContain('SECRET123');
  expect(await isFxContextCurrent(first)).toBe(true);
});

it('blocks captures and cancels work while encoding publication is pending', async () => {
  const before = await current();
  const controller = createFxController(before);
  await prefs.savePrefs({
    amountEncodingTransition: {
      id: 'transition',
      sourceGroupId: 'group',
      sourceEncoding: null,
      targetEncoding: null,
      targetCurrencyCode: 'USD',
    },
  });
  expect(await captureFxContext()).toBeNull();
  expect(controller.signal.aborted).toBe(true);
  await prefs.savePrefs({ amountEncodingTransition: undefined });
  expect(await isFxContextCurrent(before)).toBe(false);
});

it('invalidates synced base-currency changes before applying messages returns', async () => {
  const controller = createFxController(await current());
  const timestamp = Timestamp.send();
  if (!timestamp) throw new Error('test timestamp unavailable');
  await applyMessages([
    {
      dataset: 'preferences',
      row: 'defaultCurrencyCode',
      column: 'value',
      value: 'EUR',
      timestamp,
    },
  ]);
  expect(controller.signal.aborted).toBe(true);
  expect((await current()).baseCurrency).toBe('EUR');
});

it('invalidates a budget identity round trip and emits only public context', async () => {
  const before = await current();
  const invalidated = vi.fn();
  const stop = onFxContextChanged(invalidated);
  onTestFinished(stop);
  await notifyFxContextChanged();
  expect(await isFxContextCurrent(before)).toBe(false);
  expect(invalidated).toHaveBeenCalledTimes(1);
  expect(connection.send).toHaveBeenCalledWith('fx-provider-context', {
    context: (await current()).context,
  });
  expect(JSON.stringify(vi.mocked(connection.send).mock.calls)).not.toContain(
    'SECRET123',
  );
});

it('aborts work before close-budget waits for running handlers', async () => {
  const controller = createFxController(await current());
  const pending = runHandler(async () => {
    await new Promise<void>(resolve =>
      controller.signal.addEventListener('abort', () => resolve(), {
        once: true,
      }),
    );
  });
  await runHandler(async () => 'ok', undefined, { name: 'close-budget' });
  await pending;
  expect(controller.signal.aborted).toBe(true);
  expect(await captureFxContext()).toBeNull();
});

it('keeps direct-fetch work when the server or sign-in changes', async () => {
  vi.mocked(storage.multiRemove).mockImplementation(memoryStorage.multiRemove);
  const captured = await current();
  const controller = createFxController(captured);
  setServer('https://other.example.com');
  await auth.handlers['subscribe-sign-out']();
  expect(controller.signal.aborted).toBe(false);
  expect(await isFxContextCurrent(captured)).toBe(true);
  expect(captured.providerId).toBe('exchange-api');
});

it('publishes the new context before prefs-updated after an encoding commit', async () => {
  const { app: encoding } = await import('#server/amount-encoding/app');
  const captured = await current();
  const controller = createFxController(captured);
  const input = { enabled: true, currencyCode: 'JPY' };
  const preflight = await encoding.handlers['amount-encoding/preflight'](input);
  expect(
    await encoding.handlers['amount-encoding/transition']({
      ...input,
      sourceToken: preflight.sourceToken,
    }),
  ).toEqual({});
  const sent = vi.mocked(connection.send).mock.calls;
  const contextIndex = sent.findIndex(
    ([name]) => name === 'fx-provider-context',
  );
  const prefsIndex = sent.findIndex(([name]) => name === 'prefs-updated');
  expect(contextIndex).toBeGreaterThanOrEqual(0);
  expect(prefsIndex).toBeGreaterThan(contextIndex);
  expect(controller.signal.aborted).toBe(true);
  expect(await isFxContextCurrent(captured)).toBe(false);
});
