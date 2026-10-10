import React from 'react';
import { BrowserRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { Query } from '@actual-app/core/shared/query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useTransactions } from '#hooks/useTransactions';
import { TestProviders } from '#mocks';

import { AllAccountTransactions } from './AllAccountTransactions';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('#components/spreadsheet/CellValue', () => ({
  CellValue: () => null,
  CellValueText: () => null,
}));
vi.mock('#components/mobile/transactions/TransactionList', () => ({
  TransactionList: () => null,
}));
vi.mock('#hooks/useTransactions', () => ({
  useTransactions: vi.fn(() => ({
    transactions: [],
    isPending: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  })),
}));
vi.mock('#hooks/usePreviewTransactions', () => ({
  usePreviewTransactions: () => ({ previewTransactions: [], isLoading: false }),
}));
vi.mock('#hooks/useSchedules', () => ({
  getSchedulesQuery: vi.fn(),
  useSchedules: () => ({}),
}));

const drillDownFilter = { notes: { $eq: 'from-report' } };

// The query AllAccountTransactions currently hands to useTransactions
// (DisplayPayeeProvider also calls it, with a different query).
function currentQuery() {
  const queries = vi
    .mocked(useTransactions)
    .mock.calls.map(
      ([props]) =>
        (props.query as Query | undefined)?.serializeAsString() ?? '',
    )
    .filter(query => query.includes('"splits":"all"'));
  return queries[queries.length - 1] ?? '';
}

describe('AllAccountTransactions', () => {
  // Drill-downs from reports land here with filter conditions in the
  // navigation state. A real BrowserRouter is used because, like the app,
  // it rebuilds location.state from history.state on every URL update.
  const renderPage = (url: string, filterDelayMs = 0) => {
    const makeFilters = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, filterDelayMs));
      return { filters: [drillDownFilter] };
    });
    initServer({ 'make-filters-from-conditions': makeFilters });
    window.history.replaceState(
      {
        usr: { filterConditions: [{ field: 'notes', op: 'is', value: 'x' }] },
        key: 'drill',
        idx: 0,
      },
      '',
      url,
    );
    render(
      <TestProviders>
        <BrowserRouter>
          <AllAccountTransactions />
        </BrowserRouter>
      </TestProviders>,
    );
    return makeFilters;
  };

  beforeEach(() => {
    vi.mocked(useTransactions).mockClear();
    // Browsers structured-clone history state, so location.state gets a new
    // identity on every URL update; jsdom keeps the same object.
    const { pushState, replaceState } = window.history;
    vi.spyOn(window.history, 'pushState').mockImplementation((data, ...rest) =>
      pushState.call(window.history, structuredClone(data), ...rest),
    );
    vi.spyOn(window.history, 'replaceState').mockImplementation(
      (data, ...rest) =>
        replaceState.call(window.history, structuredClone(data), ...rest),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies drill-down filters once and keeps the search on top of them', async () => {
    const user = userEvent.setup();
    const makeFilters = renderPage('/accounts/all');
    await waitFor(() => expect(currentQuery()).toContain('from-report'));

    await user.type(screen.getByPlaceholderText('Search All Accounts'), 'Fuel');

    await waitFor(() => expect(currentQuery()).toContain('%Fuel%'));
    expect(currentQuery()).toContain('from-report');
    expect(window.location.search).toBe('?search=Fuel');
    expect(makeFilters).toHaveBeenCalledTimes(1);
  });

  it('re-applies a restored search once slow drill-down filters load', async () => {
    const makeFilters = renderPage('/accounts/all?search=Fuel', 300);

    expect(screen.getByPlaceholderText('Search All Accounts')).toHaveValue(
      'Fuel',
    );
    await waitFor(
      () => {
        expect(currentQuery()).toContain('from-report');
        expect(currentQuery()).toContain('%Fuel%');
      },
      { timeout: 2000 },
    );
    expect(makeFilters).toHaveBeenCalledTimes(1);
  });
});
