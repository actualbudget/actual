import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@actual-app/components/popover', () => ({
  Popover: ({ children, isOpen }: { children: ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="popover">{children}</div> : null,
}));

vi.mock('#components/NotesButton', () => ({
  NotesButton: () => <button type="button" aria-label="notes" />,
}));

vi.mock('#components/budget/BalanceWithCarryover', () => ({
  BalanceWithCarryover: () => <div data-testid="balance" />,
}));

vi.mock('#components/budget/envelope/BalanceMovementMenu', () => ({
  BalanceMovementMenu: () => <div data-testid="balance-menu" />,
}));

vi.mock('#components/budget/envelope/BudgetMenu', () => ({
  BudgetMenu: () => <div data-testid="budget-menu" />,
}));

vi.mock('#components/spreadsheet/CellValue', () => ({
  CellValue: ({ children }: { children?: (props: never) => ReactNode }) =>
    children ? <>{children({} as never)}</> : null,
  CellValueText: () => <div data-testid="cell-value" />,
}));

vi.mock('#components/table', () => ({
  Field: ({ children, name }: { children: ReactNode; name?: string }) => (
    <div data-testid={name}>{children}</div>
  ),
  Row: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetCell: () => <div data-testid="sheet-cell" />,
}));

vi.mock('#hooks/useCategoryScheduleGoalTemplateIndicator', () => ({
  useCategoryScheduleGoalTemplateIndicator: () => ({
    schedule: null,
    scheduleStatus: null,
    isScheduleRecurring: false,
    description: '',
  }),
}));

vi.mock('#hooks/useFormat', () => ({
  useFormat: () => ({
    forEdit: (value: unknown) => value,
    fromEdit: (value: unknown) => value,
  }),
}));

vi.mock('#hooks/useNavigate', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('#hooks/useUndo', () => ({
  useUndo: () => ({
    showUndoNotification: vi.fn(),
  }),
}));

import { ExpenseCategoryMonth } from './EnvelopeBudgetComponents';

describe('ExpenseCategoryMonth', () => {
  it('keeps quick actions visible when the cell is active', () => {
    render(
      <ExpenseCategoryMonth
        month="2026-08"
        category={
          {
            id: 'cat-1',
            name: 'Category',
            is_income: false,
          } as never
        }
        editing={false}
        active
        onEdit={() => undefined}
        onBudgetAction={() => undefined}
        onShowActivity={() => undefined}
      />,
    );

    const actions = screen.getByTestId('budget-month-actions');
    expect(actions.className).toContain('force-visible');
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });
});
