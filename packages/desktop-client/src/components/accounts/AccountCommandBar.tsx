import React, { useMemo } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import type { AccountEntity } from '@actual-app/core/types/models';

import { useRegisterCommandBarCommands } from '#commandbar/commandBarRegistry';
import type { FilterButtonHandle } from '#components/filters/FiltersMenu';
import { SPECIAL_VIEW_IDS } from '#hooks/useTransactionTableColumns';

type AccountPageMenuAction =
  | 'toggle-net-worth-chart'
  | 'manage-columns'
  | 'toggle-reconciled'
  | 'export'
  | 'close';

export type AccountCommandBarProps = {
  account?: AccountEntity;
  accountId?: string;
  filterButtonRef: RefObject<FilterButtonHandle | null>;
  splitMode: 'collapse' | 'expand';
  showNetWorthChart: boolean;
  showReconciled: boolean;
  onAddTransaction: () => void;
  onImport: () => void;
  onToggleSplits: () => void;
  onMenuSelect: (action: AccountPageMenuAction) => void;
};

export function isEligibleAccountPage(
  accountId: string | undefined,
  account: AccountEntity | undefined,
) {
  return Boolean(
    accountId &&
    account &&
    account.id === accountId &&
    !account.closed &&
    !SPECIAL_VIEW_IDS.includes(accountId),
  );
}

type CommandLabels = {
  addNew: string;
  importTransactions: string;
  filter: string;
  expandSplits: string;
  collapseSplits: string;
  showBalanceChart: string;
  hideBalanceChart: string;
  manageTableColumns: string;
  showReconciledTransactions: string;
  hideReconciledTransactions: string;
  exportTransactions: string;
  closeAccount: string;
};

type AccountCommandBarCommandOptions = Omit<
  AccountCommandBarProps,
  'account' | 'accountId'
> & {
  labels: CommandLabels;
};

export function createAccountCommandBarCommands({
  filterButtonRef,
  splitMode,
  showNetWorthChart,
  showReconciled,
  onAddTransaction,
  onImport,
  onToggleSplits,
  onMenuSelect,
  labels,
}: AccountCommandBarCommandOptions) {
  return [
    {
      id: 'add-new',
      label: labels.addNew,
      execute: onAddTransaction,
    },
    {
      id: 'import',
      label: labels.importTransactions,
      execute: onImport,
    },
    {
      id: 'filter',
      label: labels.filter,
      execute: () => filterButtonRef.current?.open(),
    },
    {
      id: 'toggle-splits',
      label:
        splitMode === 'collapse' ? labels.collapseSplits : labels.expandSplits,
      execute: onToggleSplits,
    },
    {
      id: 'toggle-net-worth-chart',
      label: showNetWorthChart
        ? labels.hideBalanceChart
        : labels.showBalanceChart,
      execute: () => onMenuSelect('toggle-net-worth-chart'),
    },
    {
      id: 'manage-columns',
      label: labels.manageTableColumns,
      execute: () => onMenuSelect('manage-columns'),
    },
    {
      id: 'toggle-reconciled',
      label: showReconciled
        ? labels.hideReconciledTransactions
        : labels.showReconciledTransactions,
      execute: () => onMenuSelect('toggle-reconciled'),
    },
    {
      id: 'export',
      label: labels.exportTransactions,
      execute: () => onMenuSelect('export'),
    },
    {
      id: 'close',
      label: labels.closeAccount,
      destructive: true,
      execute: () => onMenuSelect('close'),
    },
  ];
}

export function AccountCommandBar({
  account,
  accountId,
  ...commandOptions
}: AccountCommandBarProps) {
  if (!accountId || !isEligibleAccountPage(accountId, account)) {
    return null;
  }

  return (
    <EligibleAccountCommandBar accountId={accountId} {...commandOptions} />
  );
}

function EligibleAccountCommandBar({
  accountId,
  ...commandOptions
}: Omit<AccountCommandBarProps, 'account' | 'accountId'> & {
  accountId: string;
}) {
  const { t } = useTranslation();
  const labels = useMemo(
    () => ({
      addNew: t('Add New'),
      importTransactions: t('Import'),
      filter: t('Filter'),
      expandSplits: t('Expand split transactions'),
      collapseSplits: t('Collapse split transactions'),
      showBalanceChart: t('Show balance chart'),
      hideBalanceChart: t('Hide balance chart'),
      manageTableColumns: t('Manage table columns'),
      showReconciledTransactions: t('Show reconciled transactions'),
      hideReconciledTransactions: t('Hide reconciled transactions'),
      exportTransactions: t('Export'),
      closeAccount: t('Close account'),
    }),
    [t],
  );
  const commands = useMemo(
    () => createAccountCommandBarCommands({ ...commandOptions, labels }),
    [commandOptions, labels],
  );

  useRegisterCommandBarCommands(`account-page:${accountId}`, commands);

  return null;
}
