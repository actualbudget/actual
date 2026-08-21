import React from 'react';

import type { ScheduleEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';
import type { Mock } from 'vitest';

import { useCachedSchedules } from '#hooks/useCachedSchedules';
import { useSelectedItems } from '#hooks/useSelected';
import { useSheetValue } from '#hooks/useSheetValue';
import { TestProviders } from '#mocks';

import { SelectedBalance } from './Balance';

vi.mock('#hooks/useSelected', () => ({
  useSelectedItems: vi.fn(),
}));

vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: vi.fn(),
}));

vi.mock('#hooks/useCachedSchedules', () => ({
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

function mockedSchedules(schedules: ScheduleEntity[]) {
  return {
    isLoading: false,
    schedules,
    statuses: new Map(),
    statusLabels: new Map(),
  };
}

describe('SelectedBalance – normal transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCachedSchedules).mockReturnValue(mockedSchedules([]));
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

  test('shows balance when balance is falsy', () => {
    vi.mocked(useSheetValue).mockReturnValueOnce(null).mockReturnValueOnce(0);

    render(
      <TestProviders>
        <SelectedBalance selectedItems={new Set(['tx-123'])} />
      </TestProviders>,
    );

    expect(screen.getByText('Selected balance:')).toBeInTheDocument();
  });
});

describe('SelectedBalance – split transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCachedSchedules).mockReturnValue(mockedSchedules([]));
  });

  // The rows query returns objects while the sum query returns a number, which
  // the typed overload can't express in a single mock.
  const mockSheetValues = vi.mocked(useSheetValue) as unknown as Mock;

  function summedIds() {
    // The second useSheetValue call is the one that sums the amounts.
    const binding = vi.mocked(useSheetValue).mock.calls[1][0];
    if (typeof binding === 'string' || !binding.query) {
      throw new Error('expected the balance binding to carry a query');
    }
    const [filter] = binding.query.serialize().filterExpressions as Array<{
      id: { $oneof: string[] };
    }>;
    return filter.id.$oneof;
  }

  test('sums only the selected children when a parent is partially selected', () => {
    mockSheetValues
      .mockReturnValueOnce([{ id: 'child-1', parent_id: 'parent-1' }])
      .mockReturnValueOnce(-5951);

    render(
      <TestProviders>
        <SelectedBalance selectedItems={new Set(['parent-1', 'child-1'])} />
      </TestProviders>,
    );

    // The parent is dropped, so the unselected sibling is not counted.
    expect(summedIds()).toEqual(['child-1']);
  });

  test('sums the whole split when only the parent is selected', () => {
    mockSheetValues.mockReturnValueOnce([]).mockReturnValueOnce(-7239);

    render(
      <TestProviders>
        <SelectedBalance selectedItems={new Set(['parent-1'])} />
      </TestProviders>,
    );

    expect(summedIds()).toEqual(['parent-1']);
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
    vi.mocked(useCachedSchedules).mockReturnValue(
      mockedSchedules([makeSchedule(scheduleId, -5000, 'account-1')]),
    );

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
    vi.mocked(useCachedSchedules).mockReturnValue(
      mockedSchedules([makeSchedule(scheduleId, -5000, 'account-1')]),
    );

    render(
      <TestProviders>
        <SelectedBalance selectedItems={selectedItems} />
      </TestProviders>,
    );

    expect(screen.getByText('-100.00')).toBeInTheDocument();
  });
});
