import { render, screen } from '@testing-library/react';

import { SheetNameProvider } from '#hooks/useSheetName';
import { TestProviders } from '#mocks';

import { IncomeMenu } from './IncomeMenu';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

let sheetValues: Record<string, number | boolean | null> = {};

vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: (binding: string | { name: string }) => {
    const name = typeof binding === 'string' ? binding : binding.name;
    return sheetValues[name] ?? null;
  },
}));

function renderMenu({ managed = false, frozen = false } = {}) {
  sheetValues = {
    'buffered-managed': managed,
    frozen,
    'carryover-salary': 0,
  };
  render(
    <TestProviders>
      <SheetNameProvider name="budget202611">
        <IncomeMenu
          categoryId="salary"
          month="2026-11"
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
    ['managed', { managed: true }, false],
    ['frozen', { frozen: true }, false],
    ['before the start', {}, true],
  ])('auto hold toggle in a %s month', (_, state, shown) => {
    renderMenu(state);

    expect(screen.queryByText('Enable auto hold') !== null).toBe(shown);
  });
});
