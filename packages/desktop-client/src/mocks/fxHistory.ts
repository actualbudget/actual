// A mock server for the exchange rate history UI. Replies are typed by the
// real handler signatures; a held handler queues each call until the test
// delivers its reply, so tests control the order of replies and events.
import type { Handlers } from '@actual-app/core/types/handlers';
import type { HistoryRow } from '@actual-app/core/types/models/exchange-rate-history';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { createTestAppStore } from '#mocks';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { initServer } from './connection';

type Name = keyof Handlers;
export type Reply<N extends Name> = Awaited<ReturnType<Handlers[N]>>;
type Handler = Parameters<typeof initServer>[0][string];
type Deliver = (value: Awaited<ReturnType<Handler>>) => void;

export const fxPrefs = {
  'flags.currency': 'true',
  'flags.multicurrency': 'true',
  defaultCurrencyCode: 'USD',
  amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
};

export function fxStore(prefs: Record<string, string> = fxPrefs) {
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'file-a' }));
  store.dispatch(mergeSyncedPrefs(prefs));
  return store;
}

/** `Select` is a button with a popover menu. */
export async function chooseOption(id: string, label: string) {
  const trigger = document.getElementById(id);
  if (!trigger) throw new Error(`no ${id}`);
  await userEvent.click(trigger);
  const menu = await screen.findByRole('menu');
  await userEvent.click(within(menu).getByRole('button', { name: label }));
}

export const contextA =
  '1.1.0.USD.{"version":1,"currencyCode":"USD","precision":2}';
export const contextB =
  '1.1.1.USD.{"version":1,"currencyCode":"USD","precision":2}';

export function historyRow(overrides: Partial<HistoryRow> = {}): HistoryRow {
  return {
    id: 'r1',
    quote_currency: 'JPY',
    rate: '150',
    kind: 'standing',
    source: 'manual',
    timestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function page(
  rows: HistoryRow[],
  options: Partial<
    Extract<Reply<'exchange-rates/history-page'>, { status: 'ok' }>
  > = {},
): Reply<'exchange-rates/history-page'> {
  return {
    status: 'ok',
    context: contextA,
    rows,
    nextCursor: null,
    invalidCount: 0,
    ...options,
  };
}

export function fxServer() {
  const calls: Array<{ name: string; args: Parameters<Handler>[0] }> = [];
  const replies = new Map<string, Handler>();
  const held = new Map<string, Deliver[]>();
  const holding = new Set<string>();
  const handlers: Record<string, Handler> = {};
  const names = [
    'exchange-rates/history-page',
    'exchange-rates/history-export',
    'exchange-rates/import-preview-begin',
    'exchange-rates/import-preview',
    'exchange-rates/import-commit',
    'exchange-rates/import-cancel',
    'exchange-rates/remove-fetched',
    'exchange-rates/backfill-plan',
    'exchange-rates/backfill-start',
    'exchange-rates/backfill-cancel',
    'exchange-rates/provider-status',
    'exchange-rates/resolve',
    'exchange-rates/save',
    'exchange-rates/remove',
  ] satisfies Name[];
  for (const name of names) {
    handlers[name] = args => {
      calls.push({ name, args });
      if (holding.has(name)) {
        return new Promise(resolve => {
          const queue = held.get(name) ?? [];
          queue.push(resolve);
          held.set(name, queue);
        });
      }
      const reply = replies.get(name);
      if (reply) return reply(args);
      if (name === 'exchange-rates/resolve') return { status: 'unavailable' };
      if (name === 'exchange-rates/history-page') return page([]);
      if (name === 'exchange-rates/import-cancel') return undefined;
      if (name === 'exchange-rates/backfill-cancel') return undefined;
      throw new Error(`unexpected ${name}`);
    };
  }
  initServer(handlers);
  return {
    /** Answer every call to the handler. */
    on<N extends Name>(name: N, reply: () => Reply<N>) {
      holding.delete(name);
      // The generic callback does not contextually type object literals, so
      // call sites satisfy Reply<'handler'> themselves. This wrapper only
      // stores that already-checked reply.
      replies.set(name, () => reply());
    },
    /** Queue every later call to the handler until `next` delivers it. */
    hold(name: Name) {
      holding.add(name);
    },
    async next<N extends Name>(name: N): Promise<(value: Reply<N>) => void> {
      await vi.waitFor(() => {
        if (!held.get(name)?.length) throw new Error(`no held ${name}`);
      });
      const deliver = held.get(name)?.shift();
      if (!deliver) throw new Error(`no held ${name}`);
      return deliver;
    },
    sent(name: Name) {
      return calls.filter(call => call.name === name).map(call => call.args);
    },
    names() {
      return calls.map(call => call.name);
    },
  };
}
