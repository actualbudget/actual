import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryCurrencyEntity } from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { pushModal } from '#modals/modalsSlice';

import { CategoryMenuModal } from './CategoryMenuModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

let mockPrefs: Record<string, string> = {};
vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [mockPrefs[name], vi.fn()],
}));

const general = {
  id: 'general',
  name: 'General',
  group: 'usual',
  is_income: false,
};

vi.mock('#hooks/useCategory', () => ({
  useCategory: () => ({ data: general }),
}));
vi.mock('#hooks/useCategoryGroup', () => ({
  useCategoryGroup: () => ({ data: { id: 'usual', hidden: false } }),
}));
vi.mock('#hooks/useCategories', () => ({
  useCategories: () => ({ data: { grouped: [], list: [general] } }),
}));
vi.mock('#hooks/useNotes', () => ({ useNotes: () => null }));
vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: [{ id: 'us', name: 'US checking', currency: 'USD' }],
  }),
}));

function renderMenu(
  converted: Array<{
    category: string;
    account: string;
    currency: string;
    amount: number;
  }>,
  lines: CategoryCurrencyEntity[] = [],
) {
  const add = vi.fn(async () => 'general-USD');
  initServer({
    'category-currencies-get': async () => lines,
    'category-currency-converted-spending': async () => converted,
    'category-currency-add': add,
  });
  const queryClient = createTestQueryClient();
  const store = configureTestAppStore({ queryClient });
  const options = {
    categoryId: 'general',
    month: '2026-10',
    onSave: vi.fn(),
    onEditNotes: vi.fn(),
    onDelete: vi.fn(),
  };
  store.dispatch(pushModal({ modal: { name: 'category-menu', options } }));
  render(
    <TestProviders queryClient={queryClient} store={store}>
      <CategoryMenuModal {...options} />
    </TestProviders>,
  );
  return { store, add };
}

describe('CategoryMenuModal', () => {
  beforeEach(() => {
    mockPrefs = {
      'flags.currency': 'true',
      'flags.multiCurrency': 'true',
      defaultCurrencyCode: 'CAD',
    };
  });

  it('tells what the category converts and offers a line for it', async () => {
    const { add } = renderMenu([
      { category: 'general', account: 'us', currency: 'USD', amount: -12999 },
    ]);

    // The symbol is kept apart from the amount by direction marks
    expect(
      await screen.findByText(/Includes .*USD.*129\.99 from US checking/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Budget/ })).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: 'Add a USD line' }),
    );
    await waitFor(() =>
      expect(add).toHaveBeenCalledWith({
        category: 'general',
        currency: 'USD',
        startMonth: '2026-10',
      }),
    );
  });

  it('adds a line in a chosen currency from the month shown', async () => {
    mockPrefs['currency-own-lines'] = '*:0';
    const { add } = renderMenu([]);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Add a USD line' }),
    );
    await waitFor(() =>
      expect(add).toHaveBeenCalledWith({
        category: 'general',
        currency: 'USD',
        startMonth: '2026-10',
      }),
    );
    expect(screen.queryByText('Converted spending')).toBeNull();
  });

  it('offers any other currency through a picker', async () => {
    const { store } = renderMenu([]);

    await screen.findByRole('button', { name: 'Edit notes' });
    expect(
      screen.queryByRole('button', { name: /^Add a .* line$/ }),
    ).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: 'Add currency…' }),
    );
    const modal = store.getState().modals.modalStack.at(-1);
    if (modal?.name !== 'category-currency-add') {
      throw new Error(`Expected the currency picker, got ${modal?.name}`);
    }
    expect(modal.options).toEqual({
      category: expect.objectContaining({ id: 'general' }),
      month: '2026-10',
    });
  });

  it('removes a currency line, whatever is chosen budget-wide', async () => {
    mockPrefs['currency-own-lines'] = '*:0';
    renderMenu(
      [],
      [
        {
          id: 'general-USD',
          category: 'general',
          currency: 'USD',
          start_month: '2026-10',
        },
      ],
    );
    expect(
      await screen.findByRole('button', { name: 'Remove USD' }),
    ).toBeInTheDocument();
  });
});
