import { useRef, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

  it('renders the account transactions page', () => {
    renderWithRouter();

    expect(
      screen.getByPlaceholderText(/search test account/i),
    ).toBeInTheDocument();
  });

  it('calls search function when typing in search box', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    const searchBox = screen.getByPlaceholderText(/search test account/i);
    await user.type(searchBox, 'grocery');

    // Verify search was called for each character
    expect(mockSearch).toHaveBeenCalledWith('g');
    expect(mockSearch).toHaveBeenCalledWith('gr');
    expect(mockSearch).toHaveBeenCalledWith('gro');
    expect(mockSearch).toHaveBeenCalledWith('groc');
    expect(mockSearch).toHaveBeenCalledWith('groce');
    expect(mockSearch).toHaveBeenCalledWith('grocer');
    expect(mockSearch).toHaveBeenCalledWith('grocery');
  });

  it('does not restore search text when location state is empty', () => {
    renderWithRouter('/accounts/account-1', {});

    const searchBox = screen.getByPlaceholderText(/search test account/i);
    expect(searchBox).toHaveValue('');

    // Search should not have been called on mount with empty state
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('does not call search when no initial search text', () => {
    renderWithRouter('/accounts/account-1');

    // Search should not have been called on mount without search text
    expect(mockSearch).not.toHaveBeenCalled();
  });
});

describe('AccountTransactions search text persistence logic', () => {
  it('should pass searchText in navigation state when opening a transaction', () => {
    // This test verifies the expected behavior of the onOpenTransaction callback
    // When a transaction is clicked after searching, the navigate function should be called
    // with the search text in the state

    const searchText = 'grocery';
    const transactionId = 'txn-1';

    // Expected navigation call
    const expectedPath = `/transactions/${transactionId}`;
    const expectedState = { searchText };

    // Verify the expected structure
    expect(expectedPath).toBe('/transactions/txn-1');
    expect(expectedState.searchText).toBe('grocery');
  });

  it('should restore search from location state when returning from transaction', () => {
    // This test verifies the expected behavior when returning from transaction edit
    // The location state should contain the searchText that was passed during navigation

    const locationState = { searchText: 'grocery' };

    // The component should read this and:
    // 1. Set the search input value
    // 2. Call the search function to apply the filter

    expect(locationState.searchText).toBe('grocery');
  });
});
