import React from 'react';
import { connect } from 'react-redux';
import { View } from 'react-native';
import { bindActionCreators } from 'redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as actions from 'loot-core/src/client/actions';
import * as monthUtils from 'loot-core/src/shared/months';
import FocusAwareStatusBar from 'loot-design/src/components/mobile/FocusAwareStatusBar';
import { TransactionEdit } from 'loot-design/src/components/mobile/transaction';
import ChildEdit from './ChildEdit';
import { send } from 'loot-core/src/platform/client/fetch';
import { getChangedValues, diffItems } from 'loot-core/src/shared/util';
import { colors } from 'loot-design/src/style';

function isTemporary(transaction) {
  return transaction.id.indexOf('temp') === 0;
}

function makeTemporaryTransactions(currentAccountId, lastDate) {
  return [
    {
      id: 'temp',
      date: lastDate || monthUtils.currentDay(),
      account: currentAccountId,
      amount: 0,
      cleared: false
    }
  ];
}

class _Transaction extends React.Component {
  componentDidMount() {
    this.props.getCategories();
    this.props.getAccounts();
  }

  onEdit = async transaction => {
    // Run the rules to auto-fill in any data. Right now we only do
    // this on new transactions because that's how desktop works.
    if (isTemporary(transaction)) {
      let afterRules = await send('rules-run', { transaction });
      let diff = getChangedValues(transaction, afterRules);

      let newTransaction = { ...transaction };
      if (diff) {
        Object.keys(diff).forEach(field => {
          if (newTransaction[field] == null) {
            newTransaction[field] = diff[field];
          }
        });
      }
      return newTransaction;
    }

    return transaction;
  };

  onSave = async newTransactions => {
    const { transactions } = this.props.route.params || {};
    if (this.deleted) {
      return;
    }

    const changes = diffItems(transactions || [], newTransactions);
    if (
      changes.added.length > 0 ||
      changes.updated.length > 0 ||
      changes.deleted.length
    ) {
      const remoteUpdates = await send('transactions-batch-update', {
        added: changes.added,
        deleted: changes.deleted,
        updated: changes.updated
      });

      const { onTransactionsChange: onChange } = this.props.route.params || {};
      if (onChange) {
        onChange({
          ...changes,
          updated: changes.updated.concat(remoteUpdates)
        });
      }
    }

    // If transactions is null, we are adding a new transaction
    if (transactions === null) {
      // The first one is always the "parent" and the only one we care
      // about
      this.props.setLastTransaction(newTransactions[0]);
    }
  };

  onDelete = async () => {
    const { transactions } = this.props.route.params || {};

    // Eagerly go back
    this.props.navigation.goBack(null);

    if (transactions === null) {
      // Adding a new transactions, this disables saving when the component unmounts
      this.deleted = true;
    } else {
      const changes = { deleted: transactions };
      const remoteUpdates = await send('transactions-batch-update', changes);
      const { onTransactionsChange: onChange } = this.props.route.params || {};
      if (onChange) {
        onChange({ ...changes, updated: remoteUpdates });
      }
    }
  };

  render() {
    const {
      categories,
      accounts,
      payees,
      navigation,
      route,
      lastTransaction,
      dateFormat
    } = this.props;
    let { transactions } = this.props.route.params || {};
    let adding = false;

    if (transactions === null) {
      // Create an empty transaction
      transactions = makeTemporaryTransactions(
        (route.params && route.params.accountId) ||
          (lastTransaction && lastTransaction.account) ||
          null,
        lastTransaction && lastTransaction.date
      );
      adding = true;
    }

    if (categories.length === 0 || accounts.length === 0) {
      return null;
    }

    return (
      <View
        style={{
          paddingTop: this.props.insets.top,
          paddingBottom: this.props.insets.bottom,
          flex: 1,
          backgroundColor: colors.p5
        }}
      >
        <FocusAwareStatusBar barStyle="light-content" animated={true} />
        <TransactionEdit
          transactions={transactions}
          adding={adding}
          categories={categories}
          accounts={accounts}
          payees={payees}
          navigation={navigation}
          renderChildEdit={props => <ChildEdit {...props} />}
          dateFormat={dateFormat}
          onTapField={this.onTapField}
          onEdit={this.onEdit}
          onSave={this.onSave}
          onDelete={this.onDelete}
        />
      </View>
    );
  }
}

function Transaction(props) {
  const insets = useSafeAreaInsets();
  return <_Transaction insets={insets} {...props} />;
}

export default connect(
  state => ({
    categories: state.queries.categories.list,
    payees: state.queries.payees,
    lastTransaction: state.queries.lastTransaction,
    accounts: state.queries.accounts,
    dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy'
  }),
  dispatch => bindActionCreators(actions, dispatch)
)(Transaction);
