import React from 'react';
import { RefreshControl } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import debounce from 'debounce';
import memoizeOne from 'memoize-one';
import { connectActionSheet } from '@expo/react-native-action-sheet';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import * as actions from 'loot-core/src/client/actions';
import { AccountDetails } from 'loot-design/src/components/mobile/account';
import FocusAwareStatusBar from 'loot-design/src/components/mobile/FocusAwareStatusBar';
import * as queries from 'loot-core/src/client/queries';
import { pagedQuery } from 'loot-core/src/client/query-helpers';

import {
  getSplit,
  ungroupTransactions
} from 'loot-core/src/shared/transactions';
import SyncRefresh from '../SyncRefresh';
import {
  SchedulesProvider,
  useCachedSchedules
} from 'loot-core/src/client/data-hooks/schedules';
import { isPreviewId } from 'loot-design/src/components/mobile/transaction';

const getSchedulesTransform = memoizeOne((id, hasSearch) => {
  let filter = queries.getAccountFilter(id, '_account');

  // Never show schedules on these pages
  if (hasSearch) {
    filter = { id: null };
  }

  return q => {
    q = q.filter({ $and: [filter, { '_account.closed': false }] });
    return q.orderBy({ next_date: 'desc' });
  };
});

function PreviewTransactions({ accountId, children }) {
  let scheduleData = useCachedSchedules();

  if (scheduleData == null) {
    return children(null);
  }

  let schedules = scheduleData.schedules.filter(
    s =>
      !s.completed &&
      ['due', 'upcoming', 'missed'].includes(scheduleData.statuses.get(s.id))
  );

  return children(
    schedules.map(schedule => ({
      id: 'preview/' + schedule.id,
      payee: schedule._payee,
      account: schedule._account,
      amount: schedule._amount,
      date: schedule.next_date,
      notes: scheduleData.statuses.get(schedule.id),
      schedule: schedule.id
    }))
  );
}

class Account extends React.Component {
  state = { transactions: [], filter: '' };

  async componentDidMount() {
    this.unlisten = listen('sync-event', ({ type, tables }) => {
      if (type === 'applied') {
        if (
          tables.includes('transactions') ||
          tables.includes('category_mapping') ||
          tables.includes('payee_mapping')
        ) {
          this.paged && this.paged.run();
        }

        if (tables.includes('payees') || tables.includes('payee_mapping')) {
          this.props.getPayees();
        }
      }
    });

    if (this.props.categories.length === 0) {
      await this.props.getCategories();
    }
    if (this.props.accounts.length === 0) {
      await this.props.getAccounts();
    }

    await this.props.initiallyLoadPayees();
    await this.fetchTransactions();

    const { id } = this.props.route.params || {};
    const account = this.props.accounts.find(acct => acct.id === id);
    this.props.navigation.setParams({ title: account.name });
    this.props.markAccountRead(id);
  }

  componentWillUnmount() {
    this.unlisten();
  }

  isNewTransaction = id => {
    return this.props.newTransactions.includes(id);
  };

  onSearch = async text => {
    this.paged.unsubscribe();
    this.setState({ filter: text }, this.onSearchDone);
  };

  onSearchDone = debounce(() => {
    if (this.state.filter === '') {
      this.updateQuery(this.currentQuery);
    } else {
      this.updateQuery(
        queries.makeTransactionSearchQuery(
          this.currentQuery,
          this.state.filter,
          this.props.dateFormat
        )
      );
    }
  }, 150);

  fetchTransactions = async () => {
    let query = this.makeRootQuery();
    this.rootQuery = this.currentQuery = query;
    this.updateQuery(query);
  };

  makeRootQuery = () => {
    const { id } = this.props.route.params || {};
    return queries.makeTransactionsQuery(id);
  };

  updateQuery(query) {
    if (this.paged) {
      this.paged.unsubscribe();
    }

    this.paged = pagedQuery(
      query.options({ splits: 'grouped' }).select('*'),
      data => {
        this.setState({ transactions: data });
      },
      { pageCount: 150, mapper: ungroupTransactions }
    );
  }

  onSelectTransaction = transaction => {
    const { transactions } = this.state;

    if (isPreviewId(transaction.id)) {
      let parts = transaction.id.split('/');
      let scheduleId = parts[1];

      let options = ['Post transaction', 'Skip scheduled date', 'Cancel'];
      let cancelButtonIndex = 2;

      this.props.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex
        },
        buttonIndex => {
          switch (buttonIndex) {
            case 0:
              // Post
              send('schedule/post-transaction', { id: scheduleId });
              break;
            case 1:
              // Skip
              send('schedule/skip-next-date', { id: scheduleId });
              break;
            default:
          }
        }
      );
    } else {
      let trans = [transaction];
      if (transaction.parent_id || transaction.is_parent) {
        let index = transactions.findIndex(
          t => t.id === (transaction.parent_id || transaction.id)
        );
        trans = getSplit(transactions, index);
      }

      this.props.navigation.navigate('Transaction', {
        transactions: trans
      });
    }
  };

  onRefresh = async () => {
    const { id } = this.props.route.params || {};
    await this.props.syncAndDownload();
  };

  render() {
    let { categories, accounts, payees, prefs } = this.props;
    let { transactions, filter } = this.state;
    let { id } = this.props.route.params || {};
    let account = accounts.find(acct => acct.id === id);
    let balance = queries.accountBalance(account);
    let numberFormat = prefs.numberFormat || 'comma-dot';

    return (
      <SyncRefresh onSync={this.onRefresh}>
        {({ refreshing, onRefresh }) => (
          <SchedulesProvider
            transform={getSchedulesTransform(id, filter !== '')}
          >
            <FocusAwareStatusBar barStyle="dark-content" animated={true} />
            <PreviewTransactions accountId={this.props.accountId}>
              {prependTransactions =>
                prependTransactions == null ? null : (
                  <AccountDetails
                    // This key forces the whole table rerender when the number
                    // format changes
                    key={numberFormat}
                    account={account}
                    accounts={accounts}
                    categories={categories}
                    payees={payees}
                    transactions={transactions}
                    prependTransactions={prependTransactions || []}
                    balance={balance}
                    isNewTransaction={this.isNewTransaction}
                    refreshControl={
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                      />
                    }
                    onLoadMore={() => this.paged && this.paged.fetchNext()}
                    onSearch={this.onSearch}
                    onSelectTransaction={this.onSelectTransaction}
                  />
                )
              }
            </PreviewTransactions>
          </SchedulesProvider>
        )}
      </SyncRefresh>
    );
  }
}

export default connect(
  state => ({
    accounts: state.queries.accounts,
    payees: state.queries.payees,
    newTransactions: state.queries.newTransactions,
    categories: state.queries.categories.list,
    prefs: state.prefs.local,
    dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy'
  }),
  dispatch => bindActionCreators(actions, dispatch)
)(connectActionSheet(Account));
