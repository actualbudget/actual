import React from 'react';

import { render, screen } from '@testing-library/react';

import { useSheetValue } from '#hooks/useSheetValue';
import { TestProviders } from '#mocks';
import { envelopeBudget } from '#spreadsheet/bindings';

import { ToBudgetAmount } from './ToBudgetAmount';

vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: vi.fn(),
}));

function mockValues({
  toBudget,
  availableFunds,
}: {
  toBudget: number;
  availableFunds: number;
}) {
  vi.mocked(useSheetValue).mockImplementation(binding => {
    const name: string = typeof binding === 'string' ? binding : binding.name;
    if (name === envelopeBudget.toBudget) {
      return toBudget;
    }
    if (name === envelopeBudget.incomeAvailable) {
      return availableFunds;
    }
    return 0;
  });
}

function renderAmount() {
  return render(
    <TestProviders>
      <ToBudgetAmount
        prevMonthName="Sep"
        onClick={vi.fn()}
        isTotalsListTooltipDisabled
      />
    </TestProviders>,
  );
}

describe('ToBudgetAmount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tells the user to assign money when there is some left', () => {
    mockValues({ toBudget: 534100, availableFunds: 900000 });
    renderAmount();

    expect(screen.getByTestId('to-budget-amount')).toHaveTextContent(
      '5,341.00',
    );
    expect(screen.getByText('Left to budget')).toBeInTheDocument();
    expect(screen.getByTestId('to-budget-status')).toHaveTextContent(
      'Click the amount to assign it to categories.',
    );
  });

  it('explains what a negative amount means', () => {
    mockValues({ toBudget: -2500, availableFunds: 100000 });
    renderAmount();

    expect(screen.getByText('Overbudgeted')).toBeInTheDocument();
    expect(screen.getByTestId('to-budget-status')).toHaveTextContent(
      'You assigned more than you have',
    );
  });

  it('celebrates a fully assigned month', () => {
    mockValues({ toBudget: 0, availableFunds: 507114 });
    renderAmount();

    expect(screen.getByTestId('to-budget-status')).toHaveTextContent(
      'Every dollar has a job',
    );
  });

  it('guides a brand new budget with no money in it yet', () => {
    mockValues({ toBudget: 0, availableFunds: 0 });
    renderAmount();

    expect(screen.getByTestId('to-budget-status')).toHaveTextContent(
      'Add an account with a balance',
    );
  });
});
