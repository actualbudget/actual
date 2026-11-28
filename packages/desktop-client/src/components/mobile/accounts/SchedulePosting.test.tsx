import type { ComponentType, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { TransactionEntity } from '@actual-app/core/types/models';
import { render, waitFor } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';

import { AllAccountTransactions } from './AllAccountTransactions';
import { OffBudgetAccountTransactions } from './OffBudgetAccountTransactions';
import { OnBudgetAccountTransactions } from './OnBudgetAccountTransactions';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const list = vi.hoisted(() => ({
  open: (_transaction: Partial<TransactionEntity>) => undefined as void,
}));
vi.mock('#components/mobile/transactions/TransactionListWithBalances', () => ({
  TransactionListWithBalances: ({
    onOpenTransaction,
  }: {
    onOpenTransaction: (transaction: Partial<TransactionEntity>) => void;
  }) => {
    list.open = onOpenTransaction;
    return null;
  },
}));
vi.mock('#hooks/useCachedSchedules', () => ({
  SchedulesProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('#hooks/usePreviewTransactions', () => ({
  usePreviewTransactions: () => ({ previewTransactions: [], isLoading: false }),
}));
vi.mock('#hooks/useTransactions', () => ({
  useTransactions: () => ({ transactions: [] }),
}));
vi.mock('#hooks/useTransactionsSearch', () => ({
  useTransactionsSearch: () => ({ isSearching: false, search: vi.fn() }),
}));
vi.mock('#hooks/useOnBudgetAccounts', () => ({
  useOnBudgetAccounts: () => ({ data: [] }),
}));
vi.mock('#hooks/useOffBudgetAccounts', () => ({
  useOffBudgetAccounts: () => ({ data: [] }),
}));
vi.mock('#hooks/useNavigate', () => ({ useNavigate: () => vi.fn() }));

const occurrence = {
  schedule: 'rent',
  account: 'usd',
  other: 'jpy',
  date: '2026-03-08',
  amount: -10000,
  notes: null,
  cleared: false,
  category: null,
};

it.each([
  ['all accounts', AllAccountTransactions],
  ['on budget', OnBudgetAccountTransactions],
  ['off budget', OffBudgetAccountTransactions],
] as Array<[string, ComponentType]>)(
  'opens the exchange dialog from the %s list',
  async (_name, View) => {
    initServer({
      'schedule/post-transaction': async () => ({
        type: 'exchange-unavailable' as const,
        reason: 'rate-unavailable' as const,
        currencies: ['JPY'],
        ...occurrence,
      }),
    });
    const store = createTestAppStore();
    render(
      <TestProviders store={store}>
        <MemoryRouter>
          <View />
        </MemoryRouter>
      </TestProviders>,
    );
    list.open({ id: 'preview/rent/2026-03-08' });
    const [menu] = store.getState().modals.modalStack;
    expect(menu.name).toBe('scheduled-transaction-menu');
    if (menu.name !== 'scheduled-transaction-menu') return;
    menu.options.onPost('preview/rent/2026-03-08');
    // The menu closes first, so the dialog stays open.
    await waitFor(() =>
      expect(store.getState().modals.modalStack).toEqual([
        expect.objectContaining({
          name: 'exchange-transfer',
          options: { occurrence },
        }),
      ]),
    );
  },
);
