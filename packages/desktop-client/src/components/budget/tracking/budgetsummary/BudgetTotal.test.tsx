import React from 'react';

import { render, screen } from '@testing-library/react';

import { useSheetValue } from '#hooks/useSheetValue';
import { TestProviders } from '#mocks';
import { trackingBudget } from '#spreadsheet/bindings';

import { BudgetTotal } from './BudgetTotal';

vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: vi.fn(),
}));

function mockValues({
  actual,
  budgeted,
}: {
  actual: number;
  budgeted: number;
}) {
  // BudgetTotal reads the actual amount first, then the budgeted target.
  vi.mocked(useSheetValue).mockImplementation(binding => {
    const name: string = typeof binding === 'string' ? binding : binding.name;
    return name === trackingBudget.totalSpent ||
      name === trackingBudget.totalIncome
      ? actual
      : budgeted;
  });
}

describe('tracking budget summary totals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('spells out what was spent, the target and what is left', () => {
    mockValues({ actual: -217012, budgeted: 303000 });

    render(
      <TestProviders>
        <BudgetTotal
          title="Expenses"
          kind="expense"
          current={trackingBudget.totalSpent}
          target={trackingBudget.totalBudgetedExpense}
        />
      </TestProviders>,
    );

    expect(screen.getByText('2,170.12 spent')).toBeInTheDocument();
    expect(screen.getByText('3,030.00 budgeted')).toBeInTheDocument();
    expect(screen.getByText('859.88 remaining')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '72',
    );
  });

  it('warns when spending goes over the target', () => {
    mockValues({ actual: -50000, budgeted: 40000 });

    render(
      <TestProviders>
        <BudgetTotal
          title="Expenses"
          kind="expense"
          current={trackingBudget.totalSpent}
          target={trackingBudget.totalBudgetedExpense}
        />
      </TestProviders>,
    );

    expect(screen.getByText('100.00 over budget')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
  });

  it('explains an empty target instead of showing "X of 0.00"', () => {
    mockValues({ actual: 1117018, budgeted: 0 });

    render(
      <TestProviders>
        <BudgetTotal
          title="Income"
          kind="income"
          current={trackingBudget.totalIncome}
          target={trackingBudget.totalBudgetedIncome}
        />
      </TestProviders>,
    );

    expect(screen.getByText('11,170.18 received')).toBeInTheDocument();
    expect(screen.getByText('Not budgeted')).toBeInTheDocument();
    expect(screen.getByText('No income budgeted yet')).toBeInTheDocument();
    expect(screen.queryByText(/ of /)).not.toBeInTheDocument();
  });

  it('shows how much income is still expected', () => {
    mockValues({ actual: 420000, budgeted: 841000 });

    render(
      <TestProviders>
        <BudgetTotal
          title="Income"
          kind="income"
          current={trackingBudget.totalIncome}
          target={trackingBudget.totalBudgetedIncome}
        />
      </TestProviders>,
    );

    expect(screen.getByText('4,200.00 received')).toBeInTheDocument();
    expect(screen.getByText('4,210.00 still expected')).toBeInTheDocument();
  });
});
