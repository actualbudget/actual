import React, {
  PureComponent,
  Component,
  forwardRef,
  useEffect,
  useState,
  useRef,
} from 'react';
import { connect } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import { useFocusRing } from '@react-aria/focus';
import { useListBox, useListBoxSection, useOption } from '@react-aria/listbox';
import { mergeProps } from '@react-aria/utils';
import { Item, Section } from '@react-stately/collections';
import { useListState } from '@react-stately/list';
import {
  format as formatDate,
  parse as parseDate,
  parseISO,
  isValid as isValidDate,
} from 'date-fns';
import memoizeOne from 'memoize-one';

import * as actions from 'loot-core/src/client/actions';
import q, { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import {
  ungroupTransactions,
  splitTransaction,
  updateTransaction,
  addSplitTransaction,
  deleteTransaction,
  realizeTempTransactions,
} from 'loot-core/src/shared/transactions';
import {
  titleFirst,
  integerToCurrency,
  integerToAmount,
  amountToInteger,
  getChangedValues,
  diffItems,
  groupById,
} from 'loot-core/src/shared/util';

import SvgAdd from '../../icons/v1/Add';
import SvgTrash from '../../icons/v1/Trash';
import ArrowsSynchronize from '../../icons/v2/ArrowsSynchronize';
import CheckCircle1 from '../../icons/v2/CheckCircle1';
import SvgPencilWriteAlternate from '../../icons/v2/PencilWriteAlternate';
import { styles, colors } from '../../style';
import { Text, TextOneLine, View, Button } from '../common';
import { FocusableAmountInput } from '../mobile/MobileAmountInput';
import {
  FieldLabel,
  TapField,
  InputField,
  BooleanField,
  EDITING_PADDING,
} from '../mobile/MobileForms';

const zIndices = { SECTION_HEADING: 10 };

let getPayeesById = memoizeOne(payees => groupById(payees));
let getAccountsById = memoizeOne(accounts => groupById(accounts));

function isPreviewId(id) {
  return id.indexOf('preview/') !== -1;
}

function getDescriptionPretty(transaction, payee, transferAcct) {
  let { amount } = transaction;

  if (transferAcct) {
    return `Transfer ${amount > 0 ? 'from' : 'to'} ${transferAcct.name}`;
  } else if (payee) {
    return payee.name;
  }

  return '';
}

function serializeTransaction(transaction, dateFormat) {
  let { date, amount } = transaction;
  return {
    ...transaction,
    date: formatDate(parseISO(date), dateFormat),
    amount: integerToAmount(amount || 0),
  };
}

function deserializeTransaction(transaction, originalTransaction, dateFormat) {
  let { amount, date, ...realTransaction } = transaction;

  let dayMonth = monthUtils.getDayMonthRegex(dateFormat);
  if (dayMonth.test(date)) {
    let test = parseDate(
      date,
      monthUtils.getDayMonthFormat(dateFormat),
      new Date(),
    );
    if (isValidDate(test)) {
      date = monthUtils.dayFromDate(test);
    } else {
      date = null;
    }
  } else {
    let test = parseDate(date, dateFormat, new Date());
    // This is a quick sanity check to make sure something invalid
    // like "year 201" was entered
    if (test.getFullYear() > 2000 && isValidDate(test)) {
      date = monthUtils.dayFromDate(test);
    } else {
      date = null;
    }
  }

  if (date == null) {
    date =
      (originalTransaction && originalTransaction.date) ||
      monthUtils.currentDay();
  }

  return { ...realTransaction, date, amount: amountToInteger(amount || 0) };
}

function lookupName(items, id) {
  return items.find(item => item.id === id).name;
}

// TODO: delete if not needed
/* eslint-disable-next-line import/no-unused-modules */
export function DateHeader({ date }) {
  return (
    <ListItem
      style={{
        height: 25,
        backgroundColor: colors.n10,
        borderColor: colors.n9,
        justifyContent: 'center',
      }}
    >
      <Text style={[styles.text, { fontSize: 13, color: colors.n4 }]}>
        {monthUtils.format(date, 'MMMM dd, yyyy')}
      </Text>
    </ListItem>
  );
}

function Status({ status }) {
  let color;

  switch (status) {
    case 'missed':
      color = colors.r3;
      break;
    case 'due':
      color = colors.y3;
      break;
    case 'upcoming':
      color = colors.n4;
      break;
    default:
  }

  return (
    <Text
      style={{
        fontSize: 11,
        color,
        fontStyle: 'italic',
      }}
    >
      {titleFirst(status)}
    </Text>
  );
}

// TOOD: export this
class TransactionEditInner extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      transactions: props.transactions,
      editingChild: null,
    };
  }

  serializeTransactions = memoizeOne(transactions => {
    return transactions.map(t =>
      serializeTransaction(t, this.props.dateFormat),
    );
  });

  componentDidMount() {
    if (this.props.adding) {
      this.amount.focus();
    }
  }

  openChildEdit = child => {
    this.setState({ editingChild: child.id });
  };

  onAdd = () => {
    this.onSave();
  };

  onCancel = () => {
    this.props.navigation.goBack(null);
  };

  onSave = async () => {
    let { transactions } = this.state;

    if (transactions.find(t => t.account == null)) {
      // Ignore transactions if any of them don't have an account
      return;
    }

    // Since we don't own the state, we have to handle the case where
    // the user saves while editing an input. We won't have the
    // updated value so we "apply" a queued change. Maybe there's a
    // better way to do this (lift the state?)
    if (this._queuedChange) {
      let [transaction, name, value] = this._queuedChange;
      transactions = await this.onEdit(transaction, name, value);
    }

    if (this.props.adding) {
      transactions = realizeTempTransactions(transactions);
    }

    this.props.onSave(transactions);
    this.props.navigation(-1);
  };

  onSaveChild = childTransaction => {
    this.setState({ editingChild: null });
  };

  onEdit = async (transaction, name, value) => {
    let { transactions } = this.state;

    let newTransaction = { ...transaction, [name]: value };
    if (this.props.onEdit) {
      newTransaction = await this.props.onEdit(newTransaction);
    }

    let { data: newTransactions } = updateTransaction(
      transactions,
      deserializeTransaction(newTransaction, null, this.props.dateFormat),
    );

    this._queuedChange = null;
    this.setState({ transactions: newTransactions });
    return newTransactions;
  };

  onQueueChange = (transaction, name, value) => {
    // This is an ugly hack to solve the problem that input's blur
    // events are not fired when unmounting. If the user has focused
    // an input and swipes back, it should still save, but because the
    // blur event is not fired we need to manually track the latest
    // change and apply it ourselves when unmounting
    this._queuedChange = [transaction, name, value];
  };

  onClick = (transactionId, name) => {
    let { dateFormat } = this.props;

    this.props.pushModal('edit-field', {
      name,
      onSubmit: (name, value) => {
        let { transactions } = this.state;
        let transaction = transactions.find(t => t.id === transactionId);
        // This is a deficiency of this API, need to fix. It
        // assumes that it receives a serialized transaction,
        // but we only have access to the raw transaction
        this.onEdit(serializeTransaction(transaction, dateFormat), name, value);
      },
    });
  };

  onSplit = () => {
    this.props.navigation.navigate('CategorySelect', {
      title: 'Select the first category',
      onSelect: categoryId => {
        let transactions = this.state.transactions;

        // Split the transaction
        let { data } = splitTransaction(transactions, transactions[0].id);
        data[1].category = categoryId;

        this.setState({ transactions: data }, this.focusSplit);
      },
    });
  };

  onAddSplit = () => {
    this.props.navigation.navigate('CategorySelect', {
      title: 'Select a category',
      onSelect: categoryId => {
        let transactions = this.state.transactions;

        // Split the transaction
        let { data } = addSplitTransaction(transactions, transactions[0].id);
        // Set the initial category
        data[data.length - 1].category = categoryId;

        this.setState({ transactions: data }, this.focusSplit);
      },
    });
  };

  focusSplit = () => {
    if (this.lastChildAmount) {
      this.lastChildAmount.focus();
    }
  };

  onDeleteSplit = transaction => {
    let { transactions } = this.state;
    let { data } = deleteTransaction(transactions, transaction.id);
    this.setState({ transactions: data });
  };

  // TODO: `renderActions` was used to render swipe actions on split transaction
  // rows. It enabled you to swipe, revealing a delete action, and if you swiped
  // all the way it would perform the delete action. The entire swipe was
  // animated. Swipe actions are a native paradigm and we'll need a web-friendly
  // replacement.
  //
  // renderActions = (progress, dragX) => {
  //   const trans = dragX.interpolate({
  //     inputRange: [-101, -100, -50, 0],
  //     outputRange: [-6, -5, -5, 20],
  //   });
  //   return (
  //     <RectButton
  //       onPress={this.close}
  //       style={{
  //         flex: 1,
  //         justifyContent: 'center',
  //         backgroundColor: colors.r4,
  //       }}
  //     >
  //       <Animated.Text
  //         style={{
  //           color: 'white',
  //           textAlign: 'right',
  //           transform: [{ translateX: trans }],
  //         }}
  //       >
  //         Delete
  //       </Animated.Text>
  //     </RectButton>
  //   );
  // };

  render() {
    const {
      adding,
      categories,
      accounts,
      payees,
      renderChildEdit,
      navigation,
      onDelete,
    } = this.props;
    const { editingChild } = this.state;
    const transactions = this.serializeTransactions(
      this.state.transactions || [],
    );
    const [transaction, ...childTransactions] = transactions;
    const { payee: payeeId, category, account: accountId } = transaction;

    // Child transactions should always default to the signage
    // of the parent transaction
    let forcedSign = transaction.amount < 0 ? 'negative' : 'positive';

    let account = getAccountsById(accounts)[accountId];
    let payee = payees && payeeId && getPayeesById(payees)[payeeId];
    let transferAcct =
      payee &&
      payee.transfer_acct &&
      getAccountsById(accounts)[payee.transfer_acct];

    let descriptionPretty = getDescriptionPretty(
      transaction,
      payee,
      transferAcct,
    );

    return (
      // <KeyboardAvoidingView>
      <View
        style={{
          margin: 10,
          marginTop: 3,
          backgroundColor: colors.n11,
          flex: 1,
          borderRadius: 4,

          // This shadow make the card "pop" off of the screen below
          // it
          shadowColor: colors.n3,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 4,
          shadowOpacity: 1,
        }}
      >
        <View
          style={{
            borderRadius: 4,
            overflow: 'hidden',
            flex: 1,
          }}
        >
          <View
            style={{
              borderBottomWidth: 1,
              borderColor: colors.n9,
              backgroundColor: 'white',
              flexDirection: 'row',
              justifyContent: 'center',
              padding: 15,
            }}
          >
            <TextOneLine
              style={[
                styles.header.headerTitleStyle,
                { marginLeft: 30, marginRight: 30 },
              ]}
            >
              {payeeId == null
                ? adding
                  ? 'New Transaction'
                  : 'Transaction'
                : descriptionPretty}
            </TextOneLine>
          </View>

          {/* <ScrollView
            ref={el => (this.scrollView = el)}
            automaticallyAdjustContentInsets={false}
            keyboardShouldPersistTaps="always"
            style={{
              backgroundColor: colors.n11,
              flexGrow: 1,
              overflow: 'hidden',
            }}
            contentContainerStyle={{ flexGrow: 1 }}
          > */}
          <View
            style={{
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <View
              style={{
                alignItems: 'center',
                marginTop: 20,
              }}
            >
              <FieldLabel
                title="Amount"
                flush
                style={{ marginBottom: 0, paddingLeft: 0 }}
              />
              <FocusableAmountInput
                ref={el => (this.amount = el)}
                value={transaction.amount}
                zeroIsNegative={true}
                onBlur={value =>
                  this.onEdit(transaction, 'amount', value.toString())
                }
                onChange={value =>
                  this.onQueueChange(transaction, 'amount', value)
                }
                style={{ transform: [] }}
                focusedStyle={{
                  width: 'auto',
                  padding: '5px',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                  minWidth: 120,
                  transform: [{ translateY: -0.5 }],
                }}
                textStyle={{ fontSize: 30, textAlign: 'center' }}
              />
            </View>

            <FieldLabel title="Payee" flush />
            <TapField
              value={descriptionPretty}
              onClick={() => this.onClick(transaction.id, 'payee')}
            />

            <View>
              <FieldLabel
                title={
                  transaction.is_parent ? 'Categories (split)' : 'Category'
                }
              />
              {!transaction.is_parent ? (
                <TapField
                  value={category ? lookupName(categories, category) : null}
                  disabled={(account && !!account.offbudget) || transferAcct}
                  // TODO: the button to turn this transaction into a split
                  // transaction was on top of the category button in the native
                  // app, on the right-hand side
                  //
                  // On the web this doesn't work well and react gets upset if
                  // nest a button in a button.
                  //
                  // rightContent={
                  //   <Button
                  //     contentStyle={{
                  //       paddingVertical: 4,
                  //       paddingHorizontal: 15,
                  //       margin: 0,
                  //     }}
                  //     onPress={this.onSplit}
                  //   >
                  //     Split
                  //   </Button>
                  // }
                  onClick={() => this.onClick(transaction.id, 'category')}
                />
              ) : (
                <View>
                  {childTransactions.map((child, idx) => {
                    const isLast = idx === childTransactions.length - 1;
                    return (
                      // <Swipeable
                      //   key={child.id}
                      //   renderRightActions={this.renderActions}
                      //   onSwipeableRightOpen={() => this.onDeleteSplit(child)}
                      //   rightThreshold={100}
                      // >
                      <TapField
                        value={
                          child.category
                            ? lookupName(categories, child.category)
                            : null
                        }
                        rightContent={
                          <FocusableAmountInput
                            ref={
                              isLast ? el => (this.lastChildAmount = el) : null
                            }
                            value={child.amount}
                            sign={forcedSign}
                            scrollIntoView={true}
                            buttonProps={{
                              paddingVertical: 5,
                              style: {
                                width: 80,
                                alignItems: 'flex-end',
                              },
                            }}
                            textStyle={{ fontSize: 14 }}
                            onBlur={value =>
                              this.onEdit(child, 'amount', value.toString())
                            }
                          />
                        }
                        style={{ marginTop: idx === 0 ? 0 : -1 }}
                        onTap={() => this.openChildEdit(child)}
                      />
                      // </Swipeable>
                    );
                  })}

                  <View
                    style={{
                      alignItems: 'flex-end',
                      marginRight: EDITING_PADDING,
                      paddingTop: 10,
                    }}
                  >
                    {transaction.error && (
                      <Text style={{ marginBottom: 10 }}>
                        Remaining:{' '}
                        {integerToCurrency(transaction.error.difference)}
                      </Text>
                    )}
                    <Button
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 15,
                      }}
                      onPress={this.onAddSplit}
                      bare={true}
                    >
                      Add split
                    </Button>
                  </View>
                </View>
              )}
            </View>

            <FieldLabel title="Account" />
            <TapField
              disabled={!adding}
              value={account ? account.name : null}
              onClick={() => this.onClick(transaction.id, 'account')}
            />

            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}>
                <FieldLabel title="Date" />
                <InputField
                  defaultValue={transaction.date}
                  onUpdate={value => this.onEdit(transaction, 'date', value)}
                  onChange={e =>
                    this.onQueueChange(transaction, 'date', e.target.value)
                  }
                />
              </View>

              <View style={{ marginLeft: 35, marginRight: 35 }}>
                <FieldLabel title="Cleared" />
                <BooleanField
                  value={transaction.cleared}
                  onUpdate={value => this.onEdit(transaction, 'cleared', value)}
                  style={{ marginTop: 4 }}
                />
              </View>
            </View>

            <FieldLabel title="Notes" />
            <InputField
              defaultValue={transaction.notes}
              onUpdate={value => this.onEdit(transaction, 'notes', value)}
              onChange={e =>
                this.onQueueChange(transaction, 'notes', e.target.value)
              }
            />

            {!adding && (
              <View style={{ alignItems: 'center' }}>
                <Button
                  onClick={() => onDelete()}
                  style={{
                    borderWidth: 0,
                    paddingVertical: 5,
                    marginLeft: EDITING_PADDING,
                    marginRight: EDITING_PADDING,
                    marginTop: 20,
                    marginBottom: 15,
                    backgroundColor: 'transparent',
                  }}
                  bare={true}
                >
                  <SvgTrash
                    width={17}
                    height={17}
                    style={{ color: colors.r4 }}
                  />
                  <Text
                    style={{
                      color: colors.r4,
                      marginLeft: 5,
                      userSelect: 'none',
                    }}
                  >
                    Delete transaction
                  </Text>
                </Button>
              </View>
            )}
          </View>

          <View
            style={{
              paddingHorizontal: EDITING_PADDING,
              paddingVertical: 15,
              backgroundColor: colors.n11,
              borderTopWidth: 1,
              borderColor: colors.n10,
            }}
          >
            {adding ? (
              <Button onClick={() => this.onAdd()}>
                <SvgAdd width={17} height={17} style={{ color: colors.b3 }} />
                <Text
                  style={[styles.text, { color: colors.b3, marginLeft: 5 }]}
                >
                  Add transaction
                </Text>
              </Button>
            ) : (
              <Button onClick={() => this.onSave()}>
                <SvgPencilWriteAlternate
                  style={{ width: 16, height: 16, color: colors.n1 }}
                />
                <Text
                  style={[styles.text, { marginLeft: 6, color: colors.n1 }]}
                >
                  Save changes
                </Text>
              </Button>
            )}
          </View>

          {/* <ExitTransition
            alive={editingChild}
            withProps={{
              transaction:
                editingChild && transactions.find(t => t.id === editingChild),
            }}
          > */}
          {renderChildEdit({
            transaction:
              editingChild && transactions.find(t => t.id === editingChild),
            amountSign: forcedSign,
            getCategoryName: id => (id ? lookupName(categories, id) : null),
            navigation: navigation,
            onEdit: this.onEdit,
            onStartClose: this.onSaveChild,
          })}
          {/* </ExitTransition> */}
        </View>
      </View>
      // </KeyboardAvoidingView>
    );
  }
}

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
      cleared: false,
    },
  ];
}

function TransactionEditUnconnected(props) {
  // componentDidMount() {
  //   this.props.getCategories();
  //   this.props.getAccounts();
  // }

  const { categories, accounts, payees, lastTransaction, dateFormat } = props;
  let { id: accountId, transactionId } = useParams();
  let navigate = useNavigate();
  let [fetchedTransactions, setFetchedTransactions] = useState(null);
  let transactions = [];
  let adding = false;
  let deleted = false;

  useEffect(() => {
    // May as well update categories / accounts when transaction ID changes
    props.getCategories();
    props.getAccounts();
    props.getPayees();

    async function fetchTransaction() {
      let transactions = [];
      if (transactionId) {
        // Query for the transaction based on the ID with grouped splits.
        //
        // This means if the transaction in question is a split transaction, its
        // subtransactions will be returned in the `substransactions` property on
        // the parent transaction.
        //
        // The edit item components expect to work with a flat array of
        // transactions when handling splits, so we call ungroupTransactions to
        // flatten parent and children into one array.
        let { data } = await runQuery(
          q('transactions')
            .filter({ id: transactionId })
            .select('*')
            .options({ splits: 'grouped' }),
        );
        transactions = ungroupTransactions(data);
        setFetchedTransactions(transactions);
      }
    }
    fetchTransaction();
  }, [transactionId]);

  if (
    categories.length === 0 ||
    accounts.length === 0 ||
    (transactionId && !fetchedTransactions)
  ) {
    return null;
  }

  if (!transactionId) {
    transactions = makeTemporaryTransactions(
      accountId || (lastTransaction && lastTransaction.account) || null,
      lastTransaction && lastTransaction.date,
    );
    adding = true;
  } else {
    transactions = fetchedTransactions;
  }

  const onEdit = async transaction => {
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

  const onSave = async newTransactions => {
    if (deleted) {
      return;
    }

    const changes = diffItems(transactions || [], newTransactions);
    if (
      changes.added.length > 0 ||
      changes.updated.length > 0 ||
      changes.deleted.length
    ) {
      const _remoteUpdates = await send('transactions-batch-update', {
        added: changes.added,
        deleted: changes.deleted,
        updated: changes.updated,
      });

      // if (onTransactionsChange) {
      //   onTransactionsChange({
      //     ...changes,
      //     updated: changes.updated.concat(remoteUpdates),
      //   });
      // }
    }

    if (adding) {
      // The first one is always the "parent" and the only one we care
      // about
      props.setLastTransaction(newTransactions[0]);
    }
  };

  const onDelete = async () => {
    // Eagerly go back
    navigate(-1);

    if (adding) {
      // Adding a new transactions, this disables saving when the component unmounts
      deleted = true;
    } else {
      const changes = { deleted: transactions };
      const _remoteUpdates = await send('transactions-batch-update', changes);
      // if (onTransactionsChange) {
      //   onTransactionsChange({ ...changes, updated: remoteUpdates });
      // }
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.p5,
      }}
    >
      <TransactionEditInner
        transactions={transactions}
        adding={adding}
        categories={categories}
        accounts={accounts}
        payees={payees}
        pushModal={props.pushModal}
        navigation={navigate}
        // TODO: ChildEdit is complicated and heavily relies on RN
        // renderChildEdit={props => <ChildEdit {...props} />}
        renderChildEdit={props => {}}
        dateFormat={dateFormat}
        // TODO: was this a mistake in the original code?
        // onTapField={this.onTapField}
        onEdit={onEdit}
        onSave={onSave}
        onDelete={onDelete}
      />
    </View>
  );
}

export const TransactionEdit = connect(
  state => ({
    categories: state.queries.categories.list,
    payees: state.queries.payees,
    lastTransaction: state.queries.lastTransaction,
    accounts: state.queries.accounts,
    dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
  }),
  actions,
)(TransactionEditUnconnected);

class Transaction extends PureComponent {
  render() {
    const {
      transaction,
      accounts,
      categories,
      payees,
      showCategory,
      added,
      onSelect,
      style,
    } = this.props;
    let {
      id,
      payee: payeeId,
      amount,
      category,
      cleared,
      is_parent,
      notes,
      schedule,
    } = transaction;

    if (isPreviewId(id)) {
      amount = getScheduledAmount(amount);
    }

    let categoryName = category ? lookupName(categories, category) : null;

    let payee = payees && payeeId && getPayeesById(payees)[payeeId];
    let transferAcct =
      payee &&
      payee.transfer_acct &&
      getAccountsById(accounts)[payee.transfer_acct];

    let prettyDescription = getDescriptionPretty(
      transaction,
      payee,
      transferAcct,
    );
    let prettyCategory = transferAcct
      ? 'Transfer'
      : is_parent
      ? 'Split'
      : categoryName;

    let isPreview = isPreviewId(id);
    let textStyle = isPreview && {
      fontStyle: 'italic',
      color: colors.n5,
    };

    return (
      <Button
        onClick={() => onSelect(transaction)}
        style={{
          backgroundColor: 'white',
          border: 'none',
          width: '100%',
          '&:active': { opacity: 0.1 },
        }}
      >
        <ListItem
          style={[
            { flex: 1, height: 60, padding: '5px 10px' }, // remove padding when Button is back
            isPreview && { backgroundColor: colors.n11 },
            style,
          ]}
        >
          <View style={[{ flex: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {schedule && (
                <ArrowsSynchronize
                  style={{
                    width: 12,
                    height: 12,
                    marginRight: 5,
                    color: textStyle.color || colors.n1,
                  }}
                />
              )}
              <TextOneLine
                style={[
                  styles.text,
                  textStyle,
                  { fontSize: 14, fontWeight: added ? '600' : '400' },
                  prettyDescription === '' && {
                    color: colors.n6,
                    fontStyle: 'italic',
                  },
                ]}
              >
                {prettyDescription || 'Empty'}
              </TextOneLine>
            </View>
            {isPreview ? (
              <Status status={notes} />
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 3,
                }}
              >
                <CheckCircle1
                  style={{
                    width: 11,
                    height: 11,
                    color: cleared ? colors.g6 : colors.n8,
                    marginRight: 5,
                  }}
                />
                {showCategory && (
                  <TextOneLine
                    style={{
                      fontSize: 11,
                      marginTop: 1,
                      fontWeight: '400',
                      color: prettyCategory ? colors.n3 : colors.p7,
                      fontStyle: prettyCategory ? null : 'italic',
                      textAlign: 'left',
                    }}
                  >
                    {prettyCategory || 'Uncategorized'}
                  </TextOneLine>
                )}
              </View>
            )}
          </View>
          <Text
            style={[
              styles.text,
              textStyle,
              { marginLeft: 25, marginRight: 5, fontSize: 14 },
            ]}
          >
            {integerToCurrency(amount)}
          </Text>
        </ListItem>
      </Button>
    );
  }
}

export class TransactionList extends Component {
  makeData = memoizeOne(transactions => {
    // Group by date. We can assume transactions is ordered
    const sections = [];
    transactions.forEach(transaction => {
      if (
        sections.length === 0 ||
        transaction.date !== sections[sections.length - 1].date
      ) {
        // Mark the last transaction in the section so it can render
        // with a different border
        let lastSection = sections[sections.length - 1];
        if (lastSection && lastSection.data.length > 0) {
          let lastData = lastSection.data;
          lastData[lastData.length - 1].isLast = true;
        }

        sections.push({
          id: transaction.date,
          date: transaction.date,
          data: [],
        });
      }

      if (!transaction.is_child) {
        sections[sections.length - 1].data.push(transaction);
      }
    });
    return sections;
  });

  render() {
    const {
      transactions,
      scrollProps = {},
      onLoadMore,
      // refreshControl
    } = this.props;

    const sections = this.makeData(transactions);

    return (
      <>
        {scrollProps.ListHeaderComponent}
        <ListBox
          {...scrollProps}
          aria-label="transaction list"
          label=""
          loadMore={onLoadMore}
          selectionMode="none"
          style={{ flex: '1 auto', height: '100%', overflowY: 'auto' }}
        >
          {sections.length === 0 ? (
            <Section>
              <Item>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                  }}
                >
                  <Text style={{ fontSize: 15 }}>No transactions</Text>
                </div>
              </Item>
            </Section>
          ) : null}
          {sections.map(section => {
            return (
              <Section
                title={monthUtils.format(section.date, 'MMMM dd, yyyy')}
                key={section.id}
              >
                {section.data.map((transaction, index, transactions) => {
                  return (
                    <Item
                      key={transaction.id}
                      style={{
                        fontSize:
                          index === transactions.length - 1 ? 98 : 'inherit',
                      }}
                      textValue={transaction.id}
                    >
                      <Transaction
                        transaction={transaction}
                        categories={this.props.categories}
                        accounts={this.props.accounts}
                        payees={this.props.payees}
                        showCategory={this.props.showCategory}
                        added={this.props.isNew(transaction.id)}
                        onSelect={this.props.onSelect} // onSelect(transaction)}
                      />
                    </Item>
                  );
                })}
              </Section>
            );
          })}
        </ListBox>
      </>
    );
  }
}

function ListBox(props) {
  let state = useListState(props);
  let listBoxRef = useRef();
  let { listBoxProps, labelProps } = useListBox(props, state, listBoxRef);

  useEffect(() => {
    function loadMoreTransactions() {
      if (
        Math.abs(
          listBoxRef.current.scrollHeight -
            listBoxRef.current.clientHeight -
            listBoxRef.current.scrollTop,
        ) < listBoxRef.current.clientHeight // load more when we're one screen height from the end
      ) {
        props.loadMore();
      }
    }

    listBoxRef.current.addEventListener('scroll', loadMoreTransactions);

    return () => {
      listBoxRef.current &&
        listBoxRef.current.removeEventListener('scroll', loadMoreTransactions);
    };
  }, [state.collection]);

  return (
    <>
      <div {...labelProps}>{props.label}</div>
      <ul
        {...listBoxProps}
        ref={listBoxRef}
        style={{
          padding: 0,
          listStyle: 'none',
          margin: 0,
          overflowY: 'auto',
          width: '100%',
        }}
      >
        {[...state.collection].map(item => (
          <ListBoxSection key={item.key} section={item} state={state} />
        ))}
      </ul>
    </>
  );
}

function ListBoxSection({ section, state }) {
  let { itemProps, headingProps, groupProps } = useListBoxSection({
    heading: section.rendered,
    'aria-label': section['aria-label'],
  });

  // The heading is rendered inside an <li> element, which contains
  // a <ul> with the child items.
  return (
    <li {...itemProps} style={{ width: '100%' }}>
      {section.rendered && (
        <div
          {...headingProps}
          style={{
            ...styles.smallText,
            backgroundColor: colors.n10,
            borderBottom: `1px solid ${colors.n9}`,
            borderTop: `1px solid ${colors.n9}`,
            color: colors.n4,
            display: 'flex',
            justifyContent: 'center',
            paddingBottom: 4,
            paddingTop: 4,
            position: 'sticky',
            top: '0',
            width: '100%',
            zIndex: zIndices.SECTION_HEADING,
          }}
        >
          {section.rendered}
        </div>
      )}
      <ul
        {...groupProps}
        style={{
          padding: 0,
          listStyle: 'none',
        }}
      >
        {[...section.childNodes].map((node, index, nodes) => (
          <Option
            key={node.key}
            item={node}
            state={state}
            isLast={index === nodes.length - 1}
          />
        ))}
      </ul>
    </li>
  );
}

function Option({ isLast, item, state }) {
  // Get props for the option element
  let ref = useRef();
  let { optionProps, isSelected } = useOption({ key: item.key }, state, ref);

  // Determine whether we should show a keyboard
  // focus ring for accessibility
  let { isFocusVisible, focusProps } = useFocusRing();

  return (
    <li
      {...mergeProps(optionProps, focusProps)}
      ref={ref}
      style={{
        background: isSelected ? 'blueviolet' : 'transparent',
        color: isSelected ? 'white' : null,
        outline: isFocusVisible ? '2px solid orange' : 'none',
        ...(!isLast && { borderBottom: `1px solid ${colors.border}` }),
      }}
    >
      {item.rendered}
    </li>
  );
}

const ROW_HEIGHT = 50;

const ListItem = forwardRef(({ children, style, ...props }, ref) => {
  return (
    <View
      style={[
        {
          height: ROW_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 10,
          paddingRight: 10,
        },
        style,
      ]}
      ref={ref}
      {...props}
    >
      {children}
    </View>
  );
});
