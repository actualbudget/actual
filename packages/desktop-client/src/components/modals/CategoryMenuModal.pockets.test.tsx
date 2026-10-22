import { HotkeysProvider } from 'react-hotkeys-hook';

import { initServer } from '@actual-app/core/platform/client/connection';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeLocalPrefs, mergeSyncedPrefs } from '#prefs/prefsSlice';

import { CategoryMenuModal } from './CategoryMenuModal';

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

function setup(prefs: Record<string, string>, isIncome = false) {
  initServer({
    'get-categories': async () => ({
      grouped: [],
      list: [
        {
          id: 'travel',
          name: 'Travel',
          group: 'group',
          is_income: isIncome,
          hidden: false,
        },
      ],
    }),
    'get-category-groups': async () => [],
    query: async () => ({ data: [], dependencies: [] }),
  });
  const store = createTestAppStore();
  store.dispatch(mergeLocalPrefs({ id: 'budget-a' }));
  store.dispatch(mergeSyncedPrefs(prefs));
  render(
    <TestProviders store={store} queryClient={createTestQueryClient()}>
      <HotkeysProvider>
        <CategoryMenuModal
          categoryId="travel"
          onSave={vi.fn()}
          onEditNotes={vi.fn()}
          onDelete={vi.fn()}
        />
      </HotkeysProvider>
    </TestProviders>,
  );
  return store;
}

// MC-10.4: Add Currency on mobile, from the category sheet.
it('offers Add currency and opens its dialog', async () => {
  const store = setup(available);
  await userEvent.click(
    await screen.findByRole('button', { name: 'Add currency' }),
  );
  expect(store.getState().modals.modalStack).toContainEqual(
    expect.objectContaining({
      name: 'add-currency',
      options: { categoryId: 'travel', categoryName: 'Travel' },
    }),
  );
});

it('does not offer Add currency without multicurrency or for income', async () => {
  setup({ ...available, 'flags.multicurrency': 'false' });
  expect(await screen.findByRole('button', { name: 'Rename' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Add currency' })).toBeNull();
  cleanup();
  setup(available, true);
  expect(await screen.findByRole('button', { name: 'Rename' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Add currency' })).toBeNull();
});
