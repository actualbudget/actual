import React from 'react';
import type { ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MemoryRouter } from 'react-router';

import { generateAccount } from '@actual-app/core/mocks';
import { initServer } from '@actual-app/core/platform/client/connection';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { SpreadsheetProvider } from '#hooks/useSpreadsheet';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
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
