import React from 'react';

import { render, screen } from '@testing-library/react';

import type { ScheduleEntity } from 'loot-core/types/models';

import { SelectedBalance } from './Balance';

import { useCachedSchedules } from '@desktop-client/hooks/useCachedSchedules';
import { useSelectedItems } from '@desktop-client/hooks/useSelected';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { TestProviders } from '@desktop-client/mocks';

vi.mock('@desktop-client/hooks/useSelected', () => ({
  useSelectedItems: vi.fn(),
}));

vi.mock('@desktop-client/hooks/useSheetValue', () => ({
  useSheetValue: vi.fn(),
}));

vi.mock('@desktop-client/hooks/useCachedSchedules', () => ({
  useCachedSchedules: vi.fn(),
}));

function makeSchedule(
  id: string,
  amount: number,
  accountId: string,
): ScheduleEntity {
  return {
    id,
    rule: 'rule-1',
    next_date: '2026-03-24',
    completed: false,
    posts_transaction: false,
    tombstone: false,
    _payee: 'payee-1',
    _account: accountId,
    _amount: amount,
    _amountOp: 'is',
    _date: '2026-03-24',
    _conditions: [],
    _actions: [],
  } satisfies ScheduleEntity;
}

describe('SelectedBalance – normal transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCachedSchedules).mockReturnValue({
      isLoading: false,
      schedules: [],
    });
  });

  test('shows balance for selected normal transactions', () => {
    vi.mocked(useSheetValue)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(-5000);

    render(
      <TestProviders>
        <SelectedBalance selectedItems={new Set(['tx-123'])} />
      </TestProviders>,
    );

    expect(screen.getByText('Selected balance:')).toBeInTheDocument();
    expect(screen.getByText('-50.00')).toBeInTheDocument();
  });
});

describe('SelectedBalance – preview (scheduled) transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSheetValue).mockReturnValue(null);
  });

  test('includes the schedule amount when a preview transaction is selected', () => {
    const scheduleId = 'schedule-abc';

    vi.mocked(useSelectedItems).mockReturnValue(
      new Set([`preview/${scheduleId}/2026-03-24`]),
    );
    vi.mocked(useCachedSchedules).mockReturnValue({
      isLoading: false,
      schedules: [makeSchedule(scheduleId, -5000, 'account-1')],
    });

    render(
      <TestProviders>
        <SelectedBalance
          selectedItems={new Set([`preview/${scheduleId}/2026-03-24`])}
        />
      </TestProviders>,
    );

    expect(screen.getByText('Selected balance:')).toBeInTheDocument();
  });

  test('counts each selected occurrence of the same schedule independently', () => {
    const scheduleId = 'schedule-abc';
    const previewId1 = `preview/${scheduleId}/2026-03-24`;
    const previewId2 = `preview/${scheduleId}/2026-04-24`;
    const selectedItems = new Set([previewId1, previewId2]);

    vi.mocked(useSelectedItems).mockReturnValue(selectedItems);
    vi.mocked(useCachedSchedules).mockReturnValue({
      isLoading: false,
      schedules: [makeSchedule(scheduleId, -5000, 'account-1')],
    });

    render(
      <TestProviders>
        <SelectedBalance selectedItems={selectedItems} />
      </TestProviders>,
    );

    expect(screen.getByText('-100.00')).toBeInTheDocument();
  });
});
