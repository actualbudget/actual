import { setNumberFormat } from '@actual-app/core/shared/util';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';

import { BalanceCell } from '#components/mobile/budget/BalanceCell';
import { SheetNameProvider } from '#hooks/useSheetName';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';
import { envelopeBudget } from '#spreadsheet/bindings';

import { BalanceWithCarryover } from './BalanceWithCarryover';

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

function renderBalance({
  isMobile = false,
  isGoalTemplatesEnabled = true,
  isIncome = false,
  hideFraction = false,
}: {
  isMobile?: boolean;
  isGoalTemplatesEnabled?: boolean;
  isIncome?: boolean;
  hideFraction?: boolean;
} = {}) {
  const client = createTestQueryClient();
  const store = configureTestAppStore({ queryClient: client });
  if (isGoalTemplatesEnabled) {
    store.dispatch(mergeSyncedPrefs({ 'flags.goalTemplatesEnabled': 'true' }));
  }
  if (hideFraction) {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    store.dispatch(mergeSyncedPrefs({ hideFraction: 'true' }));
  }
  const { container } = render(
    <TestProviders queryClient={client} store={store}>
      <SheetNameProvider name="budget202401">
        {isMobile ? (
          <BalanceCell
            binding={
              isIncome
                ? envelopeBudget.catSumAmount(category.id)
                : envelopeBudget.catBalance(category.id)
            }
            category={{ ...category, is_income: isIncome }}
            aria-label="Open balance menu for Groceries category"
          />
        ) : (
          <BalanceWithCarryover
            carryover={envelopeBudget.catCarryover(category.id)}
            balance={envelopeBudget.catBalance(category.id)}
            goal={envelopeBudget.catGoal(category.id)}
            budgeted={envelopeBudget.catBudgeted(category.id)}
            longGoal={envelopeBudget.catLongGoal(category.id)}
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
    'draws the ring at %s%% beside the plain balance when underfunded',
    (progress, values) => {
      setSheetValues(values);
      renderBalance();
      const ring = screen.getByRole('img', {
        name: `Underfunded, ${progress}% of goal`,
      });
      expect(ring.querySelector('title')).toHaveTextContent(
        `Underfunded, ${progress}% of goal`,
      );
      expect(
        screen.getByTestId('budget202401!leftover-groceries'),
      ).toHaveTextContent(/^[\d,.]+$/);
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
  ])(
    'renders the plain balance when %s',
    (_, values, isGoalTemplatesEnabled) => {
      setSheetValues(values);
      const container = renderBalance({ isGoalTemplatesEnabled });
      expect(screen.queryByRole('img')).toBeNull();
      expect(container.querySelector('svg')).toBeNull();
      expect(
        screen.getByTestId('budget202401!leftover-groceries'),
      ).toHaveTextContent(/^-?[\d,.]+$/);
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
  });

  it.each([
    ['without a goal', { goal: null }],
    ['once funded', { budget: 65000, leftover: 65000 }],
  ])('keeps the plain pill %s', (_, values) => {
    setSheetValues(values);
    renderBalance({ isMobile: true });
    const button = screen.getByRole('button', {
      name: 'Open balance menu for Groceries category',
    });
    expect(button.querySelector('svg')).toBeNull();
  });

  it('keeps the plain pill for income categories', () => {
    sheetValues = {
      'goal-groceries': 500000,
      'budget-groceries': 0,
      'sum-amount-groceries': 0,
    };
    renderBalance({ isMobile: true, isIncome: true });
    const button = screen.getByRole('button', {
      name: 'Open balance menu for Groceries category',
    });
    expect(button.querySelector('svg')).toBeNull();
  });
});
