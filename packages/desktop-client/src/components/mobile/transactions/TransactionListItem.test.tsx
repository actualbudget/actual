import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { TransactionListItem } from './TransactionListItem';

let mockAccount: Pick<AccountEntity, 'id' | 'currency' | 'offbudget'>;

vi.mock('#hooks/useAccount', () => ({
  useAccount: (id: string) => (id === mockAccount.id ? mockAccount : null),
}));

vi.mock('#hooks/useCategories', () => ({
  useCategories: () => ({ data: { list: [] } }),
}));

vi.mock('#hooks/usePayee', () => ({
  usePayee: () => ({ data: null }),
}));

vi.mock('#hooks/useDisplayPayee', () => ({
  useDisplayPayee: () => 'Store',
}));

vi.mock('#hooks/useCachedSchedules', () => ({
  useCachedSchedules: () => ({ schedules: [] }),
}));

vi.mock('#hooks/useExchangeRates', () => ({
  useExchangeRates: () => ({
    exchangeRates: [],
    rateIndex: buildRateIndex([
      {
        id: 'rate',
        from_currency: 'USD',
        to_currency: 'CAD',
        rate: 1.4,
        date: '2026-10-01',
        source: 'manual',
        created_at: null,
      },
    ]),
  }),
}));

const transaction: TransactionEntity = {
  id: 'transaction',
  account: 'usd',
  date: '2026-10-02',
  amount: -760,
  cleared: false,
};

function renderItem(displayMode: string) {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      'flags.currency': 'true',
      'flags.multiCurrency': 'true',
      defaultCurrencyCode: 'CAD',
      'currency-display-mode': displayMode,
    }),
  );
  render(
    <TestProviders store={store}>
      <TransactionListItem
        transaction={transaction}
        onPress={vi.fn()}
        onLongPress={vi.fn()}
        isSelected={false}
        isHovered={false}
        isPressed={false}
        isFocused={false}
        isFocusVisible={false}
        isDisabled={false}
        selectionMode="none"
        selectionBehavior="toggle"
        allowsDragging={false}
        isDragging={false}
        isDropTarget={false}
        showRunningBalance
        runningBalance={-1520}
      />
    </TestProviders>,
  );
}

// Currency symbols are wrapped in directional formatting characters
function stripDirectionMarks(text: string) {
  return text.replace(/[\u202A-\u202E]/g, '');
}

describe('TransactionListItem', () => {
  beforeEach(() => {
    mockAccount = { id: 'usd', currency: 'USD', offbudget: 0 };
  });

  it.each(['original', 'converted', 'both'])(
    'shows the amount in its own currency with the %s display mode, as on desktop',
    displayMode => {
      renderItem(displayMode);

      expect(
        screen.getByText(text => stripDirectionMarks(text) === '-USD$7.60'),
      ).toBeInTheDocument();
    },
  );

  it.each([
    ['original', '-USD$15.20'],
    ['converted', '-21.28'],
    ['both', '-USD$15.20 (-21.28)'],
  ])(
    'shows the running balance with the %s display mode',
    (displayMode, expected) => {
      renderItem(displayMode);

      expect(
        screen.getByText(text => stripDirectionMarks(text) === expected),
      ).toBeInTheDocument();
    },
  );
});
