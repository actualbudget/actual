import { theme } from '@actual-app/components/theme';
import { setNumberFormat } from '@actual-app/core/shared/util';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { render, screen, within } from '@testing-library/react';

import { BalanceCell } from '#components/mobile/budget/BalanceCell';
import { MobileSheetBalanceHeader } from '#components/mobile/MobileSheetBalanceHeader';
import { SheetNameProvider } from '#hooks/useSheetName';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import { BalanceWithCarryover } from './BalanceWithCarryover';
import { IncomeCategoryMonth } from './envelope/EnvelopeBudgetComponents';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: false }),
}));

let sheetValues: Record<string, number | null> = {};

vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: (binding: string | { name: string }) => {
    const name = typeof binding === 'string' ? binding : binding.name;
    return sheetValues[name] ?? null;
  },
}));

const category: CategoryEntity = {
  id: 'groceries',
  name: 'Groceries',
  group: 'usual',
  is_income: false,
};

const incomeCategory: CategoryEntity = {
  id: 'salary',
  name: 'Salary',
  group: 'income',
  is_income: true,
};

function setSheetValues({
  goal = 65000,
  budget = 40000,
  leftover = 40000,
  longGoal = null,
}: {
  goal?: number | null;
  budget?: number;
  leftover?: number;
  longGoal?: number | null;
} = {}) {
  sheetValues = {
    'goal-groceries': goal,
    'budget-groceries': budget,
    'leftover-groceries': leftover,
    'long-goal-groceries': longGoal,
  };
}

function setIncomeSheetValues({
  goal = 500000,
  budget = 0,
  received = 120000,
  longGoal = null,
}: {
  goal?: number | null;
  budget?: number;
  received?: number;
  longGoal?: number | null;
} = {}) {
  sheetValues = {
    'goal-salary': goal,
    'budget-salary': budget,
    'sum-amount-salary': received,
    'long-goal-salary': longGoal,
  };
}

function renderBalance({
  isMobile = false,
  isSheetHeader = false,
  isGoalTemplatesEnabled = true,
  isIncome = false,
  hideFraction = false,
  budgetType = 'envelope',
}: {
  isMobile?: boolean;
  isSheetHeader?: boolean;
  isGoalTemplatesEnabled?: boolean;
  isIncome?: boolean;
  hideFraction?: boolean;
  budgetType?: 'envelope' | 'tracking';
} = {}) {
  const client = createTestQueryClient();
  const store = configureTestAppStore({ queryClient: client });
  if (isGoalTemplatesEnabled) {
    store.dispatch(mergeSyncedPrefs({ 'flags.goalTemplatesEnabled': 'true' }));
  }
  store.dispatch(mergeSyncedPrefs({ budgetType }));
  if (hideFraction) {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    store.dispatch(mergeSyncedPrefs({ hideFraction: 'true' }));
  }
  const shownCategory = isIncome ? incomeCategory : category;
  const budget = budgetType === 'tracking' ? trackingBudget : envelopeBudget;
  // Income categories show what was received rather than what is left
  const balance = isIncome
    ? budget.catSumAmount(shownCategory.id)
    : budget.catBalance(shownCategory.id);
  const bindings = {
    carryover: budget.catCarryover(shownCategory.id),
    balance,
    goal: budget.catGoal(shownCategory.id),
    budgeted: budget.catBudgeted(shownCategory.id),
    longGoal: budget.catLongGoal(shownCategory.id),
    isIncome,
  };
  const { container } = render(
    <TestProviders queryClient={client} store={store}>
      <SheetNameProvider name="budget202401">
        {isSheetHeader ? (
          <MobileSheetBalanceHeader label="Balance" {...bindings} />
        ) : isMobile ? (
          <BalanceCell
            binding={balance}
            category={shownCategory}
            aria-label={
              isIncome && budgetType === 'tracking'
                ? `Show transactions for ${shownCategory.name} category`
                : `Open balance menu for ${shownCategory.name} category`
            }
          />
        ) : (
          <BalanceWithCarryover
            {...bindings}
            shouldInlineGoalStatus={hideFraction}
          />
        )}
      </SheetNameProvider>
    </TestProviders>,
  );
  return container;
}

afterEach(() => {
  setNumberFormat({ format: 'comma-dot', hideFraction: false });
});

describe('BalanceWithCarryover goal progress ring', () => {
  it.each([
    ['61', {}],
    ['0', { budget: 0 }],
    // Long goals compare the balance, not the budgeted amount
    ['61', { longGoal: 1, budget: 90000 }],
    ['99', { longGoal: 1, budget: 0, leftover: 64999 }],
  ] as const)(
    'draws the ring at %s%% beside the yellow balance when underfunded',
    (progress, values) => {
      setSheetValues(values);
      renderBalance();
      const ring = screen.getByRole('img', {
        name: `Underfunded, ${progress}% of goal`,
      });
      expect(ring.querySelector('title')).toHaveTextContent(
        `Underfunded, ${progress}% of goal`,
      );
      const amount = screen.getByTestId('budget202401!leftover-groceries');
      expect(amount).toHaveTextContent(/^[\d,.]+$/);
      expect(amount).toHaveStyle({ color: theme.templateNumberUnderFunded });
    },
  );

  it.each([
    ['funded', { budget: 65000, leftover: 65000 }, true],
    ['overfunded', { budget: 90000, leftover: 90000 }, true],
    [
      'funded by its balance',
      { longGoal: 1, budget: 0, leftover: 70000 },
      true,
    ],
    ['overspent', { budget: 65000, leftover: -2500 }, true],
    ['without a goal', { goal: null }, true],
    ['with the feature flag off', {}, false],
  ])('draws no ring when %s', (_, values, isGoalTemplatesEnabled) => {
    setSheetValues(values);
    const container = renderBalance({ isGoalTemplatesEnabled });
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
    expect(
      screen.getByTestId('budget202401!leftover-groceries'),
    ).toHaveTextContent(/^-?[\d,.]+$/);
  });

  it.each([
    ['funded', { budget: 65000, leftover: 65000 }],
    ['funded by its balance', { longGoal: 1, budget: 0, leftover: 70000 }],
  ])('turns the balance green when %s', (_, values) => {
    setSheetValues(values);
    renderBalance();
    expect(screen.getByTestId('budget202401!leftover-groceries')).toHaveStyle({
      color: theme.templateNumberFunded,
    });
  });

  it.each([
    ['without a goal', { goal: null, budget: 65000, leftover: 65000 }, true],
    ['with the feature flag off', { budget: 65000, leftover: 65000 }, false],
  ])(
    'keeps the usual balance colour when %s',
    (_, values, isGoalTemplatesEnabled) => {
      setSheetValues(values);
      renderBalance({ isGoalTemplatesEnabled });
      expect(screen.getByTestId('budget202401!leftover-groceries')).toHaveStyle(
        { color: theme.budgetNumberPositive },
      );
    },
  );

  it('reads as the amount followed by its status', () => {
    setSheetValues();
    renderBalance();
    const ring = screen.getByRole('img', { name: 'Underfunded, 61% of goal' });
    const amount = screen.getByTestId('budget202401!leftover-groceries');
    expect(
      amount.compareDocumentPosition(ring) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('agrees with the goal status when decimals are hidden', () => {
    setSheetValues({ goal: 10040, longGoal: 1, budget: 0, leftover: 10000 });
    renderBalance({ hideFraction: true });
    expect(screen.queryByRole('img')).toBeNull();
    expect(
      screen.getByRole('progressbar', { name: 'Goal progress' }),
    ).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('BalanceCell goal progress ring', () => {
  it('adds the ring and the status to the button label', () => {
    setSheetValues();
    renderBalance({ isMobile: true });
    const button = screen.getByRole('button', {
      name: 'Open balance menu for Groceries category, Underfunded, 61% of goal',
    });
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button).toHaveTextContent('400.00');
    expect(within(button).getByText('400.00')).toHaveStyle({
      color: theme.templateNumberUnderFunded,
    });
  });

  it.each([
    ['without a goal', { goal: null }, theme.budgetNumberPositive],
    [
      'once funded',
      { budget: 65000, leftover: 65000 },
      theme.templateNumberFunded,
    ],
  ])('draws no ring %s', (_, values, color) => {
    setSheetValues(values);
    renderBalance({ isMobile: true });
    const button = screen.getByRole('button', {
      name: 'Open balance menu for Groceries category',
    });
    expect(button.querySelector('svg')).toBeNull();
    expect(within(button).getByText(/^[\d,.]+$/)).toHaveStyle({ color });
  });
});

describe('MobileSheetBalanceHeader goal colour', () => {
  it('turns the balance green once the goal is funded', () => {
    setSheetValues({ budget: 65000, leftover: 65000 });
    renderBalance({ isSheetHeader: true });
    expect(screen.getByText('Fully funded')).toBeInTheDocument();
    expect(screen.getByTestId('budget202401!leftover-groceries')).toHaveStyle({
      color: theme.templateNumberFunded,
    });
  });
});

describe('Goals on income categories', () => {
  // Envelope budgets don't apply templates to income, so a goal found there was
  // left by a tracking budget
  it.each([
    ['budget table', {}],
    ['mobile budget', { isMobile: true }],
    ['balance menu', { isSheetHeader: true }],
  ])('ignores the goal of an envelope income category in the %s', (_, view) => {
    setIncomeSheetValues();
    renderBalance({ ...view, isIncome: true });
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('1,200.00')).toHaveStyle({
      color: theme.budgetNumberPositive,
    });
  });

  it('ignores the goal of an envelope income category in its received cell', () => {
    setIncomeSheetValues();
    const client = createTestQueryClient();
    const store = configureTestAppStore({ queryClient: client });
    store.dispatch(mergeSyncedPrefs({ 'flags.goalTemplatesEnabled': 'true' }));
    render(
      <TestProviders queryClient={client} store={store}>
        <SheetNameProvider name="budget202401">
          <IncomeCategoryMonth
            category={incomeCategory}
            month="2024-01"
            editing={false}
            onEdit={vi.fn()}
            onShowActivity={vi.fn()}
            onBudgetAction={vi.fn()}
          />
        </SheetNameProvider>
      </TestProviders>,
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('1,200.00')).toHaveStyle({
      color: theme.budgetNumberPositive,
    });
  });

  it.each([
    // The income budgeted for the month counts towards the goal
    ['60%', { budget: 300000 }],
    // A long goal counts the income received
    ['24%', { budget: 500000, longGoal: 1 }],
  ] as const)(
    'draws the ring at %s on a tracking income category',
    (progress, values) => {
      setIncomeSheetValues(values);
      renderBalance({ isMobile: true, isIncome: true, budgetType: 'tracking' });
      const button = screen.getByRole('button', {
        name: `Show transactions for Salary category, Underfunded, ${progress} of goal`,
      });
      expect(within(button).getByText('1,200.00')).toHaveStyle({
        color: theme.templateNumberUnderFunded,
      });
    },
  );

  it('turns a tracking income category green once its goal is budgeted', () => {
    setIncomeSheetValues({ budget: 500000 });
    renderBalance({ isMobile: true, isIncome: true, budgetType: 'tracking' });
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('1,200.00')).toHaveStyle({
      color: theme.templateNumberFunded,
    });
  });
});
