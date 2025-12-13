import React from 'react';

import { render, screen } from '@testing-library/react';

import { generateAccount } from 'loot-core/mocks';
import {
  type AccountEntity,
  type ScheduleEntity,
} from 'loot-core/types/models';

import { SelectedBalance } from './Balance';

import { useCachedSchedules } from '@desktop-client/hooks/useCachedSchedules';
import { SelectedProviderWithItems } from '@desktop-client/hooks/useSelected';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { TestProvider } from '@desktop-client/redux/mock';

vi.mock('@desktop-client/hooks/useSheetValue', () => ({
  useSheetValue: vi.fn(),
}));

vi.mock('@desktop-client/hooks/useCachedSchedules', () => ({
  useCachedSchedules: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('SelectedBalance', () => {
  const mockAccount = generateAccount(
    'Checking',
    false,
    false,
  ) as AccountEntity;

  const defaultScheduleResult = {
    isLoading: false,
    schedules: [] as const,
    statuses: new Map(),
    statusLabels: new Map(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCachedSchedules).mockReturnValue(defaultScheduleResult);
    vi.mocked(useSheetValue).mockImplementation(() => null);
  });

  function renderSelectedBalance(
    selectedItems: Set<string>,
    account?: AccountEntity,
    balanceValue: number | null = null,
    scheduleConfig: {
      isLoading?: boolean;
      schedules?: readonly Partial<ScheduleEntity>[];
    } = {},
  ) {
    const { isLoading = false, schedules = [] } = scheduleConfig;

    vi.mocked(useCachedSchedules).mockReturnValue({
      isLoading,
      schedules: schedules as readonly ScheduleEntity[],
      statuses: new Map(),
      statusLabels: new Map(),
    });

    vi.mocked(useSheetValue).mockImplementation(((binding: unknown) => {
      if (typeof binding === 'string') {
        return null;
      }
      if (
        typeof binding === 'object' &&
        binding !== null &&
        'name' in binding
      ) {
        if ((binding as { name: string }).name.includes('-sum')) {
          return balanceValue;
        }
      }
      return [];
    }) as typeof useSheetValue);

    return render(
      <TestProvider>
        <SelectedProviderWithItems
          name="transactions"
          items={[]}
          fetchAllIds={() => Promise.resolve([])}
        >
          <SelectedBalance selectedItems={selectedItems} account={account} />
        </SelectedProviderWithItems>
      </TestProvider>,
    );
  }

  test('shows $0 when selected balance is zero', () => {
    renderSelectedBalance(new Set(['transaction-1']), mockAccount, 0);

    expect(screen.getByText('Selected balance:')).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => {
        return (
          element?.textContent === '0.00' ||
          element?.textContent === '0,00' ||
          /^0[.,]00$/.test(element?.textContent || '')
        );
      }),
    ).toBeInTheDocument();
  });

  test('hides when balance is null and no schedule balance', () => {
    const { container } = renderSelectedBalance(
      new Set(['transaction-1']),
      mockAccount,
      null,
    );

    expect(container.firstChild).toBeNull();
  });

  test('hides when balance is undefined and no schedule balance', () => {
    renderSelectedBalance(new Set(['transaction-1']), mockAccount, null);

    expect(screen.queryByText('Selected balance:')).not.toBeInTheDocument();
  });

  test('shows balance when balance is 0 but schedule balance exists', () => {
    const schedules: readonly Partial<ScheduleEntity>[] = [
      {
        id: 'schedule-1',
        _amount: 1000,
        _amountOp: 'is',
        _account: mockAccount.id,
      },
    ];

    vi.mocked(useCachedSchedules).mockReturnValue({
      isLoading: false,
      schedules: schedules as readonly ScheduleEntity[],
      statuses: new Map(),
      statusLabels: new Map(),
    });

    vi.mocked(useSheetValue).mockImplementation(((binding: unknown) => {
      if (typeof binding === 'string') {
        return null;
      }
      if (
        typeof binding === 'object' &&
        binding !== null &&
        'name' in binding
      ) {
        if ((binding as { name: string }).name.includes('-sum')) {
          return 0;
        }
      }
      return [];
    }) as typeof useSheetValue);

    render(
      <TestProvider>
        <SelectedProviderWithItems
          name="transactions"
          items={[]}
          fetchAllIds={() => Promise.resolve([])}
        >
          <SelectedBalance
            selectedItems={new Set(['preview/schedule-1'])}
            account={mockAccount}
          />
        </SelectedProviderWithItems>
      </TestProvider>,
    );

    expect(screen.getByText('Selected balance:')).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => {
        return (
          element?.textContent === '10.00' ||
          element?.textContent === '10,00' ||
          /^10[.,]00$/.test(element?.textContent || '')
        );
      }),
    ).toBeInTheDocument();
  });

  test('shows balance when balance is non-zero positive', () => {
    renderSelectedBalance(new Set(['transaction-1']), mockAccount, 5000);

    expect(screen.getByText('Selected balance:')).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => {
        return (
          element?.textContent === '50.00' ||
          element?.textContent === '50,00' ||
          /^50[.,]00$/.test(element?.textContent || '')
        );
      }),
    ).toBeInTheDocument();
  });

  test('shows balance when balance is non-zero negative', () => {
    renderSelectedBalance(new Set(['transaction-1']), mockAccount, -3000);

    expect(screen.getByText('Selected balance:')).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => {
        const text = element?.textContent || '';
        return (
          text === '-30.00' || text === '-30,00' || /^-30[.,]00$/.test(text)
        );
      }),
    ).toBeInTheDocument();
  });

  test('shows schedule balance when balance is null but schedule balance exists', () => {
    const schedules: readonly Partial<ScheduleEntity>[] = [
      {
        id: 'schedule-1',
        _amount: 2000,
        _amountOp: 'is',
        _account: mockAccount.id,
      },
    ];

    vi.mocked(useCachedSchedules).mockReturnValue({
      isLoading: false,
      schedules: schedules as readonly ScheduleEntity[],
      statuses: new Map(),
      statusLabels: new Map(),
    });

    vi.mocked(useSheetValue).mockImplementation(((binding: unknown) => {
      if (typeof binding === 'string') {
        return null;
      }
      if (
        typeof binding === 'object' &&
        binding !== null &&
        'name' in binding
      ) {
        if ((binding as { name: string }).name.includes('-sum')) {
          return null;
        }
      }
      return [];
    }) as typeof useSheetValue);

    render(
      <TestProvider>
        <SelectedProviderWithItems
          name="transactions"
          items={[]}
          fetchAllIds={() => Promise.resolve([])}
        >
          <SelectedBalance
            selectedItems={new Set(['preview/schedule-1'])}
            account={mockAccount}
          />
        </SelectedProviderWithItems>
      </TestProvider>,
    );

    expect(screen.getByText('Selected balance:')).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => {
        return (
          element?.textContent === '20.00' ||
          element?.textContent === '20,00' ||
          /^20[.,]00$/.test(element?.textContent || '')
        );
      }),
    ).toBeInTheDocument();
  });

  test('hides when schedules are loading', () => {
    renderSelectedBalance(new Set(['transaction-1']), mockAccount, 0, {
      isLoading: true,
    });

    expect(screen.queryByText('Selected balance:')).not.toBeInTheDocument();
  });
});
