import { theme } from '@actual-app/components/theme';
import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';

import { SheetNameProvider } from '#hooks/useSheetName';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { EnvelopeIncomeBalanceMenuModal } from './EnvelopeIncomeBalanceMenuModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
}));

let sheetValues: Record<string, number | null> = {};

vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: (binding: string | { name: string }) => {
    const name = typeof binding === 'string' ? binding : binding.name;
    return sheetValues[name] ?? null;
  },
}));

const category: CategoryEntity = {
  id: 'salary',
  name: 'Salary',
  group: 'income',
  is_income: true,
};

function renderModal() {
  const client = createTestQueryClient();
  const store = configureTestAppStore({ queryClient: client });
  store.dispatch(mergeSyncedPrefs({ 'flags.goalTemplatesEnabled': 'true' }));
  initServer({
    'get-categories': async () => ({ grouped: [], list: [category] }),
    query: async () => ({ data: [], dependencies: [] }),
  });
  render(
    <TestProviders queryClient={client} store={store}>
      <SheetNameProvider name="budget202401">
        <EnvelopeIncomeBalanceMenuModal
          categoryId={category.id}
          onCarryover={vi.fn()}
          onShowActivity={vi.fn()}
        />
      </SheetNameProvider>
    </TestProviders>,
  );
}

describe('EnvelopeIncomeBalanceMenuModal', () => {
  it('ignores a goal left on the income category by a tracking budget', async () => {
    sheetValues = {
      'goal-salary': 500000,
      'sum-amount-salary': 120000,
      'long-goal-salary': null,
    };
    renderModal();

    expect(await screen.findByText('Received')).toBeInTheDocument();
    expect(screen.queryByText(/funded/)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('1,200.00')).toHaveStyle({
      color: theme.budgetNumberPositive,
    });
  });
});
