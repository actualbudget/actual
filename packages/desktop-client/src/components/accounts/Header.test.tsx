import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { theme } from '@actual-app/components/theme';
import type { AccountEntity } from '@actual-app/core/types/models';

import { AccountSyncSidebar } from './Header';

function makeAccount(
  bank_sync_status: AccountEntity['bank_sync_status'],
): AccountEntity {
  return {
    id: 'acct-1',
    name: 'Checking',
    offbudget: 0,
    closed: 0,
    sort_order: 0,
    last_reconciled: null,
    tombstone: 0,
    account_id: 'ext-1',
    bank: 'bank-1',
    bankName: 'Test Bank',
    bankId: 'bank-id-1',
    mask: null,
    official_name: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: 'external',
    last_sync: null,
    bank_sync_status,
  };
}

describe('AccountSyncSidebar', () => {
  it('renders pending styles for pending and sync-requested accounts', () => {
    const { rerender, container } = render(
      <AccountSyncSidebar account={makeAccount('pending')} />,
    );

    expect(container.firstChild).toHaveStyle({
      backgroundColor: theme.sidebarItemBackgroundPending,
    });

    rerender(<AccountSyncSidebar account={makeAccount('sync-requested')} />);

    expect(container.firstChild).toHaveStyle({
      backgroundColor: theme.sidebarItemBackgroundPending,
    });
  });

  it('renders failed styles for failed accounts and positive styles for ok accounts', () => {
    const { rerender, container } = render(
      <AccountSyncSidebar account={makeAccount('attention-required')} />,
    );

    expect(container.firstChild).toHaveStyle({
      backgroundColor: theme.sidebarItemBackgroundFailed,
    });

    rerender(<AccountSyncSidebar account={makeAccount('ok')} />);

    expect(container.firstChild).toHaveStyle({
      backgroundColor: theme.sidebarItemBackgroundPositive,
    });
  });
});
