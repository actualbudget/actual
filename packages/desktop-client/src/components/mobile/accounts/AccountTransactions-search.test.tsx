import { useRef, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { render, screen, waitFor } from '@testing-library/react';

import {
  type AccountEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { AccountTransactions } from './AccountTransactions';

import { useAccountPreviewTransactions } from '@desktop-client/hooks/useAccountPreviewTransactions';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { ScrollProvider } from '@desktop-client/hooks/useScrollListener';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useTransactions } from '@desktop-client/hooks/useTransactions';
import { useTransactionsSearch } from '@desktop-client/hooks/useTransactionsSearch';
import { TestProvider } from '@desktop-client/redux/mock';

// Mock hooks
vi.mock('@desktop-client/hooks/useNavigate');
vi.mock('@desktop-client/hooks/useTransactions');
vi.mock('@desktop-client/hooks/useTransactionsSearch');
vi.mock('@desktop-client/hooks/useSheetValue');
vi.mock('@desktop-client/hooks/useSyncedPref');
vi.mock('@desktop-client/hooks/useAccountPreviewTransactions');
vi.mock('@desktop-client/hooks/useDateFormat');
vi.mock('@desktop-client/hooks/useCachedSchedules', () => ({
  SchedulesProvider: ({ children }: { children: ReactNode }) => children,
  useCachedSchedules: () => ({ isLoading: false, schedules: [] }),
}));

const mockAccount = {
  id: 'account-1',
  name: 'Test Account',
  offbudget: 0,
  closed: 0,
} as AccountEntity;

const mockTransactions: TransactionEntity[] = [
  {
    id: 'txn-1',
    account: 'account-1',
    date: '2024-01-15',
    amount: -5000,
    payee: 'payee-1',
    notes: 'Test transaction 1',
    category: 'category-1',
    cleared: true,
    sort_order: 1,
    reconciled: false,
    tombstone: false,
    schedule: undefined,
  },
  {
    id: 'txn-2',
    account: 'account-1',
    date: '2024-01-14',
    amount: -3000,
    payee: 'payee-2',
    notes: 'Test transaction 2',
    category: 'category-2',
    cleared: false,
    sort_order: 1,
    reconciled: false,
    tombstone: false,
    schedule: undefined,
  },
];

// Wrapper component that provides ScrollProvider with a ref
function TestWrapper({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null!);
  return (
    <div ref={scrollRef} style={{ overflow: 'auto', height: '100vh' }}>
      <ScrollProvider scrollableRef={scrollRef}>{children}</ScrollProvider>
    </div>
  );
}

describe('AccountTransactions', () => {
  const mockNavigate = vi.fn();
  const mockSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useDateFormat).mockReturnValue('MM/dd/yyyy');
    vi.mocked(useSheetValue).mockReturnValue(10000);
    vi.mocked(useSyncedPref).mockReturnValue(['false', vi.fn()]);
    vi.mocked(useAccountPreviewTransactions).mockReturnValue({
      previewTransactions: [],
      runningBalances: new Map(),
      isLoading: false,
    });
    vi.mocked(useTransactions).mockReturnValue({
      transactions: mockTransactions,
      runningBalances: new Map(),
      isLoading: false,
      reload: vi.fn(),
      loadMore: vi.fn(),
      isLoadingMore: false,
    });
    vi.mocked(useTransactionsSearch).mockReturnValue({
      isSearching: false,
      search: mockSearch,
    });
  });

  const renderWithRouter = (
    initialPath = '/accounts/account-1',
    locationState?: { searchText?: string },
  ) => {
    return render(
      <TestProvider>
        <MemoryRouter
          initialEntries={[{ pathname: initialPath, state: locationState }]}
        >
          <TestWrapper>
            <Routes>
              <Route
                path="/accounts/:id"
                element={<AccountTransactions account={mockAccount} />}
              />
            </Routes>
          </TestWrapper>
        </MemoryRouter>
      </TestProvider>,
    );
  };

  it('restores search text from location state on mount', async () => {
    // Render with search text in location state (simulating return from transaction)
    renderWithRouter('/accounts/account-1', { searchText: 'restored search' });

    // The search input should have the restored value
    await waitFor(() => {
      const searchBox = screen.getByPlaceholderText(/search test account/i);
      expect(searchBox).toHaveValue('restored search');
    });

    // The search function should have been called with the restored text
    expect(mockSearch).toHaveBeenCalledWith('restored search');
  });
});
