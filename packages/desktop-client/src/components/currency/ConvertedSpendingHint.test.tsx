import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';

import { ConvertedSpendingHint } from './ConvertedSpendingHint';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

let mockPrefs: Record<string, string> = {};
vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => [mockPrefs[name], vi.fn()],
}));

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: [{ id: 'us', name: 'US checking', currency: 'USD' }],
  }),
}));

function renderHint(
  converted: Array<{
    category: string;
    account: string;
    currency: string;
    amount: number;
  }>,
) {
  const add = vi.fn(async () => 'general-USD');
  initServer({
    'category-currency-converted-spending': async () => converted,
    'category-currencies-get': async () => [],
    'category-currency-add': add,
  });
  const queryClient = createTestQueryClient();
  const store = configureTestAppStore({ queryClient });
  render(
    <TestProviders queryClient={queryClient} store={store}>
      <ConvertedSpendingHint
        category={{ id: 'general', name: 'General' }}
        month="2026-10"
      />
    </TestProviders>,
  );
  return { store, add };
}

describe('ConvertedSpendingHint', () => {
  beforeEach(() => {
    mockPrefs = {
      'flags.currency': 'true',
      'flags.multiCurrency': 'true',
      defaultCurrencyCode: 'CAD',
    };
  });

  it('shows nothing when no spending is converted', async () => {
    renderHint([
      { category: 'food', account: 'us', currency: 'USD', amount: -1000 },
    ]);
    // Let the query settle
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('tells what is converted and offers a line for that currency', async () => {
    const { add } = renderHint([
      { category: 'general', account: 'us', currency: 'USD', amount: -12999 },
    ]);

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Spending converted from USD',
      }),
    );
    // The symbol is kept apart from the amount by direction marks
    expect(
      await screen.findByText(/Includes .*USD.*129\.99 from US checking/),
    ).toBeInTheDocument();
    // Only this category's lines, whatever is chosen budget-wide
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

  it('adds a line for every converted currency at once', async () => {
    const { add } = renderHint([
      { category: 'general', account: 'co', currency: 'COP', amount: -500000 },
      { category: 'general', account: 'us', currency: 'USD', amount: -12999 },
    ]);

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Spending converted from COP, USD',
      }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Add COP and USD lines' }),
    );
    await waitFor(() => expect(add).toHaveBeenCalledTimes(2));
    expect(add).toHaveBeenCalledWith({
      category: 'general',
      currency: 'COP',
      startMonth: '2026-10',
    });
    expect(add).toHaveBeenCalledWith({
      category: 'general',
      currency: 'USD',
      startMonth: '2026-10',
    });
  });
});
