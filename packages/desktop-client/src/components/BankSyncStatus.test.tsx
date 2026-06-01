import type { AccountEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { BankSyncStatus } from './BankSyncStatus';

const useAccounts = vi.fn();

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => useAccounts(),
}));

function makeAccount(overrides: Partial<AccountEntity> = {}): AccountEntity {
  return {
    id: 'acct-1',
    name: 'Checking',
    offbudget: 0,
    closed: 0,
    sort_order: 0,
    last_reconciled: null,
    tombstone: 0,
    account_id: null,
    bank: null,
    bankName: null,
    bankId: null,
    mask: null,
    official_name: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: null,
    last_sync: null,
    bank_sync_status: null,
    ...overrides,
  };
}

describe('BankSyncStatus', () => {
  it('shows and clears the banner based on persisted bank_sync_status transitions', () => {
    useAccounts.mockReturnValue({
      data: [
        makeAccount({ id: 'pending-1', bank_sync_status: 'sync-requested' }),
        makeAccount({ id: 'ok-1', bank_sync_status: 'ok' }),
      ],
    });

    const { rerender } = render(<BankSyncStatus />, { wrapper: TestProviders });

    expect(
      screen.getByText(/Syncing\.\.\. 1 account remaining/i),
    ).toBeInTheDocument();

    useAccounts.mockReturnValue({
      data: [
        makeAccount({ bank_sync_status: 'ok' }),
        makeAccount({ id: 'failed-1', bank_sync_status: 'reauth-required' }),
      ],
    });

    rerender(<BankSyncStatus />);

    expect(
      screen.queryByText(/Syncing\.\.\. 1 account remaining/i),
    ).not.toBeInTheDocument();
  });
});
