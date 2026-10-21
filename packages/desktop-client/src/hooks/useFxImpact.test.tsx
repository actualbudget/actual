import type { ReactNode } from 'react';

import { readFileSync } from 'node:fs';

import {
  initServer,
  listen,
  serverPush,
} from '@actual-app/core/platform/client/connection';
import * as sqlite from '@actual-app/core/platform/server/sqlite';
import { createAllBudgets } from '@actual-app/core/server/budget/base';
import { stopFxDayWatch } from '@actual-app/core/server/budget/fx-valuation';
import * as db from '@actual-app/core/server/db/index';
import { loadMappings } from '@actual-app/core/server/db/mappings';
import { app as exchangeRatesApp } from '@actual-app/core/server/exchange-rates/app';
import {
  disableGlobalMutations,
  enableGlobalMutations,
} from '@actual-app/core/server/mutators';
import * as prefs from '@actual-app/core/server/prefs';
import { app as reportsApp } from '@actual-app/core/server/reports/app';
import { setServer } from '@actual-app/core/server/server-config';
import * as sheet from '@actual-app/core/server/sheet';
import { setSyncingMode } from '@actual-app/core/server/sync/index';
import { app as transactionsApp } from '@actual-app/core/server/transactions/app';
import { loadRules } from '@actual-app/core/server/transactions/transaction-rules';
import { updateVersion } from '@actual-app/core/server/update';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  FxImpactRequest,
  FxImpactResult,
} from '@actual-app/core/types/models';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { fxImpactFixture } from '#mocks/fxImpact';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { useFxImpact } from './useFxImpact';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
// The real worker below runs on the browser platform's sql.js. Migrations
// read their files from the checkout, and worker events reach the hook's
// listeners through the client mock.
vi.mock('@actual-app/core/platform/server/fs', async () => {
  const nodeFs = await import('node:fs');
  const nodePath = await import('node:path');
  return {
    migrationsPath: nodePath.join(__dirname, '../../../loot-core/migrations'),
    listDir: async (dir: string) => nodeFs.readdirSync(dir),
    readFile: async (path: string) => nodeFs.readFileSync(path, 'utf8'),
    join: nodePath.join,
  };
});
vi.mock('@actual-app/core/platform/server/asyncStorage');
vi.mock('@actual-app/core/platform/server/connection', async () => {
  const client = await import('#mocks/connection');
  return {
    init: () => undefined,
    resetEvents: () => undefined,
    getNumClients: () => 1,
    send: (name: string, args: Parameters<typeof client.serverPush>[1]) =>
      client.serverPush(name, args),
  };
});

const request: FxImpactRequest = {
  startMonth: '2016-12',
  endMonth: '2016-12',
  accountIds: null,
  currencies: null,
};
const labelled = (label: string): FxImpactResult => ({
  ...fxImpactFixture,
  unknownAccountIds: [label],
});

type Call = {
  request: FxImpactRequest;
  resolve: (result: FxImpactResult) => void;
  reject: (error: Error) => void;
};
/** A worker read whose responses the test releases one by one. */
function controlledRead() {
  const calls: Call[] = [];
  const read = vi.fn(
    (args: FxImpactRequest) =>
      new Promise<FxImpactResult>((resolve, reject) => {
        calls.push({ request: args, resolve, reject });
      }),
  );
  return { read, calls };
}

function providers() {
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'budget-a' }));
  store.dispatch(mergeSyncedPrefs({ amountEncoding: 'encoding-a' }));
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders store={store} queryClient={queryClient}>
      {children}
    </TestProviders>
  );
  return { store, wrapper };
}

type Selection = Partial<Pick<FxImpactRequest, 'accountIds' | 'currencies'>> & {
  startMonth: string;
  endMonth: string;
};
function mount(initial: Selection | null = request) {
  const { read, calls } = controlledRead();
  initServer({ 'report/fx-impact': read });
  const { store, wrapper } = providers();
  const view = renderHook(
    ({ selection }: { selection: Selection | null }) => useFxImpact(selection),
    { wrapper, initialProps: { selection: initial } },
  );
  const shown = () => view.result.current.data?.unknownAccountIds[0];
  return { read, calls, store, view, shown };
}

const settle = () => act(() => new Promise(r => setTimeout(r, 20)));

describe('context', () => {
  it('sends a normalized request: absent selections are null, ids sorted', async () => {
    const { read, view } = mount({
      startMonth: '2016-11',
      endMonth: '2016-12',
      accountIds: ['b', 'a'],
    });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    expect(read).toHaveBeenLastCalledWith({
      startMonth: '2016-11',
      endMonth: '2016-12',
      accountIds: ['a', 'b'],
      currencies: null,
    });
    view.rerender({
      selection: {
        startMonth: '2016-11',
        endMonth: '2016-12',
        accountIds: ['a', 'b'],
        currencies: null,
      },
    });
    await settle();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('sends no request while unavailable, and reads once available', async () => {
    const { read, view } = mount(null);
    await settle();
    expect(read).not.toHaveBeenCalled();
    expect(view.result.current.data).toBeUndefined();
    view.rerender({ selection: request });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  });

  it('hides the old result at once when the budget, encoding or request changes', async () => {
    const { calls, store, view, shown } = mount();
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].resolve(labelled('a')));
    expect(shown()).toBe('a');

    view.rerender({ selection: { ...request, currencies: ['JPY'] } });
    expect(view.result.current.data).toBeUndefined();
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].request.currencies).toEqual(['JPY']);

    act(() => {
      store.dispatch(mergeLocalPrefs({ id: 'budget-b' }));
    });
    expect(view.result.current.data).toBeUndefined();
    await waitFor(() => expect(calls).toHaveLength(3));

    act(() => {
      store.dispatch(mergeSyncedPrefs({ amountEncoding: 'encoding-b' }));
    });
    expect(view.result.current.data).toBeUndefined();
    await waitFor(() => expect(calls).toHaveLength(4));
    await act(async () => calls[1].resolve(labelled('stale')));
    expect(view.result.current.data).toBeUndefined();
    await act(async () => calls[3].resolve(labelled('d')));
    expect(shown()).toBe('d');
  });

  it('discards an A response after A to B to A', async () => {
    const { calls, view, shown } = mount();
    await waitFor(() => expect(calls).toHaveLength(1));
    view.rerender({ selection: { ...request, currencies: ['JPY'] } });
    await waitFor(() => expect(calls).toHaveLength(2));
    view.rerender({ selection: request });
    await waitFor(() => expect(calls).toHaveLength(3));
    await act(async () => calls[0].resolve(labelled('first a')));
    expect(view.result.current.data).toBeUndefined();
    await act(async () => calls[1].resolve(labelled('b')));
    expect(view.result.current.data).toBeUndefined();
    await act(async () => calls[2].resolve(labelled('second a')));
    expect(shown()).toBe('second a');
  });

  it('refreshes on a local day change', async () => {
    const today = vi
      .spyOn(monthUtils, 'currentDay')
      .mockReturnValue('2017-01-01');
    onTestFinished(() => today.mockRestore());
    const intervals = vi.spyOn(globalThis, 'setInterval');
    onTestFinished(() => intervals.mockRestore());
    const { calls, view, shown } = mount();
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].resolve(labelled('day 1')));
    expect(shown()).toBe('day 1');
    today.mockReturnValue('2017-01-02');
    view.rerender({ selection: request });
    // Between midnight and the watcher's tick the old day is hidden.
    expect(view.result.current.data).toBeUndefined();
    expect(view.result.current.isLoading).toBe(true);
    const tick = intervals.mock.calls.find(([, delay]) => delay === 60_000);
    act(() => {
      if (typeof tick?.[0] === 'function') tick[0]();
    });
    await waitFor(() => expect(calls).toHaveLength(2));
  });

  it('rekeys at once when midnight passes during a held read', async () => {
    const today = vi
      .spyOn(monthUtils, 'currentDay')
      .mockReturnValue('2017-01-01');
    onTestFinished(() => today.mockRestore());
    const { calls, view, shown } = mount();
    await waitFor(() => expect(calls).toHaveLength(1));
    today.mockReturnValue('2017-01-02');
    await act(async () => calls[0].resolve(labelled('before midnight')));
    expect(view.result.current.data).toBeUndefined();
    await waitFor(() => expect(calls).toHaveLength(2));
    await act(async () => calls[1].resolve(labelled('after midnight')));
    expect(shown()).toBe('after midnight');
  });
});

describe('notifications', () => {
  async function displayed() {
    const mounted = mount();
    await waitFor(() => expect(mounted.calls).toHaveLength(1));
    await act(async () => mounted.calls[0].resolve(labelled('r0')));
    expect(mounted.shown()).toBe('r0');
    return mounted;
  }

  it('reads once per applied event naming a relevant table, and ignores others', async () => {
    const { calls } = await displayed();
    // Categories and mappings decide which category a reservation counts
    // under (MC-10).
    for (const table of [
      'transactions',
      'accounts',
      'exchange_rates',
      'preferences',
      'categories',
      'category_mapping',
    ]) {
      const before = calls.length;
      serverPush('sync-event', { type: 'applied', tables: [table] });
      await waitFor(() => expect(calls).toHaveLength(before + 1));
      await act(async () => calls[before].resolve(labelled(table)));
    }
    serverPush('sync-event', { type: 'applied', tables: ['notes'] });
    serverPush('sync-event', { type: 'success', tables: ['transactions'] });
    await settle();
    expect(calls).toHaveLength(7);
    serverPush('sync-event', {
      type: 'applied',
      tables: ['transactions', 'accounts', 'preferences'],
    });
    await waitFor(() => expect(calls).toHaveLength(8));
    await settle();
    expect(calls).toHaveLength(8);
  });

  it('reads for FX cells of any month and for sheets outside the created months only', async () => {
    const { calls } = await displayed();
    const push = (name: string) =>
      serverPush('cells-changed', [{ name, value: 1 }]);
    push('budget201612!total-income');
    push('budget201611!buffered');
    push('account-balance-yen');
    await settle();
    expect(calls).toHaveLength(1);
    for (const name of [
      'budget201601!fx-changes',
      'budget201612!fx-incomplete',
      'budget201610!total-income',
      'budget201702!buffered',
    ]) {
      const before = calls.length;
      push(name);
      await waitFor(() => expect(calls).toHaveLength(before + 1));
      await act(async () => calls[before].resolve(labelled(name)));
    }
  });

  it('(c) keeps the displayed result during a background read and follows up once after it settles', async () => {
    const { calls, view, shown } = await displayed();
    const first = view.result.current.data;
    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    await waitFor(() => expect(calls).toHaveLength(2));
    serverPush('cells-changed', [
      { name: 'budget201612!fx-changes', value: 5 },
    ]);
    await settle();
    expect(calls).toHaveLength(2);
    expect(view.result.current.data).toBe(first);
    expect(view.result.current.isFetching).toBe(true);
    await act(async () => calls[1].resolve(labelled('r1')));
    expect(shown()).toBe('r1');
    await waitFor(() => expect(calls).toHaveLength(3));
    expect(shown()).toBe('r1');
    await act(async () => calls[2].resolve(labelled('r2')));
    expect(shown()).toBe('r2');
    await settle();
    expect(calls).toHaveLength(3);
  });

  it('(d) one event naming several cells, or three events during one read, give one follow-up', async () => {
    const { calls } = await displayed();
    serverPush('cells-changed', [
      { name: 'budget201611!fx-changes', value: 1 },
      { name: 'budget201612!fx-changes', value: 2 },
      { name: 'budget201612!fx-incomplete', value: true },
    ]);
    await waitFor(() => expect(calls).toHaveLength(2));
    await settle();
    expect(calls).toHaveLength(2);
    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    serverPush('cells-changed', [
      { name: 'budget201612!fx-changes', value: 3 },
    ]);
    serverPush('sync-event', { type: 'applied', tables: ['exchange_rates'] });
    await settle();
    expect(calls).toHaveLength(2);
    await act(async () => calls[1].resolve(labelled('r1')));
    await waitFor(() => expect(calls).toHaveLength(3));
    await act(async () => calls[2].resolve(labelled('r2')));
    await settle();
    expect(calls).toHaveLength(3);
  });

  it('(d) notifications during the follow-up mark it dirty again, ending the burst with one later read', async () => {
    const { calls, shown } = await displayed();
    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    await waitFor(() => expect(calls).toHaveLength(2));
    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    await act(async () => calls[1].resolve(labelled('r1')));
    await waitFor(() => expect(calls).toHaveLength(3));
    // Two more notifications while the follow-up is in flight.
    serverPush('cells-changed', [
      { name: 'budget201612!fx-changes', value: 4 },
    ]);
    serverPush('sync-event', { type: 'applied', tables: ['accounts'] });
    await settle();
    expect(calls).toHaveLength(3);
    await act(async () => calls[2].resolve(labelled('r2')));
    expect(shown()).toBe('r2');
    await waitFor(() => expect(calls).toHaveLength(4));
    await act(async () => calls[3].resolve(labelled('r3')));
    expect(shown()).toBe('r3');
    await settle();
    expect(calls).toHaveLength(4);
  });

  it('(e) a rejected read shows the error, keeps the result and waits for a notification or retry', async () => {
    const { calls, view, shown } = await displayed();
    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    await waitFor(() => expect(calls).toHaveLength(2));
    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    await act(async () => calls[1].reject(new Error('boom')));
    expect(view.result.current.isError).toBe(true);
    expect(shown()).toBe('r0');
    await settle();
    expect(calls).toHaveLength(2);

    serverPush('sync-event', { type: 'applied', tables: ['accounts'] });
    await waitFor(() => expect(calls).toHaveLength(3));
    await act(async () => calls[2].reject(new Error('again')));
    expect(shown()).toBe('r0');
    await act(async () => view.result.current.retry());
    await waitFor(() => expect(calls).toHaveLength(4));
    await act(async () => calls[3].resolve(labelled('r3')));
    expect(view.result.current.isError).toBe(false);
    expect(shown()).toBe('r3');
  });

  it('(e) a first read that fails reports the error without data', async () => {
    const { calls, view } = mount();
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].reject(new Error('boom')));
    expect(view.result.current.isError).toBe(true);
    expect(view.result.current.isLoading).toBe(false);
    expect(view.result.current.data).toBeUndefined();
  });

  it('(f) a context change during a read discards its result and its follow-up', async () => {
    const { calls, view, shown } = await displayed();
    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    await waitFor(() => expect(calls).toHaveLength(2));
    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    await settle();
    view.rerender({ selection: { ...request, accountIds: ['yen'] } });
    await waitFor(() => expect(calls).toHaveLength(3));
    await act(async () => calls[1].resolve(labelled('old context')));
    expect(view.result.current.data).toBeUndefined();
    await act(async () => calls[2].resolve(labelled('new context')));
    expect(shown()).toBe('new context');
    await settle();
    expect(calls).toHaveLength(3);
  });

  it('stops listening after unmount', async () => {
    const { calls, view } = await displayed();
    view.unmount();
    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    serverPush('cells-changed', [
      { name: 'budget201612!fx-changes', value: 1 },
    ]);
    await settle();
    expect(calls).toHaveLength(1);
  });
});

describe('with the real worker, sheet and debounced FX refresh', () => {
  const postForeign =
    transactionsApp.handlers['transactions/post-foreign-entry'];
  const crdtCount = () =>
    db.runQuery<{ n: number }>(
      'SELECT count(*) AS n FROM messages_crdt',
      [],
      true,
    )[0].n;
  const decemberCell = () =>
    sheet.getCellValue(monthUtils.sheetForMonth('2016-12'), 'fx-changes');
  const saveRate = (rate: string, date: string) =>
    exchangeRatesApp.handlers['exchange-rates/save']({
      quoteCurrency: 'JPY',
      rate,
      kind: 'standing',
      date,
      replace: true,
    });

  /** Opens a real budget with one foreign purchase and checks its start. */
  async function setUpRealBudget() {
    // As loot-core's test setup: no sync server, direct test mutations.
    setSyncingMode('disabled');
    setServer('https://test.env');
    enableGlobalMutations();
    await sqlite.init({
      wasmBinary: readFileSync(
        `${__dirname}/../../../../node_modules/@jlongster/sql.js/dist/sql-wasm.wasm`,
      ),
    });
    const memory = await sqlite.openDatabase(':memory:');
    sqlite.execQuery(
      memory,
      readFileSync(
        `${__dirname}/../../../loot-core/src/server/sql/init.sql`,
        'utf8',
      ),
    );
    db.setDatabase(memory);
    db.runQuery('INSERT INTO db_version (version) VALUES (?)', ['0.0.1']);
    await updateVersion();
    await db.loadClock();
    await loadMappings();
    await prefs.loadPrefs();
    await db.update('preferences', { id: 'defaultCurrencyCode', value: 'USD' });
    await prefs.savePrefs({
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'USD',
        precision: 2,
      }),
    });
    for (const flag of ['currency', 'multicurrency']) {
      await db.update('preferences', { id: `flags.${flag}`, value: 'true' });
    }
    await loadRules();
    await db.insertCategoryGroup({ id: 'expenses', name: 'Expenses' });
    await db.insertCategoryGroup({
      id: 'income',
      name: 'Income',
      is_income: 1,
    });
    await db.insertAccount({ id: 'yen', name: 'Yen', currency: 'JPY' });
    await db.insertPayee({ name: '', transfer_acct: 'yen' });
    // As the app does on load: sheet changes reach the client as cells-changed.
    await sheet.loadSpreadsheet(db, ({ names }: { names: string[] }) =>
      serverPush(
        'cells-changed',
        names.map(name => ({ name, value: sheet.get()._getNode(name).value })),
      ),
    );
    sheet.get().meta().budgetType = 'envelope';
    await saveRate('100', '2016-11-01');
    expect(
      await postForeign({
        transaction: {
          id: 'buy',
          account: 'yen',
          date: '2016-12-10',
          transaction_amount: 10000,
        },
        baseAmount: 10000,
      }),
    ).toMatchObject({ status: 'ok' });
    await createAllBudgets();
    await sheet.waitOnSpreadsheet();
    expect(decemberCell()).toBe(0);
  }

  beforeEach(setUpRealBudget);

  afterEach(async () => {
    disableGlobalMutations();
    stopFxDayWatch();
    const spreadsheet = sheet.get();
    if (spreadsheet) {
      await new Promise<void>(resolve => spreadsheet.onFinish(resolve));
      sheet.unloadSpreadsheet();
    }
  });

  /**
   * Mounts the hook against the real worker. The trace records, in order,
   * each relevant worker event (logged before the hook reacts to it) and
   * each read's start and settlement, so every read has a visible cause.
   */
  function mountReal(hold = false) {
    const trace: string[] = [];
    onTestFinished(
      listen('sync-event', event => {
        if (event.type === 'applied') {
          trace.push(`applied ${event.tables.join(',')}`);
        }
      }),
    );
    onTestFinished(
      listen('cells-changed', nodes => {
        const fx = nodes
          .map(node => node.name)
          .filter(name => /^budget\d{6}!fx-/.test(name));
        if (fx.length) trace.push(`cells ${fx.sort().join(',')}`);
      }),
    );
    const gates: Array<() => void> = [];
    const read = vi.fn(async (args: FxImpactRequest) => {
      trace.push('read');
      const result = await reportsApp.handlers['report/fx-impact'](args);
      if (hold) await new Promise<void>(release => gates.push(release));
      const bridge = result.months[0].bridge;
      trace.push(
        bridge
          ? `settled${bridge.budgetType === 'tracking' ? ' tracking' : ''} cell=${bridge.cell?.value} contribution=${bridge.contribution} pending=${bridge.pending}`
          : 'settled without a bridge',
      );
      return result;
    });
    initServer({ 'report/fx-impact': read });
    const { wrapper } = providers();
    const cells: Array<number | undefined> = [];
    const view = renderHook(
      () => {
        const query = useFxImpact(request);
        const cell = query.data?.months[0].bridge?.cell?.value;
        if (cells.at(-1) !== cell) cells.push(cell);
        return query;
      },
      { wrapper },
    );
    const bridge = () => view.result.current.data?.months[0].bridge;
    return { trace, gates, bridge, cells };
  }

  it('(a) the worker applied event reads a pending bridge, and the real refresh resolves it with one follow-up', async () => {
    const { trace, bridge } = mountReal();
    await waitFor(() => expect(bridge()?.pending).toBe(false));

    // The rate save is a local mutation; the worker announces it as an
    // applied exchange_rates event, then its debounced refresh writes the cell.
    await saveRate('80', '2016-12-20');
    const writes = crdtCount();
    await waitFor(() => expect(bridge()?.pending).toBe(true));
    expect(bridge()).toMatchObject({
      contribution: 2500,
      cell: { value: 0, incomplete: false },
    });
    await waitFor(
      () =>
        expect(bridge()).toMatchObject({
          pending: false,
          contribution: 2500,
          cell: { value: 2500, incomplete: false },
        }),
      { timeout: 2000 },
    );
    await act(() => new Promise(r => setTimeout(r, 300)));
    expect(trace).toEqual([
      'read',
      'settled cell=0 contribution=0 pending=false',
      'applied exchange_rates',
      'read',
      'settled cell=0 contribution=2500 pending=true',
      'cells budget201612!fx-changes',
      'read',
      'settled cell=2500 contribution=2500 pending=false',
    ]);
    expect(crdtCount()).toBe(writes);
    expect(decemberCell()).toBe(2500);
  });

  it('(b) a cell change during a held first read shows that read, then one follow-up with the new cell pair', async () => {
    const { trace, gates, cells, bridge } = mountReal(true);
    await waitFor(() => expect(gates).toHaveLength(1));
    await saveRate('80', '2016-12-20');
    const writes = crdtCount();
    await waitFor(() => expect(decemberCell()).toBe(2500), { timeout: 2000 });
    await act(async () => gates[0]());
    expect(bridge()?.cell).toEqual({ value: 0, incomplete: false });
    await waitFor(() => expect(gates).toHaveLength(2));
    await act(async () => gates[1]());
    expect(bridge()).toMatchObject({
      pending: false,
      cell: { value: 2500, incomplete: false },
    });
    expect(cells.filter(cell => cell !== undefined)).toEqual([0, 2500]);
    await act(() => new Promise(r => setTimeout(r, 300)));
    // Two notifications during the held read give one follow-up.
    expect(trace).toEqual([
      'read',
      'applied exchange_rates',
      'cells budget201612!fx-changes',
      'settled cell=0 contribution=0 pending=false',
      'read',
      'settled cell=2500 contribution=2500 pending=false',
    ]);
    expect(crdtCount()).toBe(writes);
  });

  it('(f) a real budget-type switch refetches, and the bridge shows tracking', async () => {
    const { trace, bridge } = mountReal();
    await waitFor(() => expect(bridge()?.budgetType).toBe('envelope'));
    // The synced-pref write the settings toggle sends through
    // `preferences/save`; syncing it switches the in-memory budget type.
    await db.update('preferences', { id: 'budgetType', value: 'tracking' });
    await waitFor(() =>
      expect(bridge()).toMatchObject({
        budgetType: 'tracking',
        cell: null,
        pending: false,
      }),
    );
    await act(() => new Promise(r => setTimeout(r, 300)));
    // The switch clears the created months and recreates them as tracking
    // sheets. A read that lands before that sees no created month; the new
    // month sheets' cells then start the read that shows the tracking bridge.
    expect(trace.slice(0, 4)).toEqual([
      'read',
      'settled cell=0 contribution=0 pending=false',
      'applied preferences',
      'read',
    ]);
    expect(trace.at(-1)).toBe(
      'settled tracking cell=undefined contribution=0 pending=false',
    );
    const reads = trace.length;
    await act(() => new Promise(r => setTimeout(r, 300)));
    expect(trace).toHaveLength(reads);
  });
});
