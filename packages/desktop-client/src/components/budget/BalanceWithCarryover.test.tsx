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

describe('BalanceWithCarryover goal status pill', () => {
  it.each([
    ['underfunded', 'Underfunded: 400.00', {}],
    ['funded', 'Funded: 650.00', { budget: 65000, leftover: 65000 }],
    ['overspent', 'Overspent: -25.00', { budget: 65000, leftover: -2500 }],
    // Long goals compare the balance, not the budgeted amount
    ['funded', 'Funded: 700.00', { longGoal: 1, budget: 0, leftover: 70000 }],
    ['underfunded', 'Underfunded: 400.00', { longGoal: 1, budget: 90000 }],
  ] as const)(
    'shows the %s pill with an icon and hidden label',
    (state, text, values) => {
      setSheetValues(values);
      const container = renderBalance();
      const pill = container.querySelector('[data-goal-status]');
      expect(pill).toHaveAttribute('data-goal-status', state);
      expect(pill?.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      expect(pill).toHaveTextContent(text);
    },
  );

  it.each([
    ['without a goal', { goal: null }, true],
    ['with the feature flag off', {}, false],
  ])('renders the plain balance %s', (_, values, isGoalTemplatesEnabled) => {
    setSheetValues(values);
    const container = renderBalance({ isGoalTemplatesEnabled });
    expect(container.querySelector('[data-goal-status]')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
    expect(
      screen.getByTestId('budget202401!leftover-groceries'),
    ).toHaveTextContent('400.00');
  });

  it('agrees with the goal status when decimals are hidden', () => {
    setSheetValues({ goal: 10040, longGoal: 1, budget: 0, leftover: 10000 });
    const container = renderBalance({ hideFraction: true });
    expect(container.querySelector('[data-goal-status]')).toHaveAttribute(
      'data-goal-status',
      'funded',
    );
    expect(screen.getByText('Fully funded')).toBeInTheDocument();
  });
});

describe('BalanceCell goal status pill', () => {
  it('adds the icon and the status to the button label', () => {
    setSheetValues();
    renderBalance({ isMobile: true });
    const button = screen.getByRole('button', {
      name: 'Open balance menu for Groceries category, Underfunded',
    });
    expect(button.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(button).toHaveTextContent('400.00');
  });

  it('keeps the plain pill without a goal', () => {
    setSheetValues({ goal: null });
    renderBalance({ isMobile: true });
    const button = screen.getByRole('button', {
      name: 'Open balance menu for Groceries category',
    });
    expect(button.querySelector('svg')).toBeNull();
    expect(button).toHaveTextContent('400.00');
  });

  it('keeps the plain pill for income categories', () => {
    sheetValues = {
      'goal-groceries': 500000,
      'budget-groceries': 500000,
      'sum-amount-groceries': 0,
    };
    renderBalance({ isMobile: true, isIncome: true });
    const button = screen.getByRole('button', {
      name: 'Open balance menu for Groceries category',
    });
    expect(button.querySelector('svg')).toBeNull();
  });
});
