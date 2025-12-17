import React, {
  PureComponent,
  type RefObject,
  createRef,
  useMemo,
  type ReactElement,
  useEffect,
} from 'react';
import { Trans } from 'react-i18next';
import { Navigate, useParams, useLocation } from 'react-router';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { t } from 'i18next';
import debounce from 'lodash/debounce';
import isEqual from 'lodash/isEqual';
import { v4 as uuidv4 } from 'uuid';

import { send, listen } from 'loot-core/platform/client/fetch';
import * as undo from 'loot-core/platform/client/undo';
import { type UndoState } from 'loot-core/server/undo';
import { currentDay } from 'loot-core/shared/months';
import { q, type Query } from 'loot-core/shared/query';
import {
  updateTransaction,
  realizeTempTransactions,
  ungroupTransaction,
  ungroupTransactions,
  makeChild,
  makeAsNonChildTransactions,
} from 'loot-core/shared/transactions';
import { applyChanges, type IntegerAmount } from 'loot-core/shared/util';
import {
  type NewRuleEntity,
  type RuleActionEntity,
  type AccountEntity,
  type RuleConditionEntity,
  type TransactionEntity,
  type TransactionFilterEntity,
} from 'loot-core/types/models';

import { AccountEmptyMessage } from './AccountEmptyMessage';
import { AccountHeader } from './Header';

import {
  unlinkAccount,
  reopenAccount,
  updateAccount,
  markAccountRead,
} from '@desktop-client/accounts/accountsSlice';
import { syncAndDownload } from '@desktop-client/app/appSlice';
import { type SavedFilter } from '@desktop-client/components/filters/SavedFilterMenuButton';
import { TransactionList } from '@desktop-client/components/transactions/TransactionList';
import { validateAccountName } from '@desktop-client/components/util/accountValidation';
import { useAccountPreviewTransactions } from '@desktop-client/hooks/useAccountPreviewTransactions';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { SchedulesProvider } from '@desktop-client/hooks/useCachedSchedules';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useFailedAccounts } from '@desktop-client/hooks/useFailedAccounts';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { getSchedulesQuery } from '@desktop-client/hooks/useSchedules';
import {
  SelectedProviderWithItems,
  type Actions,
} from '@desktop-client/hooks/useSelected';
import {
  SplitsExpandedProvider,
  useSplitsExpanded,
} from '@desktop-client/hooks/useSplitsExpanded';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useTransactionBatchActions } from '@desktop-client/hooks/useTransactionBatchActions';
import { useTransactionFilters } from '@desktop-client/hooks/useTransactionFilters';
import { calculateRunningBalancesBottomUp } from '@desktop-client/hooks/useTransactions';
import {
  openAccountCloseModal,
  pushModal,
  replaceModal,
} from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { createPayee, getPayees } from '@desktop-client/payees/payeesSlice';
import * as queries from '@desktop-client/queries';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';
import {
  pagedQuery,
  type PagedQuery,
} from '@desktop-client/queries/pagedQuery';
import { useSelector, useDispatch } from '@desktop-client/redux';
import { type AppDispatch } from '@desktop-client/redux/store';
import { updateNewTransactions } from '@desktop-client/transactions/transactionsSlice';

type ConditionEntity = Partial<RuleConditionEntity> | TransactionFilterEntity;

function isTransactionFilterEntity(
  filter: ConditionEntity,
): filter is TransactionFilterEntity {
  return 'id' in filter;
}

function isRuleConditionEntity(
  filter: ConditionEntity,
): filter is RuleConditionEntity {
  return !('id' in filter);
}

type AccountSyncSidebarProps = {
  failedAccounts: { id: string; name: string; error: string }[];
};

type AccountProps = {
  accountId: string;
  showCleared: boolean;
  showReconciled: boolean;
  showBalances: boolean;
  showExtraBalances: boolean;
  accounts: AccountEntity[];
  dateFormat: string | null;
  hideFraction: boolean;
  numberFormat: string;
  filterId?: SavedFilter;
  savedFilters: TransactionFilterEntity[];
  failedAccounts: AccountSyncSidebarProps['failedAccounts'];
  accountsSyncing: string[];
  dispatch: AppDispatch;
  setShowCleared: (show: boolean) => void;
  setShowReconciled: (show: boolean) => void;
  setShowBalances: (show: boolean) => void;
  setShowExtraBalances: (show: boolean) => void;
  prefs: Record<string, unknown>;
};

type AccountState = {
  transactions: TransactionEntity[];
  transactionCount: number;
  filterConditions: RuleConditionEntity[];
  search: string;
  sort: { field: string; direction: 'asc' | 'desc' } | null;
  balances: Map<string, number> | null;
  showBalances: boolean;
  showCleared: boolean;
  showReconciled: boolean;
  showEmptyMessage: boolean;
  reconcileAmount: number | null;
  balanceQuery: string | null;
  isAddingTransaction: boolean;
  lastUndoState: UndoState | null;
};

function isPreviewId(id: string) {
  return id.startsWith('preview/');
}

class Account extends PureComponent<AccountProps, AccountState> {
  paged: PagedQuery<TransactionEntity> | null = null;
  rootQuery: Query | null = null;
  currentQuery: Query | null = null;
  table = createRef<TableRef>();
  dispatchSelected: ((action: Actions) => void) | null = null;
  unlisten?: () => void;

  constructor(props: AccountProps) {
    super(props);

    this.state = {
      transactions: [],
      transactionCount: 0,
      filterConditions: [],
      search: '',
      sort: null,
      balances: null,
      showBalances: props.showBalances,
      showCleared: props.showCleared,
      showReconciled: props.showReconciled,
      showEmptyMessage: false,
      reconcileAmount: null,
      balanceQuery: null,
      isAddingTransaction: false,
      lastUndoState: null,
    };
  }

  onMenuSelect = async (
    item:
      | 'link'
      | 'unlink'
      | 'close'
      | 'reopen'
      | 'export'
      | 'toggle-balance'
      | 'remove-sorting'
      | 'toggle-cleared'
      | 'toggle-reconciled'
      | 'toggle-net-worth-chart',
  ) => {
    const accountId = this.props.accountId!;
    const account = this.props.accounts.find(
      account => account.id === accountId,
    )!;

    switch (item) {
      case 'link':
        this.props.dispatch(
          pushModal({
            modal: {
              name: 'add-account',
              options: {
                upgradingAccountId: accountId,
              },
            },
          }),
        );
        break;
      case 'unlink':
        this.props.dispatch(
          pushModal({
            modal: {
              name: 'confirm-unlink-account',
              options: {
                accountName: account.name,
                isViewBankSyncSettings: false,
                onUnlink: () => {
                  this.props.dispatch(unlinkAccount({ id: accountId }));
                },
              },
            },
          }),
        );
        break;
      case 'close':
        this.props.dispatch(openAccountCloseModal({ accountId }));
        break;
      case 'reopen':
        this.props.dispatch(reopenAccount({ id: accountId }));
        break;
      case 'export':
        const accountName = this.getAccountTitle(account, accountId);
        this.onExport(accountName);
        break;
      case 'toggle-balance':
        if (this.state.showBalances) {
          this.props.setShowBalances(false);
          this.setState({ showBalances: false, balances: null });
        } else {
          this.props.setShowBalances(true);
          // Instead of clearing transactions and refetching, just update the state
          // to show balances and trigger a recalculation of the existing transactions
          this.setState({ showBalances: true }, () => {
            // Force a recalculation of running balances on existing transactions
            this.refetchTransactions();
          });
        }
        break;
      case 'remove-sorting': {
        this.setState({ sort: null }, () => {
          const filterConditions = this.state.filterConditions;
          if (filterConditions.length > 0) {
            this.applyFilters([...filterConditions]);
          } else {
            this.fetchTransactions();
          }
          if (this.state.search !== '') {
            this.onSearch(this.state.search);
          }
        });
        break;
      }
      case 'toggle-cleared':
        if (this.state.showCleared) {
          this.props.setShowCleared(false);
          this.setState({ showCleared: false });
        } else {
          this.props.setShowCleared(true);
          this.setState({ showCleared: true });
        }
        break;
      case 'toggle-reconciled':
        if (this.state.showReconciled) {
          this.props.setShowReconciled(false);
          this.setState({ showReconciled: false }, () =>
            this.fetchTransactions(this.state.filterConditions),
          );
        } else {
          this.props.setShowReconciled(true);
          this.setState({ showReconciled: true }, () =>
            this.fetchTransactions(this.state.filterConditions),
          );
        }
        break;
      case 'toggle-net-worth-chart':
        this.props.dispatch(
          updateAccount({
            id: accountId,
            show_net_worth_chart: !account.show_net_worth_chart,
          }),
        );
        break;
      default:
        throw new Error(`Unrecognized menu option: ${item}`);
    }
  };

  // Note: This is a simplified version of the Account component.
  // The full component would contain many more methods and the render function.
  // For this fix, we're only showing the relevant onMenuSelect method that was changed.

  refetchTransactions = async () => {
    this.paged?.run();
  };

  fetchTransactions = (filterConditions?: ConditionEntity[]) => {
    const query = this.makeRootTransactionsQuery();
    this.rootQuery = this.currentQuery = query;
    if (filterConditions) this.applyFilters(filterConditions);
    else this.updateQuery(query);

    if (this.props.accountId) {
      this.props.dispatch(markAccountRead({ id: this.props.accountId }));
    }
  };

  makeRootTransactionsQuery = () => {
    const accountId = this.props.accountId;

    return queries.transactions(accountId);
  };

  updateQuery(query: Query, isFiltered: boolean = false) {
    if (this.paged) {
      this.paged.unsubscribe();
    }

    // Filter out reconciled transactions if they are hidden
    // and we're not showing balances.
    if (
      !this.state.showReconciled &&
      (!this.state.showBalances || !this.canCalculateBalance())
    ) {
      query = query.filter({ reconciled: { $eq: false } });
    }

    this.paged = pagedQuery(query.select('*'), {
      pageSize: 100,
      mapper: (rows: TransactionEntity[]) => {
        const accountId = this.props.accountId;
        let transactions = rows;

        if (this.state.showBalances && this.canCalculateBalance()) {
          // Calculate running balances
          const balances = calculateRunningBalancesBottomUp(
            transactions,
            accountId!,
          );
          this.setState({ balances });
        }

        return transactions;
      },
      onData: (transactions: TransactionEntity[], 
               count: number, 
               fullCount: number) => {
        const showEmptyMessage = count === 0 && !this.state.isAddingTransaction;
        this.setState({
          transactions,
          transactionCount: count,
          showEmptyMessage,
        });
      },
    });
  }

  canCalculateBalance = () => {
    return (
      this.state.filterConditions.length === 0 &&
      this.state.search === '' &&
      !this.state.sort
    );
  };
}