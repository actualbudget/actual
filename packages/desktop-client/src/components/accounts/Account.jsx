import React, { PureComponent, createRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, useParams, useLocation, useMatch } from 'react-router-dom';

import { debounce } from 'debounce';
import { bindActionCreators } from 'redux';

import { validForTransfer } from 'loot-core/client/transfer';
import * as actions from 'loot-core/src/client/actions';
import { useFilters } from 'loot-core/src/client/data-hooks/filters';
import { SchedulesProvider } from 'loot-core/src/client/data-hooks/schedules';
import * as queries from 'loot-core/src/client/queries';
import { runQuery, pagedQuery } from 'loot-core/src/client/query-helpers';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import { currentDay } from 'loot-core/src/shared/months';
import * as monthUtils from 'loot-core/src/shared/months';
import { q } from 'loot-core/src/shared/query';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import {
  deleteTransaction,
  updateTransaction,
  realizeTempTransactions,
  ungroupTransaction,
  ungroupTransactions,
} from 'loot-core/src/shared/transactions';
import { applyChanges, groupById } from 'loot-core/src/shared/util';

import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useFailedAccounts } from '../../hooks/useFailedAccounts';
import { useLocalPref } from '../../hooks/useLocalPref';
import { usePayees } from '../../hooks/usePayees';
import { usePreviewTransactions } from '../../hooks/usePreviewTransactions';
import { SelectedProviderWithItems } from '../../hooks/useSelected';
import {
  SplitsExpandedProvider,
  useSplitsExpanded,
} from '../../hooks/useSplitsExpanded';
import { styles, theme } from '../../style';
import { Button } from '../common/Button';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { TransactionList } from '../transactions/TransactionList';

import { AccountHeader } from './Header';

function EmptyMessage({ onAdd }) {
  return (
    <View
      style={{
        color: theme.tableText,
        backgroundColor: theme.tableBackground,
        flex: 1,
        alignItems: 'center',
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      <View
        style={{
          width: 550,
          marginTop: 75,
          fontSize: 15,
          alignItems: 'center',
        }}
      >
        <Text style={{ textAlign: 'center', lineHeight: '1.4em' }}>
          For Actual to be useful, you need to <strong>add an account</strong>.
          You can link an account to automatically download transactions, or
          manage it locally yourself.
        </Text>

        <Button type="primary" style={{ marginTop: 20 }} onClick={onAdd}>
          Add account
        </Button>

        <View
          style={{ marginTop: 20, fontSize: 13, color: theme.tableTextLight }}
        >
          In the future, you can add accounts from the sidebar.
        </View>
      </View>
    </View>
  );
}

function AllTransactions({
  account = {},
  transactions,
  balances,
  showBalances,
  filtered,
  children,
}) {
  const accountId = account.id;
  const prependTransactions = usePreviewTransactions().map(trans => ({
    ...trans,
    _inverse: accountId ? accountId !== trans.account : false,
  }));

  transactions ??= [];

  let runningBalance = useMemo(() => {
    if (!showBalances) {
      return 0;
    }

    return balances && transactions?.length > 0
      ? balances[transactions[0].id]?.balance ?? 0
      : 0;
  }, [showBalances, balances, transactions]);

  const prependBalances = useMemo(() => {
    if (!showBalances) {
      return null;
    }

    // Reverse so we can calculate from earliest upcoming schedule.
    const scheduledBalances = [...prependTransactions]
      .reverse()
      .map(scheduledTransaction => {
        const amount =
          (scheduledTransaction._inverse ? -1 : 1) *
          getScheduledAmount(scheduledTransaction.amount);
        return {
          balance: (runningBalance += amount),
          id: scheduledTransaction.id,
        };
      });
    return groupById(scheduledBalances);
  }, [showBalances, prependTransactions, runningBalance]);

  const allTransactions = useMemo(() => {
    // Don't prepend scheduled transactions if we are filtering
    if (!filtered && prependTransactions.length > 0) {
      return prependTransactions.concat(transactions);
    }
    return transactions;
  }, [filtered, prependTransactions, transactions]);

  const allBalances = useMemo(() => {
    // Don't prepend scheduled transactions if we are filtering
    if (!filtered && prependBalances && balances) {
      return { ...prependBalances, ...balances };
    }
    return balances;
  }, [filtered, prependBalances, balances]);

  if (!prependTransactions) {
    return children(transactions, balances);
  }
  return children(allTransactions, allBalances);
}

function getField(field) {
  switch (field) {
    case 'account':
      return 'account.name';
    case 'payee':
      return 'payee.name';
    case 'category':
      return 'category.name';
    case 'payment':
      return 'amount';
    case 'deposit':
      return 'amount';
    default:
      return field;
  }
}

class AccountInternal extends PureComponent {
  constructor(props) {
    super(props);
    this.paged = null;
    this.table = createRef();
    this.animated = true;

    this.state = {
      search: '',
      filters: props.conditions || [],
      loading: true,
      workingHard: false,
      reconcileAmount: null,
      transactions: [],
      transactionsCount: 0,
      showBalances: props.showBalances,
      balances: null,
      showCleared: props.showCleared,
      showReconciled: props.showReconciled,
      editingName: false,
      isAdding: false,
      latestDate: null,
      filterId: [],
      conditionsOp: 'and',
      sort: [],
    };
  }

  async componentDidMount() {
    const maybeRefetch = tables => {
      if (
        tables.includes('transactions') ||
        tables.includes('category_mapping') ||
        tables.includes('payee_mapping')
      ) {
        return this.refetchTransactions();
      }
    };

    const onUndo = async ({ tables, messages }) => {
      await maybeRefetch(tables);

      // If all the messages are dealing with transactions, find the
      // first message referencing a non-deleted row so that we can
      // highlight the row
      //
      let focusId;
      if (
        messages.every(msg => msg.dataset === 'transactions') &&
        !messages.find(msg => msg.column === 'tombstone')
      ) {
        const focusableMsgs = messages.filter(
          msg =>
            msg.dataset === 'transactions' && !(msg.column === 'tombstone'),
        );

        focusId = focusableMsgs.length === 1 ? focusableMsgs[0].row : null;

        // Highlight the transactions
        // this.table && this.table.highlight(focusableMsgs.map(msg => msg.row));
      }

      if (this.table.current) {
        this.table.current.edit(null);

        // Focus a transaction if applicable. There is a chance if the
        // user navigated away that focusId is a transaction that has
        // been "paged off" and we won't focus it. That's ok, we just
        // do our best.
        if (focusId) {
          this.table.current.scrollTo(focusId);
        }
      }

      this.props.setLastUndoState(null);
    };

    const unlistens = [listen('undo-event', onUndo)];

    this.unlisten = () => {
      unlistens.forEach(unlisten => unlisten());
    };

    // Important that any async work happens last so that the
    // listeners are set up synchronously
    await this.props.initiallyLoadPayees();
    await this.fetchTransactions(this.state.filters);

    // If there is a pending undo, apply it immediately (this happens
    // when an undo changes the location to this page)
    if (this.props.lastUndoState && this.props.lastUndoState.current) {
      onUndo(this.props.lastUndoState.current);
    }
  }

  componentDidUpdate(prevProps) {
    // If the active account changes - close the transaction entry mode
    if (this.state.isAdding && this.props.accountId !== prevProps.accountId) {
      this.setState({ isAdding: false });
    }

    // If the user was on a different screen and is now coming back to
    // the transactions, automatically refresh the transaction to make
    // sure we have updated state
    if (prevProps.modalShowing && !this.props.modalShowing) {
      // This is clearly a hack. Need a better way to track which
      // things are listening to transactions and refetch
      // automatically (use ActualQL?)
      setTimeout(() => {
        this.refetchTransactions();
      }, 100);
    }

    //Resest sort/filter/search on account change
    if (this.props.accountId !== prevProps.accountId) {
      this.setState({ sort: [], search: '', filters: [] });
    }
  }

  componentWillUnmount() {
    if (this.unlisten) {
      this.unlisten();
    }
    if (this.paged) {
      this.paged.unsubscribe();
    }
  }

  fetchAllIds = async () => {
    const { data } = await runQuery(this.paged.getQuery().select('id'));
    // Remember, this is the `grouped` split type so we need to deal
    // with the `subtransactions` property
    return data.reduce((arr, t) => {
      arr.push(t.id);
      t.subtransactions.forEach(sub => arr.push(sub.id));
      return arr;
    }, []);
  };

  refetchTransactions = async () => {
    this.paged?.run();
  };

  fetchTransactions = filters => {
    const query = this.makeRootQuery();
    this.rootQuery = this.currentQuery = query;
    if (filters) this.applyFilters(filters);
    else this.updateQuery(query);

    if (this.props.accountId) {
      this.props.markAccountRead(this.props.accountId);
    }
  };

  makeRootQuery = () => {
    const accountId = this.props.accountId;

    return queries.makeTransactionsQuery(accountId);
  };

  updateQuery(query, isFiltered) {
    if (this.paged) {
      this.paged.unsubscribe();
    }

    // Filter out reconciled transactions if necessary.
    if (!this.state.showReconciled) {
      query = query.filter({ reconciled: { $eq: false } });
    }

    this.paged = pagedQuery(
      query.select('*'),
      async (data, prevData) => {
        const firstLoad = prevData == null;

        if (firstLoad) {
          this.table.current?.setRowAnimation(false);

          if (isFiltered) {
            this.props.splitsExpandedDispatch({
              type: 'set-mode',
              mode: 'collapse',
            });
          } else {
            this.props.splitsExpandedDispatch({
              type: 'set-mode',
              mode: this.props.expandSplits ? 'expand' : 'collapse',
            });
          }
        }

        this.setState(
          {
            transactions: data,
            transactionCount: this.paged.getTotalCount(),
            transactionsFiltered: isFiltered,
            loading: false,
            workingHard: false,
            balances: this.state.showBalances
              ? await this.calculateBalances()
              : null,
          },
          () => {
            if (firstLoad) {
              this.table.current?.scrollToTop();
            }

            setTimeout(() => {
              this.table.current?.setRowAnimation(true);
            }, 0);
          },
        );
      },
      {
        pageCount: 150,
        onlySync: true,
        mapper: ungroupTransactions,
      },
    );
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (this.props.accountId !== nextProps.accountId) {
      this.setState(
        {
          editingName: false,
          loading: true,
          search: '',
          showBalances: nextProps.showBalances,
          balances: null,
          showCleared: nextProps.showCleared,
          showReconciled: nextProps.showReconciled,
          reconcileAmount: null,
        },
        () => {
          this.fetchTransactions();
        },
      );
    }
  }

  onSearch = value => {
    this.paged.unsubscribe();
    this.setState({ search: value }, this.onSearchDone);
  };

  onSearchDone = debounce(() => {
    if (this.state.search === '') {
      this.updateQuery(this.currentQuery, this.state.filters.length > 0);
    } else {
      this.updateQuery(
        queries.makeTransactionSearchQuery(
          this.currentQuery,
          this.state.search,
          this.props.dateFormat,
        ),
        true,
      );
    }
  }, 150);

  onSync = async () => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(acct => acct.id === accountId);

    await this.props.syncAndDownload(account ? account.id : undefined);
  };

  onImport = async () => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(acct => acct.id === accountId);
    const categories = await this.props.getCategories();

    if (account) {
      const res = await window.Actual?.openFileDialog({
        filters: [
          {
            name: 'Financial Files',
            extensions: ['qif', 'ofx', 'qfx', 'csv', 'tsv', 'xml'],
          },
        ],
      });

      if (res) {
        this.props.pushModal('import-transactions', {
          accountId,
          categories,
          filename: res[0],
          onImported: didChange => {
            if (didChange) {
              this.fetchTransactions();
            }
          },
        });
      }
    }
  };

  onExport = async accountName => {
    const exportedTransactions = await send('transactions-export-query', {
      query: this.currentQuery.serialize(),
    });
    const normalizedName =
      accountName && accountName.replace(/[()]/g, '').replace(/\s+/g, '-');
    const filename = `${normalizedName || 'transactions'}.csv`;

    window.Actual?.saveFile(
      exportedTransactions,
      filename,
      'Export Transactions',
    );
  };

  onTransactionsChange = (newTransaction, data) => {
    // Apply changes to pagedQuery data
    this.paged.optimisticUpdate(
      data => {
        if (newTransaction._deleted) {
          return data.filter(t => t.id !== newTransaction.id);
        } else {
          return data.map(t => {
            return t.id === newTransaction.id ? newTransaction : t;
          });
        }
      },
      () => {
        return data;
      },
    );

    this.props.updateNewTransactions(newTransaction.id);
  };

  canCalculateBalance = () => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(
      account => account.id === accountId,
    );
    return (
      account &&
      this.state.search === '' &&
      this.state.filters.length === 0 &&
      (this.state.sort.length === 0 ||
        (this.state.sort.field === 'date' &&
          this.state.sort.ascDesc === 'desc'))
    );
  };

  async calculateBalances() {
    if (!this.canCalculateBalance()) {
      return null;
    }

    const { data } = await runQuery(
      this.paged
        .getQuery()
        .options({ splits: 'none' })
        .select([{ balance: { $sumOver: '$amount' } }]),
    );

    return groupById(data);
  }

  onAddTransaction = () => {
    this.setState({ isAdding: true });
  };

  onExposeName = flag => {
    this.setState({ editingName: flag });
  };

  onSaveName = name => {
    if (name.trim().length) {
      const accountId = this.props.accountId;
      const account = this.props.accounts.find(
        account => account.id === accountId,
      );
      this.props.updateAccount({ ...account, name });
      this.setState({ editingName: false });
    }
  };

  onToggleExtraBalances = () => {
    const { accountId, showExtraBalances } = this.props;
    const key = 'show-extra-balances-' + accountId || 'all-accounts';

    this.props.savePrefs({ [key]: !showExtraBalances });
  };

  onMenuSelect = async item => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(
      account => account.id === accountId,
    );

    switch (item) {
      case 'link':
        this.props.pushModal('add-account', {
          upgradingAccountId: accountId,
        });
        break;
      case 'unlink':
        this.props.pushModal('confirm-unlink-account', {
          accountName: account.name,
          onUnlink: () => {
            this.props.unlinkAccount(accountId);
          },
        });
        break;
      case 'close':
        this.props.openAccountCloseModal(accountId);
        break;
      case 'reopen':
        this.props.reopenAccount(accountId);
        break;
      case 'export':
        const accountName = this.getAccountTitle(account, accountId);
        this.onExport(accountName);
        break;
      case 'toggle-balance':
        if (this.state.showBalances) {
          this.props.savePrefs({ ['show-balances-' + accountId]: false });
          this.setState({ showBalances: false, balances: null });
        } else {
          this.props.savePrefs({ ['show-balances-' + accountId]: true });
          this.setState(
            {
              transactions: [],
              transactionCount: 0,
              filters: [],
              search: '',
              sort: [],
              showBalances: true,
            },
            () => {
              this.fetchTransactions();
            },
          );
        }
        break;
      case 'remove-sorting': {
        this.setState({ sort: [] }, () => {
          const filters = this.state.filters;
          if (filters.length > 0) {
            this.applyFilters([...filters]);
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
          this.props.savePrefs({ ['hide-cleared-' + accountId]: true });
          this.setState({ showCleared: false });
        } else {
          this.props.savePrefs({ ['hide-cleared-' + accountId]: false });
          this.setState({ showCleared: true });
        }
        break;
      case 'toggle-reconciled':
        if (this.state.showReconciled) {
          this.props.savePrefs({ ['hide-reconciled-' + accountId]: true });
          this.setState({ showReconciled: false }, () =>
            this.fetchTransactions(this.state.filters),
          );
        } else {
          this.props.savePrefs({ ['hide-reconciled-' + accountId]: false });
          this.setState({ showReconciled: true }, () =>
            this.fetchTransactions(this.state.filters),
          );
        }
        break;
      default:
    }
  };

  getAccountTitle(account, id) {
    const { filterName } = this.props.location.state || {};

    if (filterName) {
      return filterName;
    }

    if (!account) {
      if (id === 'budgeted') {
        return 'Budgeted Accounts';
      } else if (id === 'offbudget') {
        return 'Off Budget Accounts';
      } else if (id === 'uncategorized') {
        return 'Uncategorized';
      } else if (!id) {
        return 'All Accounts';
      }
      return null;
    }

    return account.name;
  }

  getBalanceQuery(account, id) {
    return {
      name: `balance-query-${id}`,
      query: this.makeRootQuery().calculate({ $sum: '$amount' }),
    };
  }

  isNew = id => {
    return this.props.newTransactions.includes(id);
  };

  isMatched = id => {
    return this.props.matchedTransactions.includes(id);
  };

  onCreatePayee = name => {
    const trimmed = name.trim();
    if (trimmed !== '') {
      return this.props.createPayee(name);
    }
    return null;
  };

  lockTransactions = async () => {
    this.setState({ workingHard: true });

    const { accountId } = this.props;

    const { data } = await runQuery(
      q('transactions')
        .filter({ cleared: true, reconciled: false, account: accountId })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    let transactions = ungroupTransactions(data);

    const changes = { updated: [] };

    transactions.forEach(trans => {
      const { diff } = updateTransaction(transactions, {
        ...trans,
        reconciled: true,
      });

      transactions = applyChanges(diff, transactions);

      changes.updated = changes.updated
        ? changes.updated.concat(diff.updated)
        : diff.updated;
    });

    await send('transactions-batch-update', changes);
    await this.refetchTransactions();
  };

  onReconcile = async balance => {
    this.setState(({ showCleared }) => ({
      reconcileAmount: balance,
      showCleared: true,
      prevShowCleared: showCleared,
    }));
  };

  onDoneReconciling = async () => {
    const { accountId } = this.props;
    const { reconcileAmount } = this.state;

    const { data } = await runQuery(
      q('transactions')
        .filter({ cleared: true, account: accountId })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    const transactions = ungroupTransactions(data);

    let cleared = 0;

    transactions.forEach(trans => {
      if (!trans.is_parent) {
        cleared += trans.amount;
      }
    });

    const targetDiff = reconcileAmount - cleared;

    if (targetDiff === 0) {
      await this.lockTransactions();
    }

    this.setState({
      reconcileAmount: null,
      showCleared: this.state.prevShowCleared,
    });
  };

  onCreateReconciliationTransaction = async diff => {
    // Create a new reconciliation transaction
    const reconciliationTransactions = realizeTempTransactions([
      {
        id: 'temp',
        account: this.props.accountId,
        cleared: true,
        reconciled: false,
        amount: diff,
        date: currentDay(),
        notes: 'Reconciliation balance adjustment',
      },
    ]);

    // Optimistic UI: update the transaction list before sending the data to the database
    this.setState({
      transactions: [...reconciliationTransactions, ...this.state.transactions],
    });

    // sync the reconciliation transaction
    await send('transactions-batch-update', {
      added: reconciliationTransactions,
    });
    await this.refetchTransactions();
  };

  onShowTransactions = async ids => {
    this.onApplyFilter({
      customName: 'Selected transactions',
      filter: { id: { $oneof: ids } },
    });
  };

  onBatchEdit = async (name, ids) => {
    const { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    const transactions = ungroupTransactions(data);

    const onChange = async (name, value, mode) => {
      let transactionsToChange = transactions;

      const newValue = value === null ? '' : value;
      this.setState({ workingHard: true });

      const changes = { deleted: [], updated: [] };

      // Cleared is a special case right now
      if (name === 'cleared') {
        // Clear them if any are uncleared, otherwise unclear them
        value = !!transactionsToChange.find(t => !t.cleared);
      }

      const idSet = new Set(ids);

      transactionsToChange.forEach(trans => {
        if (name === 'cleared' && trans.reconciled) {
          // Skip transactions that are reconciled. Don't want to set them as
          // uncleared.
          return;
        }

        if (!idSet.has(trans.id)) {
          // Skip transactions which aren't actually selected, since the query
          // above also retrieves the siblings & parent of any selected splits.
          return;
        }

        if (name === 'notes') {
          if (mode === 'prepend') {
            value =
              trans.notes === null ? newValue : newValue + ' ' + trans.notes;
          } else if (mode === 'append') {
            value =
              trans.notes === null ? newValue : trans.notes + ' ' + newValue;
          } else if (mode === 'replace') {
            value = newValue;
          }
        }
        const transaction = {
          ...trans,
          [name]: value,
        };

        if (name === 'account' && trans.account !== value) {
          transaction.reconciled = false;
        }

        const { diff } = updateTransaction(transactionsToChange, transaction);

        // TODO: We need to keep an updated list of transactions so
        // the logic in `updateTransaction`, particularly about
        // updating split transactions, works. This isn't ideal and we
        // should figure something else out
        transactionsToChange = applyChanges(diff, transactionsToChange);

        changes.deleted = changes.deleted
          ? changes.deleted.concat(diff.deleted)
          : diff.deleted;
        changes.updated = changes.updated
          ? changes.updated.concat(diff.updated)
          : diff.updated;
        changes.added = changes.added
          ? changes.added.concat(diff.added)
          : diff.added;
      });

      await send('transactions-batch-update', changes);
      await this.refetchTransactions();

      if (this.table.current) {
        this.table.current.edit(transactionsToChange[0].id, 'select', false);
      }
    };

    const pushPayeeAutocompleteModal = () => {
      this.props.pushModal('payee-autocomplete', {
        onSelect: payeeId => onChange(name, payeeId),
      });
    };

    const pushAccountAutocompleteModal = () => {
      this.props.pushModal('account-autocomplete', {
        onSelect: accountId => onChange(name, accountId),
      });
    };

    const pushCategoryAutocompleteModal = () => {
      // Only show balances when all selected transaction are in the same month.
      const transactionMonth = transactions[0]?.date
        ? monthUtils.monthFromDate(transactions[0]?.date)
        : null;
      const transactionsHaveSameMonth =
        transactionMonth &&
        transactions.every(
          t => monthUtils.monthFromDate(t.date) === transactionMonth,
        );
      this.props.pushModal('category-autocomplete', {
        month: transactionsHaveSameMonth ? transactionMonth : undefined,
        onSelect: categoryId => onChange(name, categoryId),
      });
    };

    if (
      name === 'amount' ||
      name === 'payee' ||
      name === 'account' ||
      name === 'date'
    ) {
      const reconciledTransactions = transactions.filter(t => t.reconciled);
      if (reconciledTransactions.length > 0) {
        this.props.pushModal('confirm-transaction-edit', {
          onConfirm: () => {
            if (name === 'payee') {
              pushPayeeAutocompleteModal();
            } else if (name === 'account') {
              pushAccountAutocompleteModal();
            } else {
              this.props.pushModal('edit-field', { name, onSubmit: onChange });
            }
          },
          confirmReason: 'batchEditWithReconciled',
        });
        return;
      }
    }

    if (name === 'cleared') {
      // Cleared just toggles it on/off and it depends on the data
      // loaded. Need to clean this up in the future.
      onChange('cleared', null);
    } else if (name === 'category') {
      pushCategoryAutocompleteModal();
    } else if (name === 'payee') {
      pushPayeeAutocompleteModal();
    } else if (name === 'account') {
      pushAccountAutocompleteModal();
    } else {
      this.props.pushModal('edit-field', { name, onSubmit: onChange });
    }
  };

  onBatchDuplicate = async ids => {
    const onConfirmDuplicate = async ids => {
      this.setState({ workingHard: true });

      const { data } = await runQuery(
        q('transactions')
          .filter({ id: { $oneof: ids } })
          .select('*')
          .options({ splits: 'grouped' }),
      );

      const changes = {
        added: data
          .reduce((newTransactions, trans) => {
            return newTransactions.concat(
              realizeTempTransactions(ungroupTransaction(trans)),
            );
          }, [])
          .map(({ sort_order, ...trans }) => ({ ...trans })),
      };

      await send('transactions-batch-update', changes);

      await this.refetchTransactions();
    };

    await this.checkForReconciledTransactions(
      ids,
      'batchDuplicateWithReconciled',
      onConfirmDuplicate,
    );
  };

  onBatchDelete = async ids => {
    const onConfirmDelete = async ids => {
      this.setState({ workingHard: true });

      const { data } = await runQuery(
        q('transactions')
          .filter({ id: { $oneof: ids } })
          .select('*')
          .options({ splits: 'grouped' }),
      );
      let transactions = ungroupTransactions(data);

      const idSet = new Set(ids);
      const changes = { deleted: [], updated: [] };

      transactions.forEach(trans => {
        const parentId = trans.parent_id;

        // First, check if we're actually deleting this transaction by
        // checking `idSet`. Then, we don't need to do anything if it's
        // a child transaction and the parent is already being deleted
        if (!idSet.has(trans.id) || (parentId && idSet.has(parentId))) {
          return;
        }

        const { diff } = deleteTransaction(transactions, trans.id);

        // TODO: We need to keep an updated list of transactions so
        // the logic in `updateTransaction`, particularly about
        // updating split transactions, works. This isn't ideal and we
        // should figure something else out
        transactions = applyChanges(diff, transactions);

        changes.deleted = diff.deleted
          ? changes.deleted.concat(diff.deleted)
          : diff.deleted;
        changes.updated = diff.updated
          ? changes.updated.concat(diff.updated)
          : diff.updated;
      });

      await send('transactions-batch-update', changes);
      await this.refetchTransactions();
    };

    await this.checkForReconciledTransactions(
      ids,
      'batchDeleteWithReconciled',
      onConfirmDelete,
    );
  };

  checkForReconciledTransactions = async (ids, confirmReason, onConfirm) => {
    const { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids }, reconciled: true })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    const transactions = ungroupTransactions(data);
    if (transactions.length > 0) {
      this.props.pushModal('confirm-transaction-edit', {
        onConfirm: () => {
          onConfirm(ids);
        },
        confirmReason,
      });
    } else {
      onConfirm(ids);
    }
  };

  onBatchUnlink = async ids => {
    await send('transactions-batch-update', {
      updated: ids.map(id => ({ id, schedule: null })),
    });

    await this.refetchTransactions();
  };

  onCreateRule = async ids => {
    const { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
    );

    const transactions = ungroupTransactions(data);
    const ruleTransaction = transactions[0];
    const childTransactions = transactions.filter(
      t => t.parent_id === ruleTransaction.id,
    );

    const payeeCondition = ruleTransaction.imported_payee
      ? {
          field: 'imported_payee',
          op: 'is',
          value: ruleTransaction.imported_payee,
          type: 'string',
        }
      : {
          field: 'payee',
          op: 'is',
          value: ruleTransaction.payee,
          type: 'id',
        };

    const rule = {
      stage: null,
      conditionsOp: 'and',
      conditions: [payeeCondition],
      actions: [
        ...(childTransactions.length === 0
          ? [
              {
                op: 'set',
                field: 'category',
                value: ruleTransaction.category,
                type: 'id',
                options: {
                  splitIndex: 0,
                },
              },
            ]
          : []),
        ...childTransactions.flatMap((sub, index) => [
          {
            op: 'set-split-amount',
            value: sub.amount,
            options: {
              splitIndex: index + 1,
              method: 'fixed-amount',
            },
          },
          {
            op: 'set',
            field: 'category',
            value: sub.category,
            type: 'id',
            options: {
              splitIndex: index + 1,
            },
          },
        ]),
      ],
    };

    this.props.pushModal('edit-rule', { rule });
  };

  onSetTransfer = async ids => {
    const onConfirmTransfer = async ids => {
      this.setState({ workingHard: true });

      const payees = await this.props.getPayees();
      const { data: transactions } = await runQuery(
        q('transactions')
          .filter({ id: { $oneof: ids } })
          .select('*'),
      );
      const [fromTrans, toTrans] = transactions;

      if (transactions.length === 2 && validForTransfer(fromTrans, toTrans)) {
        const fromPayee = payees.find(
          p => p.transfer_acct === fromTrans.account,
        );
        const toPayee = payees.find(p => p.transfer_acct === toTrans.account);

        const changes = {
          updated: [
            {
              ...fromTrans,
              payee: toPayee.id,
              transfer_id: toTrans.id,
            },
            {
              ...toTrans,
              payee: fromPayee.id,
              transfer_id: fromTrans.id,
            },
          ],
        };

        await send('transactions-batch-update', changes);
      }

      await this.refetchTransactions();
    };

    await this.checkForReconciledTransactions(
      ids,
      'batchEditWithReconciled',
      onConfirmTransfer,
    );
  };

  onCondOpChange = (value, filters) => {
    this.setState({ conditionsOp: value });
    this.setState({ filterId: { ...this.state.filterId, status: 'changed' } });
    this.applyFilters([...filters]);
    if (this.state.search !== '') {
      this.onSearch(this.state.search);
    }
  };

  onReloadSavedFilter = (savedFilter, item) => {
    if (item === 'reload') {
      const [getFilter] = this.props.filtersList.filter(
        f => f.id === this.state.filterId.id,
      );
      this.setState({ conditionsOp: getFilter.conditionsOp });
      this.applyFilters([...getFilter.conditions]);
    } else {
      if (savedFilter.status) {
        this.setState({ conditionsOp: savedFilter.conditionsOp });
        this.applyFilters([...savedFilter.conditions]);
      }
    }
    this.setState({ filterId: { ...this.state.filterId, ...savedFilter } });
  };

  onClearFilters = () => {
    this.setState({ conditionsOp: 'and' });
    this.setState({ filterId: [] });
    this.applyFilters([]);
    if (this.state.search !== '') {
      this.onSearch(this.state.search);
    }
  };

  onUpdateFilter = (oldFilter, updatedFilter) => {
    this.applyFilters(
      this.state.filters.map(f => (f === oldFilter ? updatedFilter : f)),
    );
    this.setState({
      filterId: {
        ...this.state.filterId,
        status: this.state.filterId && 'changed',
      },
    });
    if (this.state.search !== '') {
      this.onSearch(this.state.search);
    }
  };

  onDeleteFilter = filter => {
    this.applyFilters(this.state.filters.filter(f => f !== filter));
    if (this.state.filters.length === 1) {
      this.setState({ filterId: [] });
      this.setState({ conditionsOp: 'and' });
    } else {
      this.setState({
        filterId: {
          ...this.state.filterId,
          status: this.state.filterId && 'changed',
        },
      });
    }
    if (this.state.search !== '') {
      this.onSearch(this.state.search);
    }
  };

  onApplyFilter = async cond => {
    let filters = this.state.filters;
    if (cond.customName) {
      filters = filters.filter(f => f.customName !== cond.customName);
    }
    if (cond.conditions) {
      this.setState({ filterId: { ...cond, status: 'saved' } });
      this.setState({ conditionsOp: cond.conditionsOp });
      this.applyFilters([...cond.conditions]);
    } else {
      this.setState({
        filterId: {
          ...this.state.filterId,
          status: this.state.filterId && 'changed',
        },
      });
      this.applyFilters([...filters, cond]);
    }
    if (this.state.search !== '') {
      this.onSearch(this.state.search);
    }
  };

  onScheduleAction = async (name, ids) => {
    switch (name) {
      case 'post-transaction':
        for (const id of ids) {
          const parts = id.split('/');
          await send('schedule/post-transaction', { id: parts[1] });
        }
        this.refetchTransactions();
        break;
      case 'skip':
        for (const id of ids) {
          const parts = id.split('/');
          await send('schedule/skip-next-date', { id: parts[1] });
        }
        break;
      default:
    }
  };

  applyFilters = async conditions => {
    if (conditions.length > 0) {
      const customFilters = conditions
        .filter(cond => !!cond.customName)
        .map(f => f.filter);
      const { filters } = await send('make-filters-from-conditions', {
        conditions: conditions.filter(cond => !cond.customName),
      });
      const conditionsOpKey = this.state.conditionsOp === 'or' ? '$or' : '$and';
      this.currentQuery = this.rootQuery.filter({
        [conditionsOpKey]: [...filters, ...customFilters],
      });

      this.setState({ filters: conditions }, () => {
        this.updateQuery(this.currentQuery, true);
      });
    } else {
      this.setState(
        {
          transactions: [],
          transactionCount: 0,
          filters: conditions,
        },
        () => {
          this.fetchTransactions();
        },
      );
    }

    if (this.state.sort.length !== 0) {
      this.applySort();
    }
  };

  applySort = (field, ascDesc, prevField, prevAscDesc) => {
    const filters = this.state.filters;
    const isFiltered = filters.length > 0;
    const sortField = getField(!field ? this.state.sort.field : field);
    const sortAscDesc = !ascDesc ? this.state.sort.ascDesc : ascDesc;
    const sortPrevField = getField(
      !prevField ? this.state.sort.prevField : prevField,
    );
    const sortPrevAscDesc = !prevField
      ? this.state.sort.prevAscDesc
      : prevAscDesc;

    const sortCurrentQuery = function (that, sortField, sortAscDesc) {
      if (sortField === 'cleared') {
        that.currentQuery = that.currentQuery.orderBy({
          reconciled: sortAscDesc,
        });
      }

      that.currentQuery = that.currentQuery.orderBy({
        [sortField]: sortAscDesc,
      });
    };

    const sortRootQuery = function (that, sortField, sortAscDesc) {
      if (sortField === 'cleared') {
        that.currentQuery = that.rootQuery.orderBy({
          reconciled: sortAscDesc,
        });
        that.currentQuery = that.currentQuery.orderBy({
          cleared: sortAscDesc,
        });
      } else {
        that.currentQuery = that.rootQuery.orderBy({
          [sortField]: sortAscDesc,
        });
      }
    };

    // sort by previously used sort field, if any
    const maybeSortByPreviousField = function (
      that,
      sortPrevField,
      sortPrevAscDesc,
    ) {
      if (!sortPrevField) {
        return;
      }

      if (sortPrevField === 'cleared') {
        that.currentQuery = that.currentQuery.orderBy({
          reconciled: sortPrevAscDesc,
        });
      }

      that.currentQuery = that.currentQuery.orderBy({
        [sortPrevField]: sortPrevAscDesc,
      });
    };

    switch (true) {
      // called by applyFilters to sort an already filtered result
      case !field:
        sortCurrentQuery(this, sortField, sortAscDesc);
        break;

      // called directly from UI by sorting a column.
      // active filters need to be applied before sorting
      case isFiltered:
        this.applyFilters([...filters]);
        sortCurrentQuery(this, sortField, sortAscDesc);
        break;

      // called directly from UI by sorting a column.
      // no active filters, start a new root query.
      case !isFiltered:
        sortRootQuery(this, sortField, sortAscDesc);
        break;

      default:
    }

    maybeSortByPreviousField(this, sortPrevField, sortPrevAscDesc);
    this.updateQuery(this.currentQuery, isFiltered);
  };

  onSort = (headerClicked, ascDesc) => {
    let prevField;
    let prevAscDesc;
    //if staying on same column but switching asc/desc
    //then keep prev the same
    if (headerClicked === this.state.sort.field) {
      prevField = this.state.sort.prevField;
      prevAscDesc = this.state.sort.prevAscDesc;
      this.setState({
        sort: {
          ...this.state.sort,
          ascDesc,
        },
      });
    } else {
      //if switching to new column then capture state
      //of current sort column as prev
      prevField = this.state.sort.field;
      prevAscDesc = this.state.sort.ascDesc;
      this.setState({
        sort: {
          field: headerClicked,
          ascDesc,
          prevField: this.state.sort.field,
          prevAscDesc: this.state.sort.ascDesc,
        },
      });
    }

    this.applySort(headerClicked, ascDesc, prevField, prevAscDesc);
    if (this.state.search !== '') {
      this.onSearch(this.state.search);
    }
  };

  render() {
    const {
      accounts,
      categoryGroups,
      payees,
      dateFormat,
      hideFraction,
      addNotification,
      accountsSyncing,
      failedAccounts,
      pushModal,
      replaceModal,
      showExtraBalances,
      accountId,
      categoryId,
    } = this.props;
    const {
      transactions,
      loading,
      workingHard,
      filterId,
      reconcileAmount,
      transactionsFiltered,
      editingName,
      showBalances,
      balances,
      showCleared,
      showReconciled,
    } = this.state;

    const account = accounts.find(account => account.id === accountId);
    const accountName = this.getAccountTitle(account, accountId);

    if (!accountName && !loading) {
      // This is probably an account that was deleted, so redirect to
      // all accounts
      return <Navigate to="/accounts" replace />;
    }

    const category = categoryGroups
      .flatMap(g => g.categories)
      .find(category => category.id === categoryId);

    const showEmptyMessage = !loading && !accountId && accounts.length === 0;

    const isNameEditable =
      accountId &&
      accountId !== 'budgeted' &&
      accountId !== 'offbudget' &&
      accountId !== 'uncategorized';

    const balanceQuery = this.getBalanceQuery(account, accountId);

    return (
      <AllTransactions
        account={account}
        transactions={transactions}
        balances={balances}
        showBalances={showBalances}
        filtered={transactionsFiltered}
      >
        {(allTransactions, allBalances) => (
          <SelectedProviderWithItems
            name="transactions"
            items={allTransactions}
            fetchAllIds={this.fetchAllIds}
            registerDispatch={dispatch => (this.dispatchSelected = dispatch)}
            selectAllFilter={item => !item._unmatched && !item.is_parent}
          >
            <View style={styles.page}>
              <AccountHeader
                tableRef={this.table}
                editingName={editingName}
                isNameEditable={isNameEditable}
                workingHard={workingHard}
                account={account}
                filterId={filterId}
                filtersList={this.props.filtersList}
                location={this.props.location}
                accountName={accountName}
                accountsSyncing={accountsSyncing}
                failedAccounts={failedAccounts}
                accounts={accounts}
                transactions={transactions}
                showBalances={showBalances}
                showExtraBalances={showExtraBalances}
                showCleared={showCleared}
                showReconciled={showReconciled}
                showEmptyMessage={showEmptyMessage}
                balanceQuery={balanceQuery}
                canCalculateBalance={this.canCalculateBalance}
                isSorted={this.state.sort.length !== 0}
                reconcileAmount={reconcileAmount}
                search={this.state.search}
                filters={this.state.filters}
                conditionsOp={this.state.conditionsOp}
                savePrefs={this.props.savePrefs}
                pushModal={this.props.pushModal}
                onSearch={this.onSearch}
                onShowTransactions={this.onShowTransactions}
                onMenuSelect={this.onMenuSelect}
                onAddTransaction={this.onAddTransaction}
                onToggleExtraBalances={this.onToggleExtraBalances}
                onSaveName={this.onSaveName}
                onExposeName={this.onExposeName}
                onReconcile={this.onReconcile}
                onDoneReconciling={this.onDoneReconciling}
                onCreateReconciliationTransaction={
                  this.onCreateReconciliationTransaction
                }
                onSync={this.onSync}
                onImport={this.onImport}
                onBatchDelete={this.onBatchDelete}
                onBatchDuplicate={this.onBatchDuplicate}
                onBatchEdit={this.onBatchEdit}
                onBatchUnlink={this.onBatchUnlink}
                onCreateRule={this.onCreateRule}
                onUpdateFilter={this.onUpdateFilter}
                onClearFilters={this.onClearFilters}
                onReloadSavedFilter={this.onReloadSavedFilter}
                onCondOpChange={this.onCondOpChange}
                onDeleteFilter={this.onDeleteFilter}
                onApplyFilter={this.onApplyFilter}
                onScheduleAction={this.onScheduleAction}
                onSetTransfer={this.onSetTransfer}
              />

              <View style={{ flex: 1 }}>
                <TransactionList
                  tableRef={this.table}
                  account={account}
                  transactions={transactions}
                  allTransactions={allTransactions}
                  animated={this.animated}
                  loadMoreTransactions={() =>
                    this.paged && this.paged.fetchNext()
                  }
                  accounts={accounts}
                  category={category}
                  categoryGroups={categoryGroups}
                  payees={payees}
                  balances={allBalances}
                  showBalances={!!allBalances}
                  showCleared={showCleared}
                  showAccount={
                    !accountId ||
                    accountId === 'offbudget' ||
                    accountId === 'budgeted' ||
                    accountId === 'uncategorized'
                  }
                  isAdding={this.state.isAdding}
                  isNew={this.isNew}
                  isMatched={this.isMatched}
                  isFiltered={
                    this.state.search !== '' || this.state.filters.length > 0
                  }
                  dateFormat={dateFormat}
                  hideFraction={hideFraction}
                  addNotification={addNotification}
                  renderEmpty={() =>
                    showEmptyMessage ? (
                      <EmptyMessage onAdd={() => replaceModal('add-account')} />
                    ) : !loading ? (
                      <View
                        style={{
                          color: theme.tableText,
                          marginTop: 20,
                          textAlign: 'center',
                          fontStyle: 'italic',
                        }}
                      >
                        No transactions
                      </View>
                    ) : null
                  }
                  pushModal={pushModal}
                  onSort={this.onSort}
                  sortField={this.state.sort.field}
                  ascDesc={this.state.sort.ascDesc}
                  onChange={this.onTransactionsChange}
                  onRefetch={this.refetchTransactions}
                  onRefetchUpToRow={row =>
                    this.paged.refetchUpToRow(row, {
                      field: 'date',
                      order: 'desc',
                    })
                  }
                  onCloseAddTransaction={() =>
                    this.setState({ isAdding: false })
                  }
                  onCreatePayee={this.onCreatePayee}
                />
              </View>
            </View>
          </SelectedProviderWithItems>
        )}
      </AllTransactions>
    );
  }
}

function AccountHack(props) {
  const { dispatch: splitsExpandedDispatch } = useSplitsExpanded();
  const match = useMatch(props.location.pathname);

  return (
    <AccountInternal
      {...props}
      match={match}
      splitsExpandedDispatch={splitsExpandedDispatch}
    />
  );
}

export function Account() {
  const params = useParams();
  const location = useLocation();

  const { grouped: categoryGroups } = useCategories();
  const newTransactions = useSelector(state => state.queries.newTransactions);
  const matchedTransactions = useSelector(
    state => state.queries.matchedTransactions,
  );
  const accounts = useAccounts();
  const payees = usePayees();
  const failedAccounts = useFailedAccounts();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [hideFraction = false] = useLocalPref('hideFraction');
  const [expandSplits] = useLocalPref('expand-splits');
  const [showBalances] = useLocalPref(`show-balances-${params.id}`);
  const [hideCleared] = useLocalPref(`hide-cleared-${params.id}`);
  const [hideReconciled] = useLocalPref(`hide-reconciled-${params.id}`);
  const [showExtraBalances] = useLocalPref(
    `show-extra-balances-${params.id || 'all-accounts'}`,
  );
  const modalShowing = useSelector(state => state.modals.modalStack.length > 0);
  const accountsSyncing = useSelector(state => state.account.accountsSyncing);
  const lastUndoState = useSelector(state => state.app.lastUndoState);
  const conditions =
    location.state && location.state.conditions
      ? location.state.conditions
      : [];

  const state = {
    newTransactions,
    matchedTransactions,
    accounts,
    failedAccounts,
    dateFormat,
    hideFraction,
    expandSplits,
    showBalances,
    showCleared: !hideCleared,
    showReconciled: !hideReconciled,
    showExtraBalances,
    payees,
    modalShowing,
    accountsSyncing,
    lastUndoState,
    conditions,
  };

  const dispatch = useDispatch();
  const filtersList = useFilters();
  const actionCreators = useMemo(
    () => bindActionCreators(actions, dispatch),
    [dispatch],
  );

  const transform = useMemo(() => {
    const filterByAccount = queries.getAccountFilter(params.id, '_account');
    const filterByPayee = queries.getAccountFilter(
      params.id,
      '_payee.transfer_acct',
    );

    return q => {
      q = q.filter({
        $and: [{ '_account.closed': false }],
      });
      if (params.id) {
        if (params.id === 'uncategorized') {
          q = q.filter({ next_date: null });
        } else {
          q = q.filter({
            $or: [filterByAccount, filterByPayee],
          });
        }
      }
      return q.orderBy({ next_date: 'desc' });
    };
  }, [params.id]);

  return (
    <SchedulesProvider transform={transform}>
      <SplitsExpandedProvider
        initialMode={state.expandSplits ? 'collapse' : 'expand'}
      >
        <AccountHack
          {...state}
          categoryGroups={categoryGroups}
          {...actionCreators}
          modalShowing={state.modalShowing}
          accountId={params.id}
          categoryId={location?.state?.categoryId}
          location={location}
          filtersList={filtersList}
        />
      </SplitsExpandedProvider>
    </SchedulesProvider>
  );
}
