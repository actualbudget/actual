import React, { useState } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import type { TransactionEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useNavigate } from '#hooks/useNavigate';
import { TestProviders } from '#mocks';
import * as bindings from '#spreadsheet/bindings';

import { TransactionListWithBalances } from './TransactionListWithBalances';

vi.mock('#components/spreadsheet/CellValue', () => ({
  CellValue: () => null,
  CellValueText: () => null,
}));

vi.mock('./TransactionList', () => ({
  TransactionList: ({
    transactions,
    onOpenTransaction,
  }: {
    transactions: TransactionEntity[];
    onOpenTransaction: (transaction: TransactionEntity) => void;
  }) => (
    <ul>
      {transactions.map(transaction => (
        <li key={transaction.id}>
          <button onClick={() => onOpenTransaction(transaction)}>
            {transaction.notes}
          </button>
        </li>
      ))}
    </ul>
  ),
}));

const mockTransactions = [
  { id: 'trans-1', notes: 'Groceries #food' },
  { id: 'trans-2', notes: 'Fuel' },
] as TransactionEntity[];

// Stands in for the mobile account pages: the search narrows the list and
// tapping a transaction opens the edit page.
function AccountTransactionsPage() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');

  return (
    <TransactionListWithBalances
      isLoading={false}
      transactions={mockTransactions.filter(t => t.notes?.includes(searchText))}
      balance={bindings.allAccountBalance()}
      searchPlaceholder="Search All Accounts"
      onSearch={setSearchText}
      isLoadingMore={false}
      onLoadMore={vi.fn()}
      onOpenTransaction={transaction =>
        void navigate(`/transactions/${transaction.id}`)
      }
    />
  );
}

function TransactionEditPage() {
  const navigate = useNavigate();
  return <button onClick={() => void navigate(-1)}>Save changes</button>;
}

function LocationDisplay() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
      <span data-testid="location-state">{JSON.stringify(location.state)}</span>
    </div>
  );
}

describe('TransactionListWithBalances', () => {
  const renderPage = (
    initialEntry: string | { pathname: string; state: unknown } = '/accounts',
  ) =>
    render(
      <TestProviders>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/accounts" element={<AccountTransactionsPage />} />
            <Route path="/transactions/:id" element={<TransactionEditPage />} />
          </Routes>
          <LocationDisplay />
        </MemoryRouter>
      </TestProviders>,
    );

  it('keeps the search after editing a transaction and going back', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByPlaceholderText('Search All Accounts'),
      '#food',
    );
    expect(screen.queryByText('Fuel')).not.toBeInTheDocument();

    await user.click(screen.getByText('Groceries #food'));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/transactions/trans-1',
    );

    await user.click(screen.getByText('Save changes'));

    expect(screen.getByPlaceholderText('Search All Accounts')).toHaveValue(
      '#food',
    );
    expect(screen.getByText('Groceries #food')).toBeInTheDocument();
    expect(screen.queryByText('Fuel')).not.toBeInTheDocument();
  });

  it('keeps other URL params and drops the search param when cleared', async () => {
    const user = userEvent.setup();
    renderPage('/accounts?reconcile=100&search=Fuel');

    const searchBox = screen.getByPlaceholderText('Search All Accounts');
    expect(searchBox).toHaveValue('Fuel');
    expect(screen.queryByText('Groceries #food')).not.toBeInTheDocument();

    await user.clear(searchBox);

    const location = screen.getByTestId('location');
    expect(location).toHaveTextContent('/accounts?reconcile=100');
    expect(location).not.toHaveTextContent('search=');
    expect(screen.getByText('Groceries #food')).toBeInTheDocument();
  });

  it('keeps navigation state (e.g. drill-down filters) while searching', async () => {
    const user = userEvent.setup();
    renderPage({ pathname: '/accounts', state: { filterConditions: ['x'] } });

    await user.type(screen.getByPlaceholderText('Search All Accounts'), 'Fuel');

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/accounts?search=Fuel',
    );
    expect(screen.getByTestId('location-state')).toHaveTextContent(
      '{"filterConditions":["x"]}',
    );
  });
});
