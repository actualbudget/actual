import { render, screen } from '@testing-library/react';

import { SheetNameProvider } from '#hooks/useSheetName';
import { TestProviders } from '#mocks';

import { IncomeMenu } from './IncomeMenu';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

let sheetValues: Record<string, number | string | null> = {};

vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: (binding: string | { name: string }) => {
    const name = typeof binding === 'string' ? binding : binding.name;
    return sheetValues[name] ?? null;
  },
}));

function renderMenu(month: string, { frozen = 0 } = {}) {
  sheetValues = {
    '__global!future-buffer-start': '2026-10',
    frozen,
    'carryover-salary': 0,
  };
  render(
    <TestProviders>
      <SheetNameProvider name={`budget${month.replace('-', '')}`}>
        <IncomeMenu
          categoryId="salary"
          month={month}
          onBudgetAction={vi.fn()}
          onShowActivity={vi.fn()}
          onClose={vi.fn()}
        />
      </SheetNameProvider>
    </TestProviders>,
  );
}

describe('IncomeMenu in automatic mode', () => {
  it.each([
    ['managed', '2026-11', 0],
    ['frozen', '2026-10', 1],
  ])('has no auto hold toggle in a %s month', (_, month, frozen) => {
    renderMenu(month, { frozen });

    expect(screen.queryByText('Enable auto hold')).not.toBeInTheDocument();
    expect(screen.getByText('View transactions')).toBeInTheDocument();
  });

  it('keeps the toggle before the start month', () => {
    renderMenu('2026-09');

    expect(screen.getByText('Enable auto hold')).toBeInTheDocument();
  });
});
