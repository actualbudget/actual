import React, {
  forwardRef,
  useEffect,
  useState,
  useRef,
  memo,
  useMemo,
} from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

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
import { css } from 'glamor';

import { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { q } from 'loot-core/src/shared/query';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import {
  isPreviewId,
  ungroupTransactions,
  updateTransaction,
  realizeTempTransactions,
  splitTransaction,
  addSplitTransaction,
  deleteTransaction,
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

import { useActions } from '../../hooks/useActions';
import { useCategories } from '../../hooks/useCategories';
import { useNavigate } from '../../hooks/useNavigate';
import { useSetThemeColor } from '../../hooks/useSetThemeColor';
import {
  SingleActiveEditFormProvider,
  useSingleActiveEditForm,
} from '../../hooks/useSingleActiveEditForm';
import { SvgSplit } from '../../icons/v0';
import { SvgAdd, SvgTrash } from '../../icons/v1';
import {
  SvgArrowsSynchronize,
  SvgCheckCircle1,
  SvgLockClosed,
  SvgPencilWriteAlternate,
} from '../../icons/v2';
import { styles, theme } from '../../style';
import { Button } from '../common/Button';
import { Text } from '../common/Text';
import { TextOneLine } from '../common/TextOneLine';
import { View } from '../common/View';
import { FocusableAmountInput } from '../mobile/MobileAmountInput';
import {
  FieldLabel,
  TapField,
  InputField,
  BooleanField,
} from '../mobile/MobileForms';
import { MobileBackButton } from '../MobileBackButton';
import { Page } from '../Page';
import { AmountInput } from '../util/AmountInput';

const zIndices = { SECTION_HEADING: 10 };

function getFieldName(transactionId, field) {
  return `${field}-${transactionId}`;
}

function getDescriptionPretty(transaction, payee, transferAcct) {
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

function lookupName(items, id) {
  if (!id) {
    return null;
  }
  return items.find(item => item.id === id)?.name;
}

function Status({ status }) {
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
          style={{ height: 40 }}
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
      ) : adding ? (
        <Button
          type="primary"
          style={{ height: 40 }}
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
          style={{ height: 40 }}
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
      amountSign,
      getCategory,
      getPrettyPayee,
      isOffBudget,
      isBudgetTransfer,
      onClick,
      onEdit,
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
              onClick={() => onClick(transaction.id, 'payee')}
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
              focused={transaction.amount === 0}
              value={amountToInteger(transaction.amount)}
              zeroSign={amountSign}
              style={{ marginRight: 8 }}
              textStyle={{ ...styles.smallText, textAlign: 'right' }}
              onFocus={() =>
                onRequestActiveEdit(getFieldName(transaction.id, 'amount'))
              }
              onUpdate={value => {
                const amount = integerToAmount(value);
                if (transaction.amount !== amount) {
                  onEdit(transaction, 'amount', amount);
                } else {
                  onClearActiveEdit();
                }
              }}
            />
          </View>
        </View>

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
            onClick={() => onClick(transaction.id, 'category')}
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
            onUpdate={value => onEdit(transaction, 'notes', value)}
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

const TransactionEditInner = memo(function TransactionEditInner({
  adding,
  accounts,
  categories,
  payees,
  dateFormat,
  transactions: unserializedTransactions,
  navigate,
  pushModal,
  ...props
}) {
  const { editingField, onRequestActiveEdit, onClearActiveEdit } =
    useSingleActiveEditForm();
  const [totalAmountFocused, setTotalAmountFocused] = useState(false);
  const childTransactionElementRefMap = useRef({});

  const payeesById = useMemo(() => groupById(payees), [payees]);
  const accountsById = useMemo(() => groupById(accounts), [accounts]);

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
  }, []);

  const onTotalAmountUpdate = value => {
    if (transaction.amount !== value) {
      onEdit(transaction, 'amount', value.toString());
    } else {
      onClearActiveEdit();
    }
  };

  const onSave = async () => {
    const [transaction] = unserializedTransactions;

    const onConfirmSave = async () => {
      const { account: accountId } = transaction;
      const account = accountsById[accountId];

      if (unserializedTransactions.find(t => t.account == null)) {
        // Ignore transactions if any of them don't have an account
        // TODO: Should we display validation error?
        return;
      }

      let transactionsToSave = unserializedTransactions;
      if (adding) {
        transactionsToSave = realizeTempTransactions(unserializedTransactions);
      }

      props.onSave(transactionsToSave);
      navigate(`/accounts/${account.id}`, { replace: true });
    };

    if (transaction.reconciled) {
      // On mobile any save gives the warning.
      // On the web only certain changes trigger a warning.
      // Should we bring that here as well? Or does the nature of the editing form
      // make this more appropriate?
      pushModal('confirm-transaction-edit', {
        onConfirm: onConfirmSave,
        confirmReason: 'editReconciled',
      });
    } else {
      onConfirmSave();
    }
  };

  const onAdd = () => {
    onSave();
  };

  const onEdit = async (transaction, name, value) => {
    const newTransaction = { ...transaction, [name]: value };
    await props.onEdit(newTransaction);
    onClearActiveEdit();
  };

  const onClick = (transactionId, name) => {
    onRequestActiveEdit?.(getFieldName(transaction.id, 'payee'), () => {
      pushModal('edit-field', {
        name,
        onSubmit: (name, value) => {
          const transaction = unserializedTransactions.find(
            t => t.id === transactionId,
          );
          // This is a deficiency of this API, need to fix. It
          // assumes that it receives a serialized transaction,
          // but we only have access to the raw transaction
          onEdit(serializeTransaction(transaction, dateFormat), name, value);
        },
        onClose: () => {
          onClearActiveEdit();
        },
      });
    });
  };

  const onDelete = id => {
    const [transaction, ..._childTransactions] = unserializedTransactions;

    const onConfirmDelete = () => {
      props.onDelete(id);

      if (transaction.id !== id) {
        // Only a child transaction was deleted.
        onClearActiveEdit();
        return;
      }

      const { account: accountId } = transaction;
      if (accountId) {
        navigate(`/accounts/${accountId}`, { replace: true });
      } else {
        navigate(-1);
      }
    };

    if (transaction.reconciled) {
      pushModal('confirm-transaction-edit', {
        onConfirm: onConfirmDelete,
        confirmReason: 'deleteReconciled',
      });
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

  const transactions = useMemo(
    () =>
      unserializedTransactions.map(t => serializeTransaction(t, dateFormat)) ||
      [],
    [unserializedTransactions, dateFormat],
  );

  const [transaction, ...childTransactions] = transactions;

  useEffect(() => {
    const noAmountTransaction = childTransactions.find(t => t.amount === 0);
    if (noAmountTransaction) {
      scrollChildTransactionIntoView(noAmountTransaction.id);
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
      title={
        transaction.payee == null
          ? adding
            ? 'New Transaction'
            : 'Transaction'
          : title
      }
      titleStyle={{
        fontSize: 16,
        fontWeight: 500,
      }}
      style={{
        flex: 1,
        backgroundColor: theme.mobilePageBackground,
      }}
      headerLeftContent={<MobileBackButton />}
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
            onUpdate={onTotalAmountUpdate}
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

        <View>
          <FieldLabel title="Payee" />
          <TapField
            disabled={
              editingField &&
              editingField !== getFieldName(transaction.id, 'payee')
            }
            value={getPrettyPayee(transaction)}
            onClick={() => onClick(transaction.id, 'payee')}
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
              onClick={() => onClick(transaction.id, 'category')}
              data-testid="category-field"
            />
          </View>
        )}

        {childTransactions.map(childTrans => (
          <ChildTransactionEdit
            key={childTrans.id}
            transaction={childTrans}
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
            onEdit={onEdit}
            onClick={onClick}
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
            onClick={() => onClick(transaction.id, 'account')}
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
                onEdit(
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
                onUpdate={checked => onEdit(transaction, 'cleared', checked)}
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
            onUpdate={value => onEdit(transaction, 'notes', value)}
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
  const { categories, accounts, payees, lastTransaction, dateFormat } = props;
  const { id: accountId, transactionId } = useParams();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [fetchedTransactions, setFetchedTransactions] = useState([]);
  const adding = useRef(false);
  const deleted = useRef(false);
  useSetThemeColor(theme.mobileViewTheme);

  useEffect(() => {
    // May as well update categories / accounts when transaction ID changes
    props.getCategories();
    props.getAccounts();
    props.getPayees();

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
      setFetchedTransactions(ungroupTransactions(data));
    }
    if (transactionId) {
      fetchTransaction();
    } else {
      adding.current = true;
    }
  }, [transactionId]);

  useEffect(() => {
    setTransactions(fetchedTransactions);
  }, [fetchedTransactions]);

  useEffect(() => {
    if (adding.current) {
      setTransactions(
        makeTemporaryTransactions(
          accountId || lastTransaction?.account || null,
          lastTransaction?.date,
        ),
      );
    }
  }, [adding.current, accountId, lastTransaction]);

  if (
    categories.length === 0 ||
    accounts.length === 0 ||
    transactions.length === 0
  ) {
    return null;
  }

  const onEdit = async serializedTransaction => {
    const transaction = deserializeTransaction(
      serializedTransaction,
      null,
      dateFormat,
    );

    // Run the rules to auto-fill in any data. Right now we only do
    // this on new transactions because that's how desktop works.
    if (isTemporary(transaction)) {
      const afterRules = await send('rules-run', { transaction });
      const diff = getChangedValues(transaction, afterRules);

      if (diff) {
        Object.keys(diff).forEach(field => {
          if (transaction[field] == null) {
            transaction[field] = diff[field];
          }
        });
      }
    }

    const { data: newTransactions } = updateTransaction(
      transactions,
      transaction,
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
      props.setLastTransaction(newTransactions[0]);
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
    const changes = splitTransaction(transactions, id);
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
        pushModal={props.pushModal}
        navigate={navigate}
        dateFormat={dateFormat}
        onEdit={onEdit}
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
  const payees = useSelector(state => state.queries.payees);
  const lastTransaction = useSelector(state => state.queries.lastTransaction);
  const accounts = useSelector(state => state.queries.accounts);
  const dateFormat = useSelector(
    state => state.prefs.local.dateFormat || 'MM/dd/yyyy',
  );
  const actions = useActions();

  return (
    <SingleActiveEditFormProvider formName="mobile-transaction">
      <TransactionEditUnconnected
        {...props}
        {...actions}
        categories={categories}
        payees={payees}
        lastTransaction={lastTransaction}
        accounts={accounts}
        dateFormat={dateFormat}
      />
    </SingleActiveEditFormProvider>
  );
};

const Transaction = memo(function Transaction({
  transaction,
  accounts,
  categories,
  payees,
  showCategory,
  added,
  onSelect,
  style,
}) {
  const accountsById = useMemo(() => groupById(accounts), [accounts]);
  const payeesById = useMemo(() => groupById(payees), [payees]);

  const {
    id,
    payee: payeeId,
    amount: originalAmount,
    category: categoryId,
    cleared,
    is_parent: isParent,
    notes,
    schedule,
  } = transaction;

  let amount = originalAmount;
  if (isPreviewId(id)) {
    amount = getScheduledAmount(amount);
  }

  const categoryName = lookupName(categories, categoryId);

  const payee = payeesById && payeeId && payeesById[payeeId];
  const transferAcct =
    payee && payee.transfer_acct && accountsById[payee.transfer_acct];

  const prettyDescription = getDescriptionPretty(
    transaction,
    payee,
    transferAcct,
  );
  const prettyCategory = transferAcct
    ? 'Transfer'
    : isParent
      ? 'Split'
      : categoryName;

  const isPreview = isPreviewId(id);
  const isReconciled = transaction.reconciled;
  const textStyle = isPreview && {
    fontStyle: 'italic',
    color: theme.pageTextLight,
  };

  return (
    <Button
      onClick={() => onSelect(transaction)}
      style={{
        backgroundColor: theme.tableBackground,
        border: 'none',
        width: '100%',
      }}
    >
      <ListItem
        style={{
          flex: 1,
          height: 60,
          padding: '5px 10px', // remove padding when Button is back
          ...(isPreview && {
            backgroundColor: theme.tableRowHeaderBackground,
          }),
          ...style,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {schedule && (
              <SvgArrowsSynchronize
                style={{
                  width: 12,
                  height: 12,
                  marginRight: 5,
                  color: textStyle.color || theme.menuItemText,
                }}
              />
            )}
            <TextOneLine
              style={{
                ...styles.text,
                ...textStyle,
                fontSize: 14,
                fontWeight: added ? '600' : '400',
                ...(prettyDescription === '' && {
                  color: theme.tableTextLight,
                  fontStyle: 'italic',
                }),
              }}
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
              {isReconciled ? (
                <SvgLockClosed
                  style={{
                    width: 11,
                    height: 11,
                    color: theme.noticeTextLight,
                    marginRight: 5,
                  }}
                />
              ) : (
                <SvgCheckCircle1
                  style={{
                    width: 11,
                    height: 11,
                    color: cleared
                      ? theme.noticeTextLight
                      : theme.pageTextSubdued,
                    marginRight: 5,
                  }}
                />
              )}
              {showCategory && (
                <TextOneLine
                  style={{
                    fontSize: 11,
                    marginTop: 1,
                    fontWeight: '400',
                    color: prettyCategory
                      ? theme.tableTextSelected
                      : theme.menuItemTextSelected,
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
          style={{
            ...styles.text,
            ...textStyle,
            marginLeft: 25,
            marginRight: 5,
            fontSize: 14,
          }}
        >
          {integerToCurrency(amount)}
        </Text>
      </ListItem>
    </Button>
  );
});

export function TransactionList({
  accounts,
  categories,
  payees,
  transactions,
  showCategory,
  isNew,
  onSelect,
  scrollProps = {},
  onLoadMore,
}) {
  const sections = useMemo(() => {
    // Group by date. We can assume transactions is ordered
    const sections = [];
    transactions.forEach(transaction => {
      if (
        sections.length === 0 ||
        transaction.date !== sections[sections.length - 1].date
      ) {
        // Mark the last transaction in the section so it can render
        // with a different border
        const lastSection = sections[sections.length - 1];
        if (lastSection && lastSection.data.length > 0) {
          const lastData = lastSection.data;
          lastData[lastData.length - 1].isLast = true;
        }

        sections.push({
          id: `${isPreviewId(transaction.id) ? 'preview/' : ''}${
            transaction.date
          }`,
          date: transaction.date,
          data: [],
        });
      }

      if (!transaction.is_child) {
        sections[sections.length - 1].data.push(transaction);
      }
    });
    return sections;
  }, [transactions]);

  return (
    <>
      {scrollProps.ListHeaderComponent}
      <ListBox
        {...scrollProps}
        aria-label="transaction list"
        label=""
        loadMore={onLoadMore}
        selectionMode="none"
      >
        {sections.length === 0 ? (
          <Section>
            <Item textValue="No transactions">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                  backgroundColor: theme.mobilePageBackground,
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
              title={
                <span>{monthUtils.format(section.date, 'MMMM dd, yyyy')}</span>
              }
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
                      categories={categories}
                      accounts={accounts}
                      payees={payees}
                      showCategory={showCategory}
                      added={isNew(transaction.id)}
                      onSelect={onSelect} // onSelect(transaction)}
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

function ListBox(props) {
  const state = useListState(props);
  const listBoxRef = useRef();
  const { listBoxProps, labelProps } = useListBox(props, state, listBoxRef);

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
      listBoxRef.current?.removeEventListener('scroll', loadMoreTransactions);
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
  const { itemProps, headingProps, groupProps } = useListBoxSection({
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
          className={`${css(styles.smallText, {
            backgroundColor: theme.pageBackground,
            borderBottom: `1px solid ${theme.tableBorder}`,
            borderTop: `1px solid ${theme.tableBorder}`,
            color: theme.tableHeaderText,
            display: 'flex',
            justifyContent: 'center',
            paddingBottom: 4,
            paddingTop: 4,
            position: 'sticky',
            top: '0',
            width: '100%',
            zIndex: zIndices.SECTION_HEADING,
          })}`}
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
  const ref = useRef();
  const { optionProps, isSelected } = useOption({ key: item.key }, state, ref);

  // Determine whether we should show a keyboard
  const { isFocusVisible, focusProps } = useFocusRing();

  return (
    <li
      {...mergeProps(optionProps, focusProps)}
      ref={ref}
      style={{
        background: isSelected
          ? theme.tableRowBackgroundHighlight
          : theme.tableBackground,
        color: isSelected ? theme.mobileModalText : null,
        outline: isFocusVisible ? '2px solid orange' : 'none',
        ...(!isLast && { borderBottom: `1px solid ${theme.tableBorder}` }),
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
      style={{
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: 10,
        ...style,
      }}
      ref={ref}
      {...props}
    >
      {children}
    </View>
  );
});
