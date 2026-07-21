import React from 'react';

import type { ScheduleEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';

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

// `useSheetValue` is generic over the sheet field, so the mock resolves to the
// numeric balance signature. The child-lookup binding returns rows instead, and
// needs widening before it can be fed to the same mock.
function mockedRows(rows: Array<{ id: string }>) {
  return rows as unknown as number;
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

  function sumBinding() {
    // The second useSheetValue call is the one that sums the amounts.
    return vi.mocked(useSheetValue).mock.calls[1][0] as {
      name: string;
      query: { serializeAsString: () => string };
    };
  }

  test('excludes selected split children from the summed ids', () => {
    vi.mocked(useSheetValue)
      .mockReturnValueOnce(mockedRows([{ id: 'child-1' }, { id: 'child-2' }]))
      .mockReturnValueOnce(-5951);

    render(
      <TestProviders>
        <SelectedBalance
          selectedItems={new Set(['parent-1', 'child-1', 'child-2', 'tx-9'])}
        />
      </TestProviders>,
    );

    expect(sumBinding().query.serializeAsString()).toContain('parent-1');
    expect(sumBinding().query.serializeAsString()).not.toContain('child-1');
    expect(screen.getByText('-59.51')).toBeInTheDocument();
  });

  test('keys the sum on the ids it sums, not on the selection', () => {
    // While the child lookup is still resolving it returns null, and every
    // selected id — parents and children alike — ends up in the sum. That
    // intermediate double-counts the parent, so it must not share a cell
    // name with the resolved sum or its value gets served from the cache.
    vi.mocked(useSheetValue).mockReturnValueOnce(null).mockReturnValueOnce(0);

    const selectedItems = new Set(['parent-1', 'child-1']);
    const { rerender } = render(
      <TestProviders>
        <SelectedBalance selectedItems={selectedItems} />
      </TestProviders>,
    );

    const pendingName = sumBinding().name;

    vi.clearAllMocks();
    vi.mocked(useCachedSchedules).mockReturnValue(mockedSchedules([]));
    vi.mocked(useSheetValue)
      .mockReturnValueOnce(mockedRows([{ id: 'child-1' }]))
      .mockReturnValueOnce(-5951);

    rerender(
      <TestProviders>
        <SelectedBalance selectedItems={selectedItems} />
      </TestProviders>,
    );

    expect(sumBinding().name).not.toBe(pendingName);
    expect(sumBinding().name).toBe('selected-balance-parent-1-sum');
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
