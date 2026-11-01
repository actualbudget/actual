import type { ComponentProps, ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CategoryTransactions } from '#components/mobile/budget/CategoryTransactions';
import { TestProviders } from '#mocks';
import * as bindings from '#spreadsheet/bindings';

import { TransactionListWithBalances } from './TransactionListWithBalances';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (text: string) => text }),
}));
vi.mock('#hooks/useCachedSchedules', () => ({
  SchedulesProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('#hooks/useCategoryPreviewTransactions', () => ({
  useCategoryPreviewTransactions: () => ({
    previewTransactions: [],
    isLoading: false,
  }),
}));
vi.mock('#hooks/useDateFormat', () => ({ useDateFormat: () => 'MM/dd/yyyy' }));
vi.mock('#hooks/useNavigate', () => ({ useNavigate: () => vi.fn() }));
vi.mock('#hooks/useTransactions', () => ({
  useTransactions: () => ({
    transactions: [],
    isPending: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  }),
}));
vi.mock('#hooks/useTransactionsSearch', () => ({
  useTransactionsSearch: () => ({ isSearching: false, search: vi.fn() }),
}));
vi.mock('#hooks/useSheetValue', () => ({ useSheetValue: () => -1000 }));
// Isolate the header from asynchronous spreadsheet subscriptions and list layout.
vi.mock('#components/spreadsheet/CellValue', () => ({
  CellValue: ({
    children,
  }: {
    children: (props: { value: number }) => ReactNode;
  }) => children({ value: -1000 }),
  CellValueText: ({ value, ...props }: { value: number }) => (
    <span {...props}>{value}</span>
  ),
}));
vi.mock('./TransactionList', () => ({ TransactionList: () => null }));

describe('mobile transaction total label', () => {
  it('labels the category-month transaction sum rather than a budget balance', () => {
    render(
      <CategoryTransactions
        category={{
          id: 'test-category',
          name: 'Test category',
          group: 'test-group',
          is_income: false,
        }}
        month="2026-01"
      />,
      { wrapper: TestProviders },
    );
    expect(screen.getByText('Transaction total')).toBeInTheDocument();
    expect(screen.queryByText('Balance')).not.toBeInTheDocument();
    expect(screen.getByTestId('transactions-balance')).toHaveTextContent(
      '-1000',
    );
    expect(screen.getByText('Cleared')).toBeInTheDocument();
    expect(screen.getByText('Uncleared')).toBeInTheDocument();
  });

  it('preserves genuine account balance labels', () => {
    const props = {
      isLoading: false,
      transactions: [],
      balance: bindings.accountBalance('test-account'),
      balanceCleared: bindings.accountBalanceCleared('test-account'),
      balanceUncleared: bindings.accountBalanceUncleared('test-account'),
      searchPlaceholder: 'Search',
      onSearch: vi.fn(),
      isLoadingMore: false,
      onLoadMore: vi.fn(),
      onOpenTransaction: vi.fn(),
    } satisfies ComponentProps<typeof TransactionListWithBalances>;
    render(<TransactionListWithBalances {...props} />, {
      wrapper: TestProviders,
    });
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.queryByText('Transaction total')).not.toBeInTheDocument();
  });
});
