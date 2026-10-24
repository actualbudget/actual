import { HotkeysProvider } from 'react-hotkeys-hook';

import { generateCategory } from '@actual-app/core/mocks';
import { initServer } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { onlineManager } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { MonthsContext } from '#components/budget/MonthsContext';
import { CategoryMenuModal } from '#components/modals/CategoryMenuModal';
import type { ContextMenuItem } from '#contextmenu/types';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { SidebarCategory } from './SidebarCategory';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// MC-10.6 fix round 2 (F4): the base budget lanes and repairs open from the
// category menu on desktop and mobile, for every category that displays
// repairable base history (pocket-deletion.test.ts "fix round 2": base-only
// inheritance, later generations, duplicates, one-lane cycles, orphans),
// whether or not it has currency pockets.

const available = {
  'flags.currency': 'true',
  'flags.multicurrency': 'true',
  budgetType: 'envelope',
  defaultCurrencyCode: 'USD',
  amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
};

/** The categories the base-history reader returns. */
const repairable = ['food', 'travel'];

function providers(prefs: Record<string, string>) {
  const listed = vi.fn(async () => repairable);
  initServer({
    'budget/base-slot-categories': listed,
    query: async () => ({ data: [], dependencies: [] }),
    'get-cell': async () => ({ name: 'test-cell', value: 0 }),
    'get-categories': async () => ({
      grouped: [],
      list: ['travel', 'food', 'shop'].map(id => ({
        id,
        name: id[0].toUpperCase() + id.slice(1),
        group: 'group',
        is_income: false,
        hidden: false,
      })),
    }),
    'get-category-groups': async () => [],
  });
  const store = configureTestAppStore({ queryClient: createTestQueryClient() });
  store.dispatch(mergeLocalPrefs({ id: 'budget-a' }));
  store.dispatch(mergeSyncedPrefs(prefs));
  const opened = () =>
    store
      .getState()
      .modals.modalStack.filter(modal => modal.name === 'base-slot')
      .map(modal => modal.options);
  return { store, listed, opened };
}

describe('desktop category menu', () => {
  async function menuOf(
    name: string,
    id: string,
    prefs: Record<string, string> = available,
  ) {
    const setup = providers(prefs);
    const category = { ...generateCategory(name, 'group-id'), id };
    render(
      <TestProviders store={setup.store}>
        <MonthsContext.Provider
          value={{ months: ['2026-03', '2026-04'], type: 'envelope' }}
        >
          <SidebarCategory
            innerRef={null}
            category={category}
            editing={false}
            onEditName={vi.fn()}
            onSave={vi.fn()}
            onDelete={vi.fn()}
          />
        </MonthsContext.Provider>
      </TestProviders>,
    );
    await act(() => Promise.resolve());
    await act(() => Promise.resolve());
    fireEvent.contextMenu(screen.getByText(category.name));
    const items = setup.store.getState().contextMenu.items;
    return { ...setup, items };
  }
  const named = (items: ContextMenuItem[], name: string) =>
    items.find(
      (item): item is Extract<ContextMenuItem, object> =>
        typeof item === 'object' && item.name === name,
    );

  it.each([
    ['Food', 'food'],
    ['Travel', 'travel'],
  ])('opens %s base lanes at the first visible month', async (name, id) => {
    const { items, opened } = await menuOf(name, id);
    const item = named(items, 'base-slot');
    expect(item).toBeDefined();
    item?.onClick?.();
    expect(opened()).toEqual([{ categoryId: id, month: '2026-03' }]);
  });

  it('has no entry for an ordinary category or without multicurrency', async () => {
    expect(named((await menuOf('Shop', 'shop')).items, 'base-slot')).toBe(
      undefined,
    );
    cleanup();
    expect(
      named(
        (
          await menuOf('Food', 'food', {
            ...available,
            'flags.multicurrency': 'false',
          })
        ).items,
        'base-slot',
      ),
    ).toBe(undefined);
  });

  it('reads the list while offline', async () => {
    onlineManager.setOnline(false);
    onTestFinished(() => onlineManager.setOnline(true));
    const { items, listed } = await menuOf('Food', 'food');
    expect(listed).toHaveBeenCalled();
    expect(named(items, 'base-slot')).toBeDefined();
  });
});

describe('mobile category menu', () => {
  function sheet(id: string, prefs: Record<string, string> = available) {
    const setup = providers(prefs);
    render(
      <TestProviders store={setup.store}>
        <HotkeysProvider>
          <CategoryMenuModal
            categoryId={id}
            onSave={vi.fn()}
            onEditNotes={vi.fn()}
            onDelete={vi.fn()}
          />
        </HotkeysProvider>
      </TestProviders>,
    );
    return setup;
  }

  it.each(['food', 'travel'])('opens %s base lanes', async id => {
    const { opened } = sheet(id);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Base budget lanes' }),
    );
    expect(opened()).toEqual([
      { categoryId: id, month: monthUtils.currentMonth() },
    ]);
  });

  it('has no entry for an ordinary category', async () => {
    const { listed } = sheet('shop');
    expect(await screen.findByRole('button', { name: 'Rename' })).toBeVisible();
    await act(() => Promise.resolve());
    expect(listed).toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Base budget lanes' }),
    ).toBeNull();
  });
});
