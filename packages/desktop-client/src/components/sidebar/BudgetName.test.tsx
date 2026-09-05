import React from 'react';
import type { ReactNode } from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import { act, fireEvent, render, screen } from '@testing-library/react';

import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeLocalPrefs } from '#prefs/prefsSlice';

import { BudgetName } from './BudgetName';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

describe('BudgetName context menu', () => {
  let store: ReturnType<typeof configureTestAppStore>;

  beforeEach(() => {
    initServer({
      query: async () => ({ data: [], dependencies: [] }),
      'get-cell': async () => ({ name: 'test-cell', value: 0 }),
      'close-budget': async () => ({}),
    });

    store = configureTestAppStore({ queryClient: createTestQueryClient() });
    store.dispatch(mergeLocalPrefs({ budgetName: 'Test Budget' }));
  });

  async function renderBudgetName(children?: ReactNode) {
    const result = render(
      <TestProviders store={store}>
        <BudgetName>{children}</BudgetName>
      </TestProviders>,
    );
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

  it('opens the context menu on first render', async () => {
    await renderBudgetName();

    fireEvent.contextMenu(screen.getByText('Test Budget'));

    expect(store.getState().contextMenu.isOpen).toBe(true);
    expect(contextMenuItemNames()).toEqual(['rename', 'settings', 'close']);
  });

  it('reopens the context menu after the budget name is changed in the store', async () => {
    const { rerender } = await renderBudgetName();

    // Open and close the context menu
    fireEvent.contextMenu(screen.getByText('Test Budget'));
    expect(store.getState().contextMenu.isOpen).toBe(true);

    store.dispatch({ type: 'contextMenu/closeContextMenu' });
    expect(store.getState().contextMenu.isOpen).toBe(false);

    // Change the budget name in the store — this causes the budget name button
    // to unmount (old name) and mount a new one (new name). The context menu
    // listener is attached to the button via useRefEventListener; before the
    // useRefEventListener fix (PR #8763), the listener would stay bound to the
    // old (detached) button element and the new button would not respond to
    // right-clicks.
    store.dispatch(mergeLocalPrefs({ budgetName: 'Renamed Budget' }));

    // Re-render using the same container so only one BudgetName tree is active.
    rerender(
      <TestProviders store={store}>
        <BudgetName />
      </TestProviders>,
    );
    await act(() => Promise.resolve());

    fireEvent.contextMenu(screen.getByText('Renamed Budget'));

    expect(store.getState().contextMenu.isOpen).toBe(true);
    expect(contextMenuItemNames()).toEqual(['rename', 'settings', 'close']);
  });
});
