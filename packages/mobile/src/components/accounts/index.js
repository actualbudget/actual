import React from 'react';
import { View, RefreshControl } from 'react-native';
import { connect } from 'react-redux';
import * as actions from 'loot-core/src/client/actions';
import { AccountList } from 'loot-design/src/components/mobile/accounts';
import FocusAwareStatusBar from 'loot-design/src/components/mobile/FocusAwareStatusBar';
import * as queries from 'loot-core/src/client/queries';
import SyncRefresh from '../SyncRefresh';
class Accounts extends React.Component {
  state = { transactions: [] };

  async componentDidMount() {
    if (this.props.categories.length === 0) {
      await this.props.getCategories();
    }

    this.props.getAccounts();
  }

  sync = async () => {
    await this.props.syncAndDownload();
  };

  onSelectAccount = id => {
    const account = this.props.accounts.find(acct => acct.id === id);
    this.props.navigation.navigate('Account', { id, title: account.name });
  };

  onSelectTransaction = transaction => {
    this.props.navigation.navigate('Transaction', { transaction });
  };

  render() {
    let {
      navigation,
      accounts,
      categories,
      payees,
      newTransactions,
      updatedAccounts,
      prefs
    } = this.props;
    let { transactions } = this.state;
    let numberFormat = prefs.numberFormat || 'comma-dot';

    return (
      <View style={{ flex: 1 }}>
        <FocusAwareStatusBar barStyle="light-content" />
        <SyncRefresh onSync={this.sync}>
          {({ refreshing, onRefresh }) => (
            <AccountList
              // This key forces the whole table rerender when the number
              // format changes
              key={numberFormat}
              accounts={accounts.filter(account => !account.closed)}
              categories={categories}
              transactions={transactions || []}
              updatedAccounts={updatedAccounts}
              newTransactions={newTransactions}
              getBalanceQuery={queries.accountBalance}
              getOnBudgetBalance={queries.budgetedAccountBalance}
              getOffBudgetBalance={queries.offbudgetAccountBalance}
              onAddAccount={() => navigation.navigate('AddAccountModal')}
              onSelectAccount={this.onSelectAccount}
              onSelectTransaction={this.onSelectTransaction}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          )}
        </SyncRefresh>
      </View>
    );
  }
}

export default connect(
  state => ({
    accounts: state.queries.accounts,
    newTransactions: state.queries.newTransactions,
    updatedAccounts: state.queries.updatedAccounts,
    categories: state.queries.categories.list,
    prefs: state.prefs.local
  }),
  actions
)(Accounts);
