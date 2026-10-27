import { render, screen } from '@testing-library/react';

import { SheetNameProvider } from '#hooks/useSheetName';
import { TestProviders } from '#mocks';

import { ToBudgetAmount } from './ToBudgetAmount';

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

function renderAmount() {
  sheetValues = {
    'buffered-managed': true,
    'to-budget': -530000,
    'buffered-selected': 750000,
  };
  render(
    <TestProviders>
      <SheetNameProvider name="budget202610">
        <ToBudgetAmount prevMonthName="Sep" />
      </SheetNameProvider>
    </TestProviders>,
  );
}

const heldLine =
  /is held for future months\. Budget less ahead, or add income\./;

describe('ToBudgetAmount in a managed month', () => {
  it('explains an overbudgeted month by what is held', () => {
    renderAmount();

    expect(screen.getByText('Overbudgeted:')).toBeInTheDocument();
    expect(screen.getByText(heldLine)).toHaveTextContent('7,500.00');
  });
});
