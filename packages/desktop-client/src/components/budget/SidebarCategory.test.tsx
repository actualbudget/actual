import React from 'react';
import type { ReactNode } from 'react';

import { generateCategory } from '@actual-app/core/mocks';
import { initServer } from '@actual-app/core/platform/client/connection';
import { act, fireEvent, render, screen } from '@testing-library/react';

import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';

import { SidebarCategory } from './SidebarCategory';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

describe('SidebarCategory context menu', () => {
  let store: ReturnType<typeof configureTestAppStore>;

  const category = generateCategory('Groceries', 'group-id');

  beforeEach(() => {
    initServer({
      query: async () => ({ data: [], dependencies: [] }),
      'get-cell': async () => ({ name: 'test-cell', value: 0 }),
    });

    store = configureTestAppStore({ queryClient: createTestQueryClient() });
  });

  async function renderRow(children: ReactNode) {
    const result = render(
      <TestProviders store={store}>{children}</TestProviders>,
    );
    // Flush the async notes query kicked off on mount
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

  it('opens after the category has been renamed', async () => {
    const onSave = vi.fn();

    const { rerender } = await renderRow(
      <SidebarCategory
        innerRef={null}
        category={category}
        editing={false}
        onEditName={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.contextMenu(screen.getByText('Groceries'));

    expect(store.getState().contextMenu.isOpen).toBe(true);
    expect(contextMenuItemNames()).toEqual([
      'rename',
      'toggle-visibility',
      'delete',
    ]);

    store.dispatch({ type: 'contextMenu/closeContextMenu' });

    // Renaming exposes the cell's input, which unmounts the row's display
    // node, then puts a brand new one back when editing ends.
    rerender(
      <TestProviders store={store}>
        <SidebarCategory
          innerRef={null}
          category={category}
          editing
          onEditName={vi.fn()}
          onSave={onSave}
        />
      </TestProviders>,
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Food' } });
    fireEvent.blur(input);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Food' }),
    );

    const renamed = { ...category, name: 'Food' };
    rerender(
      <TestProviders store={store}>
        <SidebarCategory
          innerRef={null}
          category={renamed}
          editing={false}
          onEditName={vi.fn()}
          onSave={onSave}
          onDelete={vi.fn()}
        />
      </TestProviders>,
    );
    await act(() => Promise.resolve());

    fireEvent.contextMenu(screen.getByText('Food'));

    expect(store.getState().contextMenu.isOpen).toBe(true);
    expect(contextMenuItemNames()).toEqual([
      'rename',
      'toggle-visibility',
      'delete',
    ]);
  });
});
