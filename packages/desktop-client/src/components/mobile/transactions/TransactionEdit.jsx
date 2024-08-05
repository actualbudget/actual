import React, {
  forwardRef,
  useEffect,
  useState,
  useRef,
  memo,
  useMemo,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';

import {
  format as formatDate,
  parse as parseDate,
  parseISO,
  isValid as isValidDate,
} from 'date-fns';

import { pushModal, setLastTransaction } from 'loot-core/client/actions';
import { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { q } from 'loot-core/src/shared/query';
import {
  ungroupTransactions,
  updateTransaction,
  realizeTempTransactions,
  splitTransaction,
  addSplitTransaction,
  deleteTransaction,
  makeChild,
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

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { useNavigate } from '../../../hooks/useNavigate';
import { usePayees } from '../../../hooks/usePayees';
import { useSetThemeColor } from '../../../hooks/useSetThemeColor';
import {
  SingleActiveEditFormProvider,
  useSingleActiveEditForm,
} from '../../../hooks/useSingleActiveEditForm';
import { SvgSplit } from '../../../icons/v0';
import { SvgAdd, SvgPiggyBank, SvgTrash } from '../../../icons/v1';
import { SvgPencilWriteAlternate } from '../../../icons/v2';
import { styles, theme } from '../../../style';
import { Button } from '../../common/Button';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { MobilePageHeader, Page } from '../../Page';
import { AmountInput } from '../../util/AmountInput';
import { MobileBackButton } from '../MobileBackButton';
import { FieldLabel, TapField, InputField, BooleanField } from '../MobileForms';

import { FocusableAmountInput } from './FocusableAmountInput';

function getFieldName(transactionId, field) {
  return `${field}-${transactionId}`;
}

export function getDescriptionPretty(transaction, payee, transferAcct) {
  const { amount } = transaction;

  if (transferAcct) {
    return `Transfer ${amount > 0 ? 'from' : 'to'} ${transferAcct.name}`;
  } else if (payee) {
    return payee.name;
  }

  return '';
}

function serializeTransaction(transaction, dateFormat) {
  const { date, amount } = transaction;
  return {
    ...transaction,
    date: formatDate(parseISO(date), dateFormat),
    amount: integerToAmount(amount || 0),
  };
}

function deserializeTransaction(transaction, originalTransaction, dateFormat) {
  const { amount, date: originalDate, ...realTransaction } = transaction;

  const dayMonth = monthUtils.getDayMonthRegex(dateFormat);
  let date = originalDate;
  if (dayMonth.test(date)) {
    const test = parseDate(
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
    const test = parseDate(date, dateFormat, new Date());
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

export function lookupName(items, id) {
  if (!id) {
    return null;
  }
  return items.find(item => item.id === id)?.name;
}

export function Status({ status }) {
  let color;

  switch (status) {
    case 'missed':
      color = theme.errorText;
      break;
    case 'due':
      color = theme.warningText;
      break;
    case 'upcoming':
      color = theme.tableHeaderText;
      break;
    default:
  }

  return (
    <Text
      style={{
        fontSize: 11,
        color,
        fontStyle: 'italic',
        textAlign: 'left',
      }}
    >
      {titleFirst(status)}
    </Text>
  );
}

function Footer({
  transactions,
  adding,
  onAdd,
  onSave,
  onSplit,
  onAddSplit,
  onEmptySplitFound,
  editingField,
  onEditField,
}) {
  const [transaction, ...childTransactions] = transactions;
  const onClickRemainingSplit = () => {
    if (childTransactions.length === 0) {
      onSplit(transaction.id);
    } else {
      const emptySplitTransaction = childTransactions.find(t => t.amount === 0);
      if (!emptySplitTransaction) {
        onAddSplit(transaction.id);
      } else {
        onEmptySplitFound?.(emptySplitTransaction.id);
      }
    }
  };

  return (
    <View
      style={{
        paddingLeft: styles.mobileEditingPadding,
        paddingRight: styles.mobileEditingPadding,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: theme.tableHeaderBackground,
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      {transaction.error?.type === 'SplitTransactionError' ? (
        <Button
          type="primary"
          style={{ height: styles.mobileMinHeight }}
          disabled={editingField}
          onClick={onClickRemainingSplit}
          onPointerDown={e => e.preventDefault()}
        >
          <SvgSplit width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            Amount left:{' '}
            {integerToCurrency(
              transaction.amount > 0
                ? transaction.error.difference
                : -transaction.error.difference,
            )}
          </Text>
        </Button>
      ) : !transaction.account ? (
        <Button
          type="primary"
          style={{ height: styles.mobileMinHeight }}
          disabled={editingField}
          onClick={() => onEditField(transaction.id, 'account')}
          onPointerDown={e => e.preventDefault()}
        >
          <SvgPiggyBank width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            Select account
          </Text>
        </Button>
      ) : adding ? (
        <Button
          type="primary"
          style={{ height: styles.mobileMinHeight }}
          disabled={editingField}
          onClick={onAdd}
          onPointerDown={e => e.preventDefault()}
        >
          <SvgAdd width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 5,
            }}
          >
            Add transaction
          </Text>
        </Button>
      ) : (
        <Button
          type="primary"
          style={{ height: styles.mobileMinHeight }}
          disabled={editingField}
          onClick={onSave}
          onPointerDown={e => e.preventDefault()}
        >
          <SvgPencilWriteAlternate width={16} height={16} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            Save changes
          </Text>
        </Button>
      )}
    </View>
  );
}

const ChildTransactionEdit = forwardRef(
  (
    {
      transaction,
      amountFocused,
      amountSign,
      getCategory,
      getPrettyPayee,
      isOffBudget,
      isBudgetTransfer,
      onEditField,
      onUpdate,
      onDelete,
    },
    ref,
  ) => {
    const { editingField, onRequestActiveEdit, onClearActiveEdit } =
      useSingleActiveEditForm();
    return (
      <View
        innerRef={ref}
        style={{
          backgroundColor: theme.tableBackground,
          borderColor:
            transaction.amount === 0
              ? theme.tableBorderSelected
              : theme.tableBorder,
          borderWidth: '1px',
          borderRadius: '5px',
          padding: '5px',
          margin: '10px',
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flexBasis: '75%' }}>
            <FieldLabel title="Payee" />
            <TapField
              disabled={
                editingField &&
                editingField !== getFieldName(transaction.id, 'payee')
              }
              value={getPrettyPayee(transaction)}
              onClick={() => onEditField(transaction.id, 'payee')}
              data-testid={`payee-field-${transaction.id}`}
            />
          </View>
          <View
            style={{
              flexBasis: '25%',
            }}
          >
            <FieldLabel title="Amount" style={{ padding: 0 }} />
            <AmountInput
              disabled={
                editingField &&
                editingField !== getFieldName(transaction.id, 'amount')
              }
              focused={amountFocused}
              value={amountToInteger(transaction.amount)}
              zeroSign={amountSign}
              style={{ marginRight: 8 }}
              inputStyle={{
                ...styles.smallText,
                textAlign: 'right',
                minWidth: 0,
              }}
              onFocus={() =>
                onRequestActiveEdit(getFieldName(transaction.id, 'amount'))
              }
              onUpdate={value => {
                const amount = integerToAmount(value);
                if (transaction.amount !== amount) {
                  onUpdate(transaction, 'amount', amount);
                } else {
                  onClearActiveEdit();
                }
              }}
              autoDecimals={true}
            />
          </View>
        </View>

        <View>
          <FieldLabel title="Category" />
          <TapField
            textStyle={{
              ...((isOffBudget || isBudgetTransfer(transaction)) && {
                fontStyle: 'italic',
                color: theme.pageTextSubdued,
                fontWeight: 300,
              }),
            }}
            value={getCategory(transaction, isOffBudget)}
            disabled={
              (editingField &&
                editingField !== getFieldName(transaction.id, 'category')) ||
              isOffBudget ||
              isBudgetTransfer(transaction)
            }
            onClick={() => onEditField(transaction.id, 'category')}
            data-testid={`category-field-${transaction.id}`}
          />
        </View>

        <View>
          <FieldLabel title="Notes" />
          <InputField
            disabled={
              editingField &&
              editingField !== getFieldName(transaction.id, 'notes')
            }
            defaultValue={transaction.notes}
            onFocus={() =>
              onRequestActiveEdit(getFieldName(transaction.id, 'notes'))
            }
            onUpdate={value => onUpdate(transaction, 'notes', value)}
          />
        </View>

        <View style={{ alignItems: 'center' }}>
          <Button
            onClick={() => onDelete(transaction.id)}
            onPointerDown={e => e.preventDefault()}
            style={{
              height: 40,
              borderWidth: 0,
              marginLeft: styles.mobileEditingPadding,
              marginRight: styles.mobileEditingPadding,
              marginTop: 10,
              backgroundColor: 'transparent',
            }}
            type="bare"
          >
            <SvgTrash
              width={17}
              height={17}
              style={{ color: theme.errorText }}
            />
            <Text
              style={{
                color: theme.errorText,
                marginLeft: 5,
                userSelect: 'none',
              }}
            >
              Delete split
            </Text>
          </Button>
        </View>
      </View>
    );
  },
);

ChildTransactionEdit.displayName = 'ChildTransactionEdit';

const TransactionEditInner = memo(function TransactionEditInner({
  adding,
  accounts,
  categories,
  payees,
  dateFormat,
  transactions: unserializedTransactions,
  navigate,
  ...props
}) {
  const dispatch = useDispatch();
  const transactions = useMemo(
    () =>
      unserializedTransactions.map(t => serializeTransaction(t, dateFormat)) ||
      [],
    [unserializedTransactions, dateFormat],
  );
  const { grouped: categoryGroups } = useCategories();

  const [transaction, ...childTransactions] = transactions;

  const { editingField, onRequestActiveEdit, onClearActiveEdit } =
    useSingleActiveEditForm();
  const [totalAmountFocused, setTotalAmountFocused] = useState(false);
  const childTransactionElementRefMap = useRef({});

  const payeesById = useMemo(() => groupById(payees), [payees]);
  const accountsById = useMemo(() => groupById(accounts), [accounts]);

  const onTotalAmountEdit = () => {
    onRequestActiveEdit?.(getFieldName(transaction.id, 'amount'), () => {
      setTotalAmountFocused(true);
      return () => setTotalAmountFocused(false);
    });
  };

  useEffect(() => {
    if (adding) {
      onTotalAmountEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAccount = trans => {
    return trans?.account && accountsById?.[trans.account];
  };

  const getPayee = trans => {
    return trans?.payee && payeesById?.[trans.payee];
  };

  const getTransferAcct = trans => {
    const payee = trans && getPayee(trans);
    return payee?.transfer_acct && accountsById?.[payee.transfer_acct];
  };

  const getPrettyPayee = trans => {
    if (trans && trans.is_parent) {
      return 'Split';
    }
    const transPayee = trans && getPayee(trans);
    const transTransferAcct = trans && getTransferAcct(trans);
    return getDescriptionPretty(trans, transPayee, transTransferAcct);
  };

  const isBudgetTransfer = trans => {
    const transferAcct = trans && getTransferAcct(trans);
    return transferAcct && !transferAcct.offbudget;
  };

  const getCategory = (trans, isOffBudget) => {
    return isOffBudget
      ? 'Off Budget'
      : isBudgetTransfer(trans)
        ? 'Transfer'
        : lookupName(categories, trans.category);
  };

  const onTotalAmountUpdate = value => {
    if (transaction.amount !== value) {
      onUpdate(transaction, 'amount', value.toString());
    } else {
      onClearActiveEdit();
    }
  };

  const onSave = async () => {
    const [unserializedTransaction] = unserializedTransactions;

    const onConfirmSave = async () => {
      let transactionsToSave = unserializedTransactions;
      if (adding) {
        transactionsToSave = realizeTempTransactions(unserializedTransactions);
      }

      props.onSave(transactionsToSave);

      if (adding) {
        const { account: accountId } = unserializedTransaction;
        const account = accountsById[accountId];
        navigate(`/accounts/${account.id}`, { replace: true });
      } else {
        navigate(-1);
      }
    };

    if (unserializedTransaction.reconciled) {
      // On mobile any save gives the warning.
      // On the web only certain changes trigger a warning.
      // Should we bring that here as well? Or does the nature of the editing form
      // make this more appropriate?
      dispatch(
        pushModal('confirm-transaction-edit', {
          onConfirm: onConfirmSave,
          confirmReason: 'editReconciled',
        }),
      );
    } else {
      onConfirmSave();
    }
  };

  const onAdd = () => {
    onSave();
  };

  const onUpdate = async (serializedTransaction, name, value) => {
    const newTransaction = { ...serializedTransaction, [name]: value };
    await props.onUpdate(newTransaction, name);
    onClearActiveEdit();
  };

  const onEditField = (transactionId, name) => {
    onRequestActiveEdit?.(getFieldName(transaction.id, name), () => {
      const transactionToEdit = transactions.find(t => t.id === transactionId);
      const unserializedTransaction = unserializedTransactions.find(
        t => t.id === transactionId,
      );
      switch (name) {
        case 'category':
          dispatch(
            pushModal('category-autocomplete', {
              categoryGroups,
              month: monthUtils.monthFromDate(unserializedTransaction.date),
              onSelect: categoryId => {
                onUpdate(transactionToEdit, name, categoryId);
              },
              onClose: () => {
                onClearActiveEdit();
              },
            }),
          );
          break;
        case 'account':
          dispatch(
            pushModal('account-autocomplete', {
              onSelect: accountId => {
                onUpdate(transactionToEdit, name, accountId);
              },
              onClose: () => {
                onClearActiveEdit();
              },
            }),
          );
          break;
        case 'payee':
          dispatch(
            pushModal('payee-autocomplete', {
              onSelect: payeeId => {
                onUpdate(transactionToEdit, name, payeeId);
              },
              onClose: () => {
                onClearActiveEdit();
              },
            }),
          );
          break;
        default:
          dispatch(
            pushModal('edit-field', {
              name,
              month: monthUtils.monthFromDate(unserializedTransaction.date),
              onSubmit: (name, value) => {
                onUpdate(transactionToEdit, name, value);
              },
              onClose: () => {
                onClearActiveEdit();
              },
            }),
          );
          break;
      }
    });
  };

  const onDelete = id => {
    const [unserializedTransaction] = unserializedTransactions;

    const onConfirmDelete = () => {
      dispatch(
        pushModal('confirm-transaction-delete', {
          onConfirm: () => {
            props.onDelete(id);

            if (unserializedTransaction.id !== id) {
              // Only a child transaction was deleted.
              onClearActiveEdit();
              return;
            }

            navigate(-1);
          },
        }),
      );
    };

    if (unserializedTransaction.reconciled) {
      dispatch(
        pushModal('confirm-transaction-edit', {
          onConfirm: onConfirmDelete,
          confirmReason: 'deleteReconciled',
        }),
      );
    } else {
      onConfirmDelete();
    }
  };

  const scrollChildTransactionIntoView = id => {
    const childTransactionEditElement =
      childTransactionElementRefMap.current?.[id];
    childTransactionEditElement?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  const onAddSplit = id => {
    props.onAddSplit(id);
  };

  const onSplit = id => {
    props.onSplit(id);
  };

  const onEmptySplitFound = id => {
    scrollChildTransactionIntoView(id);
  };

  useEffect(() => {
    const noAmountChildTransaction = childTransactions.find(
      t => t.amount === 0,
    );
    if (noAmountChildTransaction) {
      scrollChildTransactionIntoView(noAmountChildTransaction.id);
    }
  }, [childTransactions]);

  // Child transactions should always default to the signage
  // of the parent transaction
  const childAmountSign = transaction.amount <= 0 ? '-' : '+';

  const account = getAccount(transaction);
  const isOffBudget = account && !!account.offbudget;
  const title = getDescriptionPretty(
    transaction,
    getPayee(transaction),
    getTransferAcct(transaction),
  );

  const transactionDate = parseDate(transaction.date, dateFormat, new Date());
  const dateDefaultValue = monthUtils.dayFromDate(transactionDate);

  return (
    <Page
      header={
        <MobilePageHeader
          title={
            transaction.payee == null
              ? adding
                ? 'New Transaction'
                : 'Transaction'
              : title
          }
          leftContent={<MobileBackButton />}
        />
      }
      titleStyle={{
        fontSize: 16,
        fontWeight: 500,
      }}
      footer={
        <Footer
          transactions={transactions}
          adding={adding}
          onAdd={onAdd}
          onSave={onSave}
          onSplit={onSplit}
          onAddSplit={onAddSplit}
          onEmptySplitFound={onEmptySplitFound}
          editingField={editingField}
          onEditField={onEditField}
        />
      }
      padding={0}
    >
      <View style={{ flexShrink: 0, marginTop: 20, marginBottom: 20 }}>
        <View
          style={{
            alignItems: 'center',
          }}
        >
          <FieldLabel title="Amount" flush style={{ marginBottom: 0 }} />
          <FocusableAmountInput
            value={transaction.amount}
            zeroSign="-"
            focused={totalAmountFocused}
            onFocus={onTotalAmountEdit}
            onUpdateAmount={onTotalAmountUpdate}
            focusedStyle={{
              width: 'auto',
              padding: '5px',
              paddingLeft: '20px',
              paddingRight: '20px',
              minWidth: '100%',
            }}
            textStyle={{ ...styles.veryLargeText, textAlign: 'center' }}
          />
        </View>

        <View>
          <FieldLabel title="Payee" />
          <TapField
            textStyle={{
              ...(transaction.is_parent && {
                fontStyle: 'italic',
                fontWeight: 300,
              }),
            }}
            value={getPrettyPayee(transaction)}
            disabled={
              editingField &&
              editingField !== getFieldName(transaction.id, 'payee')
            }
            onClick={() => onEditField(transaction.id, 'payee')}
            data-testid="payee-field"
          />
        </View>

        {!transaction.is_parent && (
          <View>
            <FieldLabel title="Category" />
            <TapField
              style={{
                ...((isOffBudget || isBudgetTransfer(transaction)) && {
                  fontStyle: 'italic',
                  color: theme.pageTextSubdued,
                  fontWeight: 300,
                }),
              }}
              value={getCategory(transaction, isOffBudget)}
              disabled={
                (editingField &&
                  editingField !== getFieldName(transaction.id, 'category')) ||
                isOffBudget ||
                isBudgetTransfer(transaction)
              }
              onClick={() => onEditField(transaction.id, 'category')}
              data-testid="category-field"
            />
          </View>
        )}

        {childTransactions.map((childTrans, i, arr) => (
          <ChildTransactionEdit
            key={childTrans.id}
            transaction={childTrans}
            amountFocused={arr.findIndex(c => c.amount === 0) === i}
            amountSign={childAmountSign}
            ref={r => {
              childTransactionElementRefMap.current = {
                ...childTransactionElementRefMap.current,
                [childTrans.id]: r,
              };
            }}
            isOffBudget={isOffBudget}
            getCategory={getCategory}
            getPrettyPayee={getPrettyPayee}
            isBudgetTransfer={isBudgetTransfer}
            onUpdate={onUpdate}
            onEditField={onEditField}
            onDelete={onDelete}
          />
        ))}

        {transaction.amount !== 0 && childTransactions.length === 0 && (
          <View style={{ alignItems: 'center' }}>
            <Button
              disabled={editingField}
              style={{
                height: 40,
                borderWidth: 0,
                marginLeft: styles.mobileEditingPadding,
                marginRight: styles.mobileEditingPadding,
                marginTop: 10,
                backgroundColor: 'transparent',
              }}
              onClick={() => onSplit(transaction.id)}
              type="bare"
            >
              <SvgSplit
                width={17}
                height={17}
                style={{ color: theme.formLabelText }}
              />
              <Text
                style={{
                  marginLeft: 5,
                  userSelect: 'none',
                  color: theme.formLabelText,
                }}
              >
                Split
              </Text>
            </Button>
          </View>
        )}

        <View>
          <FieldLabel title="Account" />
          <TapField
            disabled={
              !adding ||
              (editingField &&
                editingField !== getFieldName(transaction.id, 'account'))
            }
            value={account?.name}
            onClick={() => onEditField(transaction.id, 'account')}
            data-testid="account-field"
          />
        </View>

        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <FieldLabel title="Date" />
            <InputField
              type="date"
              disabled={
                editingField &&
                editingField !== getFieldName(transaction.id, 'date')
              }
              required
              style={{ color: theme.tableText, minWidth: '150px' }}
              defaultValue={dateDefaultValue}
              onFocus={() =>
                onRequestActiveEdit(getFieldName(transaction.id, 'date'))
              }
              onUpdate={value =>
                onUpdate(
                  transaction,
                  'date',
                  formatDate(parseISO(value), dateFormat),
                )
              }
            />
          </View>
          {transaction.reconciled ? (
            <View style={{ marginLeft: 0, marginRight: 8 }}>
              <FieldLabel title="Reconciled" />
              <BooleanField
                disabled
                checked
                style={{
                  margin: 'auto',
                  width: 22,
                  height: 22,
                }}
              />
            </View>
          ) : (
            <View style={{ marginLeft: 0, marginRight: 8 }}>
              <FieldLabel title="Cleared" />
              <BooleanField
                disabled={editingField}
                checked={transaction.cleared}
                onUpdate={checked => onUpdate(transaction, 'cleared', checked)}
                style={{
                  margin: 'auto',
                  width: 22,
                  height: 22,
                }}
              />
            </View>
          )}
        </View>

        <View>
          <FieldLabel title="Notes" />
          <InputField
            disabled={
              editingField &&
              editingField !== getFieldName(transaction.id, 'notes')
            }
            defaultValue={transaction.notes}
            onFocus={() => {
              onRequestActiveEdit(getFieldName(transaction.id, 'notes'));
            }}
            onUpdate={value => onUpdate(transaction, 'notes', value)}
          />
        </View>

        {!adding && (
          <View style={{ alignItems: 'center' }}>
            <Button
              onClick={() => onDelete(transaction.id)}
              style={{
                height: 40,
                borderWidth: 0,
                marginLeft: styles.mobileEditingPadding,
                marginRight: styles.mobileEditingPadding,
                marginTop: 10,
                backgroundColor: 'transparent',
              }}
              type="bare"
            >
              <SvgTrash
                width={17}
                height={17}
                style={{ color: theme.errorText }}
              />
              <Text
                style={{
                  color: theme.errorText,
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
    </Page>
  );
});

function isTemporary(transaction) {
  return transaction.id.indexOf('temp') === 0;
}

function makeTemporaryTransactions(accountId, categoryId, lastDate) {
  return [
    {
      id: 'temp',
      date: lastDate || monthUtils.currentDay(),
      account: accountId,
      category: categoryId,
      amount: 0,
      cleared: false,
    },
  ];
}

function TransactionEditUnconnected({
  categories,
  accounts,
  payees,
  lastTransaction,
  dateFormat,
}) {
  const { transactionId } = useParams();
  const { state: locationState } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [transactions, setTransactions] = useState([]);
  const [fetchedTransactions, setFetchedTransactions] = useState([]);
  const adding = useRef(false);
  const deleted = useRef(false);
  useSetThemeColor(theme.mobileViewTheme);

  useEffect(() => {
    async function fetchTransaction() {
      // Query for the transaction based on the ID with grouped splits.
      //
      // This means if the transaction in question is a split transaction, its
      // subtransactions will be returned in the `substransactions` property on
      // the parent transaction.
      //
      // The edit item components expect to work with a flat array of
      // transactions when handling splits, so we call ungroupTransactions to
      // flatten parent and children into one array.
      const { data } = await runQuery(
        q('transactions')
          .filter({ id: transactionId })
          .select('*')
          .options({ splits: 'grouped' }),
      );
      const fetchedTransactions = ungroupTransactions(data);
      setTransactions(fetchedTransactions);
      setFetchedTransactions(fetchedTransactions);
    }
    if (transactionId !== 'new') {
      fetchTransaction();
    } else {
      adding.current = true;
    }
  }, [transactionId]);

  useEffect(() => {
    if (adding.current) {
      setTransactions(
        makeTemporaryTransactions(
          locationState?.accountId || lastTransaction?.account || null,
          locationState?.categoryId || null,
          lastTransaction?.date,
        ),
      );
    }
  }, [locationState?.accountId, locationState?.categoryId, lastTransaction]);

  if (
    categories.length === 0 ||
    accounts.length === 0 ||
    transactions.length === 0
  ) {
    return null;
  }

  const onUpdate = async (serializedTransaction, updatedField) => {
    const transaction = deserializeTransaction(
      serializedTransaction,
      null,
      dateFormat,
    );

    // Run the rules to auto-fill in any data. Right now we only do
    // this on new transactions because that's how desktop works.
    const newTransaction = { ...transaction };
    if (isTemporary(newTransaction)) {
      const afterRules = await send('rules-run', {
        transaction: newTransaction,
      });
      const diff = getChangedValues(newTransaction, afterRules);

      if (diff) {
        Object.keys(diff).forEach(field => {
          if (
            newTransaction[field] == null ||
            newTransaction[field] === '' ||
            newTransaction[field] === 0 ||
            newTransaction[field] === false
          ) {
            newTransaction[field] = diff[field];
          }
        });

        // When a rule updates a parent transaction, overwrite all changes to the current field in subtransactions.
        if (
          newTransaction.is_parent &&
          diff.subtransactions !== undefined &&
          updatedField !== null
        ) {
          newTransaction.subtransactions = diff.subtransactions.map(
            (st, idx) => ({
              ...(newTransaction.subtransactions[idx] || st),
              ...(st[updatedField] != null && {
                [updatedField]: st[updatedField],
              }),
            }),
          );
        }
      }
    }

    const { data: newTransactions } = updateTransaction(
      transactions,
      newTransaction,
    );
    setTransactions(newTransactions);
  };

  const onSave = async newTransactions => {
    if (deleted.current) {
      return;
    }

    const changes = diffItems(fetchedTransactions || [], newTransactions);
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

    if (adding.current) {
      // The first one is always the "parent" and the only one we care
      // about
      dispatch(setLastTransaction(newTransactions[0]));
    }
  };

  const onDelete = async id => {
    const changes = deleteTransaction(transactions, id);

    if (adding.current) {
      // Adding a new transactions, this disables saving when the component unmounts
      deleted.current = true;
    } else {
      const _remoteUpdates = await send('transactions-batch-update', {
        deleted: changes.diff.deleted,
      });

      // if (onTransactionsChange) {
      //   onTransactionsChange({ ...changes, updated: remoteUpdates });
      // }
    }

    setTransactions(changes.data);
  };

  const onAddSplit = id => {
    const changes = addSplitTransaction(transactions, id);
    setTransactions(changes.data);
  };

  const onSplit = id => {
    const changes = splitTransaction(transactions, id, parent => [
      makeChild(parent),
      makeChild(parent),
    ]);

    setTransactions(changes.data);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.pageBackground,
      }}
    >
      <TransactionEditInner
        transactions={transactions}
        adding={adding.current}
        categories={categories}
        accounts={accounts}
        payees={payees}
        navigate={navigate}
        dateFormat={dateFormat}
        onUpdate={onUpdate}
        onSave={onSave}
        onDelete={onDelete}
        onSplit={onSplit}
        onAddSplit={onAddSplit}
      />
    </View>
  );
}

export const TransactionEdit = props => {
  const { list: categories } = useCategories();
  const payees = usePayees();
  const lastTransaction = useSelector(state => state.queries.lastTransaction);
  const accounts = useAccounts();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  return (
    <SingleActiveEditFormProvider formName="mobile-transaction">
      <TransactionEditUnconnected
        {...props}
        categories={categories}
        payees={payees}
        lastTransaction={lastTransaction}
        accounts={accounts}
        dateFormat={dateFormat}
      />
    </SingleActiveEditFormProvider>
  );
};
