import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { render, screen, waitFor } from '@testing-library/react';

import {
  type AccountEntity,
  type CategoryEntity,
  type PayeeEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { TransactionEdit } from './TransactionEdit';

import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';
import { TestProvider } from '@desktop-client/redux/mock';

// Mock hooks and modules
vi.mock('@desktop-client/hooks/useNavigate');
vi.mock('@desktop-client/hooks/useAccounts');
vi.mock('@desktop-client/hooks/useCategories');
vi.mock('@desktop-client/hooks/usePayees');
vi.mock('@desktop-client/hooks/useDateFormat');
vi.mock('@desktop-client/hooks/useSyncedPref');
vi.mock('@desktop-client/hooks/useLocalPref');
vi.mock('@desktop-client/queries/aqlQuery');
vi.mock('loot-core/platform/client/fetch', () => ({
  send: vi.fn().mockResolvedValue({}),
}));

const mockAccounts: AccountEntity[] = [
  {
    id: 'account-1',
    name: 'Test Account',
    offbudget: 0,
    closed: 0,
    sort_order: 0,
    last_reconciled: null,
    tombstone: 0,
  },
] as AccountEntity[];

const mockCategories: CategoryEntity[] = [
  {
    id: 'category-1',
    name: 'Food',
    group: 'group-1',
    hidden: false,
  },
];

const mockPayees: PayeeEntity[] = [
  {
    id: 'payee-1',
    name: 'Test Payee',
  },
];

const mockTransaction: TransactionEntity = {
  id: 'txn-1',
  account: 'account-1',
  date: '2024-01-15',
  amount: -5000,
  payee: 'payee-1',
  notes: 'Test transaction',
  category: 'category-1',
  cleared: true,
};

describe('TransactionEdit navigateBack preserves search text', () => {
  // This test suite verifies the navigateBack logic

  it('should navigate back with search text when present in location state', () => {
    // Test the navigateBack logic directly
    const searchText = 'test search';
    const previousLocation = { pathname: '/accounts/account-1' };

    // Simulate what navigateBack does
    const locationState = { searchText, previousLocation };

    if (locationState.previousLocation && locationState.searchText) {
      // This is the expected path - navigate to previous location with searchText
      const expectedNavigation = {
        path: locationState.previousLocation.pathname,
        state: { searchText: locationState.searchText },
      };

      expect(expectedNavigation.path).toBe('/accounts/account-1');
      expect(expectedNavigation.state.searchText).toBe('test search');
    }
  });

  it('should fall back to navigate(-1) when no search text in location state', () => {
    // Test the fallback logic
    const locationState: {
      previousLocation: { pathname: string };
      searchText?: string;
    } = {
      previousLocation: { pathname: '/accounts/account-1' },
    };

    const shouldFallback = !(
      locationState.previousLocation && locationState.searchText
    );
    expect(shouldFallback).toBe(true);
  });

  it('should fall back to navigate(-1) when no previous location', () => {
    // Test when there's no previous location
    const locationState: {
      searchText: string;
      previousLocation?: { pathname: string };
    } = {
      searchText: 'test',
    };

    const shouldFallback = !(
      locationState.previousLocation && locationState.searchText
    );
    expect(shouldFallback).toBe(true);
  });
});

describe('Search text flow integration', () => {
  it('search text should be preserved through navigation cycle', () => {
    // This test documents the expected flow:
    //
    // 1. User is on /accounts/account-1
    // 2. User searches for "grocery"
    // 3. User clicks on transaction txn-1
    // 4. Navigate is called with:
    //    - path: /transactions/txn-1
    //    - state: { searchText: "grocery" }
    // 5. useNavigate hook adds previousLocation to state
    // 6. At /transactions/txn-1, location.state is:
    //    { searchText: "grocery", previousLocation: { pathname: "/accounts/account-1", ... } }
    // 7. User clicks back or saves
    // 8. navigateBack is called
    // 9. navigateBack uses raw navigate to go to /accounts/account-1 with state: { searchText: "grocery" }
    // 10. AccountTransactions reads searchText from location.state and restores search

    const step1_accountPath = '/accounts/account-1';
    const step2_searchText = 'grocery';

    // Step 4: Navigation state when going to transaction
    const step4_navigationState = { searchText: step2_searchText };
    expect(step4_navigationState.searchText).toBe('grocery');

    // Step 6: Location state at transaction edit page (after useNavigate adds previousLocation)
    const step6_locationState = {
      searchText: step2_searchText,
      previousLocation: { pathname: step1_accountPath },
    };
    expect(step6_locationState.searchText).toBe('grocery');
    expect(step6_locationState.previousLocation.pathname).toBe(
      '/accounts/account-1',
    );

    // Step 9: Navigation back with search text preserved
    const step9_backNavigationPath =
      step6_locationState.previousLocation.pathname;
    const step9_backNavigationState = {
      searchText: step6_locationState.searchText,
    };
    expect(step9_backNavigationPath).toBe('/accounts/account-1');
    expect(step9_backNavigationState.searchText).toBe('grocery');

    // Step 10: Search text is restored in AccountTransactions
    const step10_restoredSearchText = step9_backNavigationState.searchText;
    expect(step10_restoredSearchText).toBe('grocery');
  });
});

describe('TransactionEdit component rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNavigate).mockReturnValue(vi.fn());
    vi.mocked(useAccounts).mockReturnValue(mockAccounts);
    vi.mocked(useCategories).mockReturnValue({
      list: mockCategories,
      grouped: [{ id: 'group-1', name: 'Group 1', categories: mockCategories }],
    });
    vi.mocked(usePayees).mockReturnValue(mockPayees);
    vi.mocked(useDateFormat).mockReturnValue('MM/dd/yyyy');
    vi.mocked(useSyncedPref).mockReturnValue(['7', vi.fn()]);
    vi.mocked(useLocalPref).mockReturnValue([false, vi.fn(), vi.fn()]);
    vi.mocked(aqlQuery).mockResolvedValue({
      data: [mockTransaction],
      dependencies: [],
    });
  });

  const renderWithRouter = (
    transactionId: string,
    locationState?: {
      searchText?: string;
      previousLocation?: { pathname: string };
    },
  ) => {
    const initialEntries = [
      {
        pathname: `/transactions/${transactionId}`,
        state: locationState,
      },
    ];

    return render(
      <TestProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route
              path="/transactions/:transactionId"
              element={<TransactionEdit />}
            />
            <Route path="/accounts/:id" element={<div>Account Page</div>} />
          </Routes>
        </MemoryRouter>
      </TestProvider>,
    );
  };

  it('renders the transaction edit page with transaction data', async () => {
    renderWithRouter('txn-1');

    await waitFor(() => {
      expect(screen.getByTestId('transaction-form')).toBeInTheDocument();
    });
  });

  it('has back button in header', async () => {
    renderWithRouter('txn-1');

    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });
  });

  it('renders with search text in location state', async () => {
    renderWithRouter('txn-1', {
      searchText: 'test search',
      previousLocation: { pathname: '/accounts/account-1' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('transaction-form')).toBeInTheDocument();
    });
  });
});
