import React from 'react';
import type { ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MemoryRouter } from 'react-router';

import { generateAccount } from '@actual-app/core/mocks';
import { initServer } from '@actual-app/core/platform/client/connection';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { accountQueries } from '#accounts';
import { SpreadsheetProvider } from '#hooks/useSpreadsheet';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';
import * as bindings from '#spreadsheet/bindings';

import { Account } from './Account';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// jsdom does not implement matchMedia, which the component uses for
// touch-device detection
window.matchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
});

describe('sidebar Account context menu', () => {
  let store: ReturnType<typeof configureTestAppStore>;

  beforeEach(() => {
    initServer({
      query: async () => ({ data: [], dependencies: [] }),
      'get-cell': async () => ({ name: 'test-cell', value: 0 }),
    });

    store = configureTestAppStore({ queryClient: createTestQueryClient() });
  });

  async function renderRow(children: ReactNode) {
    const result = render(
      <TestProviders store={store}>
        <SpreadsheetProvider>
          <MemoryRouter>
            <DndProvider backend={HTML5Backend}>{children}</DndProvider>
          </MemoryRouter>
        </SpreadsheetProvider>
      </TestProviders>,
    );
    // Flush the async notes/balance queries kicked off on mount
    await act(() => Promise.resolve());
    return result;
  }

  function contextMenuItemNames() {
    return store
      .getState()
      .contextMenu.items.map(item =>
        typeof item === 'object' ? item.name : null,
      );
  }

  it('does not open on the All accounts row', async () => {
    await renderRow(
      <Account
        name="All accounts"
        to="/accounts"
        query={bindings.allAccountBalance()}
      />,
    );

    fireEvent.contextMenu(screen.getByText('All accounts'));

    expect(store.getState().contextMenu.isOpen).toBe(false);
    expect(contextMenuItemNames()).toEqual([]);
  });

  it('does not open on the On budget row', async () => {
    await renderRow(
      <Account
        name="On budget"
        to="/accounts/onbudget"
        query={bindings.onBudgetAccountBalance()}
      />,
    );

    fireEvent.contextMenu(screen.getByText('On budget'));

    expect(store.getState().contextMenu.isOpen).toBe(false);
    expect(contextMenuItemNames()).toEqual([]);
  });

  it('opens rename/close on an account row', async () => {
    const account = generateAccount('Bank of America');

    await renderRow(
      <Account
        name={account.name}
        account={account}
        to={`/accounts/${account.id}`}
        query={bindings.accountBalance(account.id)}
      />,
    );

    fireEvent.contextMenu(screen.getByText('Bank of America'));

    expect(store.getState().contextMenu.isOpen).toBe(true);
    expect(contextMenuItemNames()).toEqual(['account-rename', 'account-close']);
  });
});

describe('sidebar current-rate titles', () => {
  const yen = {
    ...generateAccount('Yen'),
    id: 'yen',
    currency: 'JPY',
    currency_precision: 0,
  };
  const dinar = {
    ...generateAccount('Dinar'),
    id: 'kwd',
    currency: 'KWD',
    currency_precision: 3,
  };

  async function renderTitled(children: ReactNode) {
    initServer({
      query: async () => ({ data: [], dependencies: [] }),
      'get-cell': async () => ({ name: 'test-cell', value: 0 }),
      'accounts/current-estimates': async () => ({
        date: '2026-10-08',
        accounts: [
          {
            id: 'yen',
            nativeBalance: -1500,
            storedBaseAmount: -900,
            estimate: {
              status: 'resolved',
              baseAmount: -1000,
              rate: '150',
              kind: 'standing',
              source: 'manual',
              timestamp: '2026-09-01T00:00:00.000Z',
              fallback: false,
            },
          },
          {
            id: 'kwd',
            nativeBalance: -3100,
            storedBaseAmount: -1033,
            estimate: { status: 'unavailable' },
          },
        ],
        groups: {
          all: {
            storedBaseAmount: 0,
            convertedAmount: -1000,
            missing: ['kwd'],
          },
          onBudget: {
            storedBaseAmount: 0,
            convertedAmount: -1000,
            missing: ['kwd'],
          },
          offBudget: { storedBaseAmount: 0, convertedAmount: 0, missing: [] },
        },
      }),
    });
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(accountQueries.list().queryKey, [yen, dinar]);
    const store = configureTestAppStore({ queryClient });
    store.dispatch(
      mergeSyncedPrefs({
        'flags.currency': 'true',
        'flags.multicurrency': 'true',
        defaultCurrencyCode: 'USD',
        amountEncoding: JSON.stringify({
          version: 1,
          currencyCode: 'USD',
          precision: 2,
        }),
      }),
    );
    render(
      <TestProviders store={store} queryClient={queryClient}>
        <SpreadsheetProvider>
          <MemoryRouter>
            <DndProvider backend={HTML5Backend}>{children}</DndProvider>
          </MemoryRouter>
        </SpreadsheetProvider>
      </TestProviders>,
    );
  }

  const titled = (pattern: RegExp) =>
    screen.findByTitle((title: string) =>
      pattern.test(title.replace(/[‪‬]/g, '')),
    );

  it("describes a foreign account's balance", async () => {
    await renderTitled(
      <Account
        name="Yen"
        account={yen}
        to="/accounts/yen"
        query={bindings.accountDisplayBalance(yen)}
      />,
    );
    expect(
      await titled(
        /^≈ -\$10\.00 at the current rate .*\sRecorded base: -\$9\.00$/,
      ),
    ).toBeInTheDocument();
  });

  it('describes the On budget converted total', async () => {
    await renderTitled(
      <Account
        name="On budget"
        to="/accounts/onbudget"
        query={bindings.onBudgetAccountBalance()}
      />,
    );
    expect(
      await titled(/incomplete: rate unavailable for Dinar$/),
    ).toBeInTheDocument();
    // Keyboard focus lands on the link, which the estimate describes.
    const link = screen.getByRole('link', { name: /On budget/ });
    expect(
      (link.getAttribute('aria-describedby') &&
        document
          .getElementById(link.getAttribute('aria-describedby')!)
          ?.textContent?.replace(/[\u202a\u202c]/g, '')) ||
        '',
    ).toMatch(/incomplete: rate unavailable for Dinar$/);
  });
});
