import { createElement, createRef } from 'react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router';

import { send } from '@actual-app/core/platform/client/connection';
import type {
  AccountEntity,
  CategoryEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TableHandleRef } from '#components/table';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { TestProviders } from '#mocks';
import { pushModal } from '#modals/modalsSlice';

import { TransactionList } from './TransactionList';

// const AnyTransactionList = TransactionList as unknown;

// Keep mocks defined before importing the SUT so vitest can hoist them.
vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: vi.fn().mockReturnValue([undefined, vi.fn()]),
}));
vi.mock('#hooks/useGlobalPref', () => ({
  useGlobalPref: vi.fn(),
}));
vi.mock('#modals/modalsSlice', () => ({
  pushModal: vi.fn().mockReturnValue({ type: 'pushModal' }),
}));
vi.mock('#notifications/notificationsSlice', () => ({
  addNotification: vi.fn().mockReturnValue({ type: 'addNotification' }),
}));
vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
}));

// Mock TransactionsTable so we can trigger onAdd callbacks easily. Don't use
// require in the factory to avoid lint complaints; rely on vitest hoisting.
vi.mock('./TransactionsTable', () => ({
  TransactionTable: (props: { onAdd?: (items: unknown[]) => void }) => {
    if (props.onAdd) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const trans = {
        id: 'temp-1',
        date: futureDate.toISOString().slice(0, 10),
        is_child: false,
      };
      props.onAdd([trans]);
    }
    return createElement('div', null, 'MockTable');
  },
}));

const noop = vi.fn();

const baseProps: ComponentProps<typeof TransactionList> = {
  account: {} as AccountEntity,
  tableRef: createRef<TableHandleRef<TransactionEntity> | null>(),
  transactions: [],
  allTransactions: [],
  loadMoreTransactions: noop,
  accounts: [],
  category: {} as CategoryEntity,
  categoryGroups: [],
  payees: [],
  balances: {},
  showBalances: false,
  showReconciled: false,
  showCleared: false,
  showAccount: false,
  isAdding: false,
  isNew: () => false,
  isMatched: () => false,
  isFiltered: false,
  allowReorder: true,
  showSelection: false,
  dateFormat: 'MM/dd/yyyy',
  hideFraction: false,
  renderEmpty: null,
  onSort: noop,
  sortField: 'date',
  ascDesc: 'desc',
  onChange: noop,
  onRefetch: noop,
  onCloseAddTransaction: noop,
  onCreatePayee: noop,
  onApplyFilter: noop,
  onBatchDelete: noop,
  onBatchDuplicate: noop,
  onBatchLinkSchedule: noop,
  onBatchUnlinkSchedule: noop,
  onCreateRule: noop,
  onScheduleAction: noop,
  onMakeAsNonSplitTransactions: noop,
};

describe('TransactionList - convert to schedule prompt respect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure synced prefs have sensible defaults for the test environment
    (
      vi.mocked(useSyncedPref) as unknown as {
        mockReturnValue: (v: unknown) => void;
      }
    ).mockReturnValue([undefined, vi.fn()]);
  });

  it('does not show the convert-to-schedule modal when global pref is false and saves transaction', async () => {
    (
      vi.mocked(useGlobalPref) as unknown as {
        mockReturnValue: (v: unknown) => void;
      }
    ).mockReturnValue([false, vi.fn()]);

    const sendMock = vi.mocked(send) as unknown as {
      mockResolvedValue: (v: unknown) => void;
    };
    sendMock.mockResolvedValue(undefined);

    const onRefetch = vi.fn();

    render(
      <TestProviders>
        <MemoryRouter>
          <TransactionList {...baseProps} onRefetch={onRefetch} />
        </MemoryRouter>
      </TestProviders>,
    );

    await waitFor(() => {
      expect(pushModal).not.toHaveBeenCalled();
    });

    expect(sendMock).toHaveBeenCalledWith(
      'transactions-batch-update',
      expect.any(Object),
    );
    expect(sendMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/schedule\/create/),
    );
  });

  it('shows the convert-to-schedule modal when global pref is true', async () => {
    (
      vi.mocked(useGlobalPref) as unknown as {
        mockReturnValue: (v: unknown) => void;
      }
    ).mockReturnValue([true, vi.fn()]);

    const sendMock = vi.mocked(send) as unknown as {
      mockResolvedValue: (v: unknown) => void;
    };
    sendMock.mockResolvedValue(undefined);

    render(
      <TestProviders>
        <MemoryRouter>
          <TransactionList {...baseProps} onRefetch={vi.fn()} />
        </MemoryRouter>
      </TestProviders>,
    );

    await waitFor(() => {
      expect(pushModal).toHaveBeenCalled();
    });

    // When modal is shown, the transaction should not be immediately saved
    expect(sendMock).not.toHaveBeenCalledWith(
      'transactions-batch-update',
      expect.any(Object),
    );
  });
});
