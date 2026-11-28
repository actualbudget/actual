import { generateCategory } from '@actual-app/core/mocks';
import { initServer } from '@actual-app/core/platform/client/connection';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { SidebarCategory } from './SidebarCategory';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const available = {
  'flags.currency': 'true',
  'flags.multicurrency': 'true',
  budgetType: 'envelope',
  defaultCurrencyCode: 'USD',
  amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
};

async function menuOf(
  prefs: Record<string, string>,
  category = generateCategory('Travel', 'group-id'),
) {
  initServer({
    query: async () => ({ data: [], dependencies: [] }),
    'get-cell': async () => ({ name: 'test-cell', value: 0 }),
  });
  const store = configureTestAppStore({ queryClient: createTestQueryClient() });
  store.dispatch(mergeSyncedPrefs(prefs));
  render(
    <TestProviders store={store}>
      <SidebarCategory
        innerRef={null}
        category={category}
        editing={false}
        onEditName={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
    </TestProviders>,
  );
  await act(() => Promise.resolve());
  fireEvent.contextMenu(screen.getByText(category.name));
  return { store, category };
}

function names(store: ReturnType<typeof configureTestAppStore>) {
  return store
    .getState()
    .contextMenu.items.map(item =>
      typeof item === 'object' ? item.name : null,
    );
}

// MC-10.4: Add Currency on desktop, for envelope expense categories only.
it('offers Add currency and opens its dialog', async () => {
  const { store, category } = await menuOf(available);
  expect(names(store)).toEqual([
    'rename',
    'add-currency',
    'toggle-visibility',
    'delete',
  ]);
  const item = store
    .getState()
    .contextMenu.items.find(
      i => typeof i === 'object' && i.name === 'add-currency',
    );
  if (typeof item !== 'object' || !item?.onClick) throw new Error('missing');
  item.onClick();
  expect(store.getState().modals.modalStack).toEqual([
    expect.objectContaining({
      name: 'add-currency',
      options: { categoryId: category.id, categoryName: 'Travel' },
    }),
  ]);
});

it('does not offer Add currency without multicurrency, for tracking or income', async () => {
  for (const [prefs, category] of [
    [{ ...available, 'flags.multicurrency': 'false' }, undefined],
    [{ ...available, budgetType: 'tracking' }, undefined],
    [available, { ...generateCategory('Salary', 'group-id'), is_income: true }],
  ] as const) {
    const { store } = await menuOf(prefs, category);
    expect(names(store)).not.toContain('add-currency');
    cleanup();
  }
});
