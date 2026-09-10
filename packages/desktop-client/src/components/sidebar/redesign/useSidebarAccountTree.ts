import type {
  AccountEntity,
  AccountGroupEntity,
} from '@actual-app/core/types/models';

import { isAccountFailedSync } from '#accounts/syncStatus';
import { useAccountGroups } from '#hooks/useAccountGroups';
import { useClosedAccounts } from '#hooks/useClosedAccounts';
import { useOffBudgetAccounts } from '#hooks/useOffBudgetAccounts';
import { useOnBudgetAccounts } from '#hooks/useOnBudgetAccounts';

export type GroupBucket = {
  group: AccountGroupEntity | null;
  accounts: AccountEntity[];
  failedCount: number;
};

export type SidebarAccountSide = {
  buckets: GroupBucket[];
  accountCount: number;
  failedCount: number;
};

export type SidebarAccountTree = {
  onBudget: SidebarAccountSide;
  offBudget: SidebarAccountSide;
  closed: AccountEntity[];
};

export function getEffectiveGroupId(
  account: AccountEntity,
  liveGroupIds: ReadonlySet<AccountGroupEntity['id']>,
): AccountGroupEntity['id'] | null {
  return account.account_group_id != null &&
    liveGroupIds.has(account.account_group_id)
    ? account.account_group_id
    : null;
}

export function buildAccountSide(
  accounts: AccountEntity[],
  groups: AccountGroupEntity[],
): SidebarAccountSide {
  const liveGroupIds = new Set(groups.map(group => group.id));
  const buckets: GroupBucket[] = [];

  const ungrouped = accounts.filter(
    account => getEffectiveGroupId(account, liveGroupIds) == null,
  );
  if (ungrouped.length > 0) {
    buckets.push({
      group: null,
      accounts: ungrouped,
      failedCount: ungrouped.filter(isAccountFailedSync).length,
    });
  }

  for (const group of groups) {
    const members = accounts.filter(
      account => account.account_group_id === group.id,
    );
    if (members.length > 0) {
      buckets.push({
        group,
        accounts: members,
        failedCount: members.filter(isAccountFailedSync).length,
      });
    }
  }

  return {
    buckets,
    accountCount: accounts.length,
    failedCount: accounts.filter(isAccountFailedSync).length,
  };
}

export function useSidebarAccountTree(): SidebarAccountTree {
  const { data: groups = [] } = useAccountGroups();
  const { data: onBudgetAccounts = [] } = useOnBudgetAccounts();
  const { data: offBudgetAccounts = [] } = useOffBudgetAccounts();
  const { data: closedAccounts = [] } = useClosedAccounts();

  return {
    onBudget: buildAccountSide(onBudgetAccounts, groups),
    offBudget: buildAccountSide(offBudgetAccounts, groups),
    closed: closedAccounts,
  };
}
