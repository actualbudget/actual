import { MemoryRouter } from 'react-router';

import { theme } from '@actual-app/components/theme';
import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { SheetNameProvider } from '#hooks/useSheetName';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { CategoryMonth } from './TrackingBudgetComponents';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

let sheetValues: Record<string, number | null> = {};

vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: (binding: string | { name: string }) => {
    const name = typeof binding === 'string' ? binding : binding.name;
    return sheetValues[name] ?? null;
  },
}));

const incomeCategory: CategoryEntity = {
  id: 'salary',
  name: 'Salary',
  group: 'income',
  is_income: true,
};

const expenseCategory: CategoryEntity = {
  id: 'groceries',
  name: 'Groceries',
  group: 'usual',
  is_income: false,
};

async function renderCategoryMonth(
  category: CategoryEntity,
  { isGoalTemplatesEnabled = true } = {},
) {
  const onShowActivity = vi.fn();
  const client = createTestQueryClient();
  const store = configureTestAppStore({ queryClient: client });
  store.dispatch(
    mergeSyncedPrefs({
      'flags.goalTemplatesEnabled': String(isGoalTemplatesEnabled),
      budgetType: 'tracking',
    }),
  );
  initServer({
    query: async () => ({ data: [], dependencies: [] }),
  });
  render(
    <TestProviders queryClient={client} store={store}>
      <MemoryRouter>
        <SchedulesProvider>
          <SheetNameProvider name="budget202401">
            <CategoryMonth
              category={category}
              month="2024-01"
              editing={false}
              onEdit={vi.fn()}
              onBudgetAction={vi.fn()}
              onShowActivity={onShowActivity}
            />
          </SheetNameProvider>
        </SchedulesProvider>
      </MemoryRouter>
    </TestProviders>,
  );
  // Flush the notes query started on mount
  await act(() => Promise.resolve());
  return { onShowActivity };
}

describe('Tracking budget income category goal', () => {
  function setIncomeSheetValues({
    goal = 500000,
    budget = 300000,
  }: { goal?: number | null; budget?: number } = {}) {
    sheetValues = {
      'goal-salary': goal,
      'budget-salary': budget,
      'sum-amount-salary': 120000,
    };
  }

  it('draws the ring beside the received amount while the goal is underfunded', async () => {
    setIncomeSheetValues();
    const { onShowActivity } = await renderCategoryMonth(incomeCategory);
    const spent = screen.getByTestId('category-month-spent');
    const ring = within(spent).getByRole('img', {
      name: 'Underfunded, 60% of goal',
    });
    // Kept out of the row itself so the ring can't move before a schedule
    // indicator
    expect(ring.parentElement).not.toBe(spent);
    const received = within(spent).getByText('1,200.00');
    expect(received).toHaveStyle({ color: theme.templateNumberUnderFunded });

    // Clicking the amount still shows what was received
    await userEvent.click(received);
    expect(onShowActivity).toHaveBeenCalledWith('salary', '2024-01');
  });

  it('turns the received amount green once the goal is budgeted', async () => {
    setIncomeSheetValues({ budget: 500000 });
    await renderCategoryMonth(incomeCategory);
    const spent = screen.getByTestId('category-month-spent');
    expect(within(spent).queryByRole('img')).toBeNull();
    expect(within(spent).getByText('1,200.00')).toHaveStyle({
      color: theme.templateNumberFunded,
    });
  });

  it.each([
    ['without a goal', { goal: null }, true],
    ['with goal templates off', {}, false],
  ] as const)(
    'keeps the plain received amount %s',
    async (_, values, isGoalTemplatesEnabled) => {
      setIncomeSheetValues(values);
      await renderCategoryMonth(incomeCategory, { isGoalTemplatesEnabled });
      const spent = screen.getByTestId('category-month-spent');
      expect(within(spent).queryByRole('img')).toBeNull();
      const received = within(spent).getByText('1,200.00');
      for (const color of [
        theme.budgetNumberPositive,
        theme.templateNumberFunded,
        theme.templateNumberUnderFunded,
      ]) {
        expect(received).not.toHaveStyle({ color });
      }
    },
  );
});

describe('Tracking budget expense category goal', () => {
  it('keeps the ring on the balance, not the spent amount', async () => {
    sheetValues = {
      'goal-groceries': 65000,
      'budget-groceries': 40000,
      'sum-amount-groceries': -10000,
      'leftover-groceries': 30000,
    };
    await renderCategoryMonth(expenseCategory);
    expect(
      within(screen.getByTestId('category-month-spent')).queryByRole('img'),
    ).toBeNull();
    expect(
      within(screen.getByTestId('balance')).getByRole('img', {
        name: 'Underfunded, 61% of goal',
      }),
    ).toBeInTheDocument();
  });
});
