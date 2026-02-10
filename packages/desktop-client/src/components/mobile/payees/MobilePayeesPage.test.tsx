import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { PayeeEntity } from 'loot-core/types/models';

import { MobilePayeesPage } from './MobilePayeesPage';

import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { usePayeeRuleCounts } from '@desktop-client/hooks/usePayeeRuleCounts';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { TestProviders } from '@desktop-client/mocks';

vi.mock('@use-gesture/react', () => ({
  useDrag: vi.fn().mockReturnValue(() => ({})),
}));
vi.mock('@desktop-client/hooks/useNavigate');
vi.mock('@desktop-client/hooks/usePayees');
vi.mock('@desktop-client/hooks/usePayeeRuleCounts');

const mockPayees: PayeeEntity[] = [
  {
    id: 'payee-1',
    name: 'Grocery Store',
    favorite: false,
  },
  {
    id: 'payee-2',
    name: 'Gas Station',
    favorite: true,
  },
  {
    id: 'payee-3',
    name: 'Restaurant',
    favorite: false,
  },
];

describe('MobilePayeesPage', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(usePayees).mockImplementation(() => mockPayees);
    vi.mocked(usePayeeRuleCounts).mockReturnValue({
      ruleCounts: new Map([
        ['payee-1', 2],
        ['payee-2', 0],
      ]),
      isLoading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    });
  });

  const renderPayeesPage = () => {
    return render(
      <TestProviders>
        <MobilePayeesPage />
      </TestProviders>,
    );
  };

  it('renders payees page with header', () => {
    renderPayeesPage();

    expect(
      screen.getByRole('heading', { name: /payees/i }),
    ).toBeInTheDocument();
  });

  it('renders search box', () => {
    renderPayeesPage();

    const searchBox = screen.getByPlaceholderText(/filter payees/i);
    expect(searchBox).toBeInTheDocument();
  });

  it('displays all payees when no filter is applied', () => {
    renderPayeesPage();

    // All payees should be visible
    expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    expect(screen.getByText('Gas Station')).toBeInTheDocument();
    expect(screen.getByText('Restaurant')).toBeInTheDocument();
  });

  it('filters payees by search term', async () => {
    const user = userEvent.setup();
    renderPayeesPage();

    const searchBox = screen.getByPlaceholderText(/filter payees/i);

    await user.type(searchBox, 'Grocery');

    // Only matching payee should be visible
    expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    expect(screen.queryByText('Gas Station')).not.toBeInTheDocument();
    expect(screen.queryByText('Restaurant')).not.toBeInTheDocument();
  });

  it('filters payees case-insensitively', async () => {
    const user = userEvent.setup();
    renderPayeesPage();

    const searchBox = screen.getByPlaceholderText(/filter payees/i);

    await user.type(searchBox, 'gas');

    // Should find "Gas Station" regardless of case
    expect(screen.getByText('Gas Station')).toBeInTheDocument();
    expect(screen.queryByText('Grocery Store')).not.toBeInTheDocument();
  });

  it('clears filter when search is cleared', async () => {
    const user = userEvent.setup();
    renderPayeesPage();

    const searchBox = screen.getByPlaceholderText(/filter payees/i);

    await user.type(searchBox, 'Grocery');
    expect(screen.queryByText('Gas Station')).not.toBeInTheDocument();

    await user.clear(searchBox);

    // All payees should be visible again
    expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    expect(screen.getByText('Gas Station')).toBeInTheDocument();
    expect(screen.getByText('Restaurant')).toBeInTheDocument();
  });

  it('navigates to payee edit page when payee is clicked', async () => {
    const user = userEvent.setup();
    renderPayeesPage();

    const payeeButton = screen.getByText('Grocery Store');
    await user.click(payeeButton);

    expect(mockNavigate).toBeCalledWith('/payees/payee-1');
  });

  it('shows empty state when no payees match filter', async () => {
    const user = userEvent.setup();
    renderPayeesPage();

    const searchBox = screen.getByPlaceholderText(/filter payees/i);

    await user.type(searchBox, 'NonexistentPayee123');

    // No payees should match
    expect(screen.queryByText('Grocery Store')).not.toBeInTheDocument();
    expect(screen.queryByText('Gas Station')).not.toBeInTheDocument();
    expect(screen.queryByText('Restaurant')).not.toBeInTheDocument();
  });

  it('handles empty payee list', () => {
    vi.mocked(usePayees).mockReturnValue([]);

    renderPayeesPage();

    // Page should render even with no payees
    expect(
      screen.getByRole('heading', { name: /payees/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/filter payees/i)).toBeInTheDocument();
  });
});
