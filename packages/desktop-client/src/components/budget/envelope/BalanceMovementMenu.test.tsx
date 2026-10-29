import { initServer } from '@actual-app/core/platform/client/connection';
import { setNumberFormat } from '@actual-app/core/shared/util';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SheetNameProvider } from '#hooks/useSheetName';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { BalanceMovementMenu } from './BalanceMovementMenu';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// Values are keyed by the fully qualified cell name, so a menu that reads
// another month's sheet than the one it acts on would find nothing
let sheetValues: Record<string, number | null> = {};

vi.mock('#hooks/useSheetValue', async () => {
  const { useSheetName } = await import('#hooks/useSheetName');
  return {
    useSheetValue: (binding: Parameters<typeof useSheetName>[0]) => {
      const { fullSheetName } = useSheetName(binding);
      return sheetValues[fullSheetName] ?? null;
    },
  };
});

function renderMenu(prefs: Record<string, string> = {}) {
  const onBudgetAction =
    vi.fn<(month: string, action: string, arg?: unknown) => void>();
  const onClose = vi.fn<() => void>();
  const client = createTestQueryClient();
  const store = configureTestAppStore({ queryClient: client });
  store.dispatch(
    mergeSyncedPrefs({ 'flags.goalTemplatesEnabled': 'true', ...prefs }),
  );
  initServer({
    'get-categories': async () => ({ grouped: [], list: [] }),
    query: async () => ({ data: [], dependencies: [] }),
  });
  render(
    <TestProviders queryClient={client} store={store}>
      <SheetNameProvider name="budget202401">
        <BalanceMovementMenu
          categoryId="groceries"
          month="2024-01"
          onBudgetAction={onBudgetAction}
          onClose={onClose}
        />
      </SheetNameProvider>
    </TestProviders>,
  );
  return { onBudgetAction, onClose };
}

describe('BalanceMovementMenu', () => {
  beforeEach(() => {
    sheetValues = {
      'budget202401!goal-groceries': 65000,
      'budget202401!budget-groceries': 40000,
      'budget202401!leftover-groceries': 40000,
      'budget202401!long-goal-groceries': null,
      'budget202401!to-budget': 50000,
    };
  });

  it('shows the goal status and funds the goal from To Budget for that month', async () => {
    const { onBudgetAction, onClose } = renderMenu();

    expect(
      await screen.findByText('Underfunded (-250.00)'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByText('Fund goal from To Budget'));

    expect(onBudgetAction).toHaveBeenCalledExactlyOnceWith(
      '2024-01',
      'transfer-available',
      { amount: 25000, category: 'groceries' },
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('counts a shortfall that rounds away as funded when decimals are hidden', async () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    sheetValues['budget202401!goal-groceries'] = 40040;
    try {
      renderMenu({ hideFraction: 'true' });

      expect(await screen.findByText('Fully funded')).toBeInTheDocument();
      expect(
        screen.queryByText('Fund goal from To Budget'),
      ).not.toBeInTheDocument();
    } finally {
      setNumberFormat({ format: 'comma-dot', hideFraction: false });
    }
  });

  it('shows the shortfall between the displayed amounts when decimals are hidden', async () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    sheetValues['budget202401!goal-groceries'] = 40051;
    sheetValues['budget202401!budget-groceries'] = 40049;
    try {
      renderMenu({ hideFraction: 'true' });

      expect(await screen.findByText('Underfunded (-1)')).toBeInTheDocument();
      expect(screen.getByText('Fund goal from To Budget')).toBeInTheDocument();
    } finally {
      setNumberFormat({ format: 'comma-dot', hideFraction: false });
    }
  });

  it('does not offer funding when To Budget is empty', async () => {
    sheetValues['budget202401!to-budget'] = 0;
    renderMenu();

    expect(
      await screen.findByText('Underfunded (-250.00)'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Fund goal from To Budget'),
    ).not.toBeInTheDocument();
  });
});
