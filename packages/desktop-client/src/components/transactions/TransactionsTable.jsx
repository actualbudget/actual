import React, {
  createElement,
  createRef,
  forwardRef,
  memo,
  useState,
  useRef,
  useMemo,
  useCallback,
  useLayoutEffect,
  useEffect,
} from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDispatch } from 'react-redux';

import {
  format as formatDate,
  parseISO,
  isValid as isDateValid,
} from 'date-fns';

import { pushModal } from 'loot-core/client/actions';
import { useCachedSchedules } from 'loot-core/src/client/data-hooks/schedules';
import {
  getAccountsById,
  getPayeesById,
  getCategoriesById,
} from 'loot-core/src/client/reducers/queries';
import { evalArithmetic } from 'loot-core/src/shared/arithmetic';
import { currentDay } from 'loot-core/src/shared/months';
import * as monthUtils from 'loot-core/src/shared/months';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import {
  splitTransaction,
  updateTransaction,
  deleteTransaction,
  addSplitTransaction,
  groupTransaction,
  ungroupTransactions,
  isTemporaryId,
  isPreviewId,
} from 'loot-core/src/shared/transactions';
import {
  integerToCurrency,
  amountToInteger,
  titleFirst,
} from 'loot-core/src/shared/util';

import { useMergedRefs } from '../../hooks/useMergedRefs';
import { usePrevious } from '../../hooks/usePrevious';
import { useSelectedDispatch, useSelectedItems } from '../../hooks/useSelected';
import { useSplitsExpanded } from '../../hooks/useSplitsExpanded';
import { SvgLeftArrow2, SvgRightArrow2, SvgSplit } from '../../icons/v0';
import { SvgArrowDown, SvgArrowUp, SvgCheveronDown } from '../../icons/v1';
import {
  SvgArrowsSynchronize,
  SvgCalendar,
  SvgHyperlink2,
} from '../../icons/v2';
import { styles, theme } from '../../style';
import { AccountAutocomplete } from '../autocomplete/AccountAutocomplete';
import { CategoryAutocomplete } from '../autocomplete/CategoryAutocomplete';
import { PayeeAutocomplete } from '../autocomplete/PayeeAutocomplete';
import { Button } from '../common/Button';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { Tooltip } from '../common/Tooltip';
import { View } from '../common/View';
import { getStatusProps } from '../schedules/StatusBadge';
import { DateSelect } from '../select/DateSelect';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';
import {
  Cell,
  Field,
  Row,
  InputCell,
  SelectCell,
  DeleteCell,
  CustomCell,
  CellButton,
  useTableNavigator,
  Table,
  UnexposedCellContent,
} from '../table';

function getDisplayValue(obj, name) {
  return obj ? obj[name] : '';
}

function serializeTransaction(transaction, showZeroInDeposit) {
  let { amount, date } = transaction;

  if (isPreviewId(transaction.id)) {
    amount = (transaction._inverse ? -1 : 1) * getScheduledAmount(amount);
  }

  let debit = amount < 0 ? -amount : null;
  let credit = amount > 0 ? amount : null;

  if (amount === 0) {
    if (showZeroInDeposit) {
      credit = 0;
    } else {
      debit = 0;
    }
  }

  // Validate the date format
  if (!isDateValid(parseISO(date))) {
    // Be a little forgiving if the date isn't valid. This at least
    // stops the UI from crashing, but this is a serious problem with
    // the data. This allows the user to go through and see empty
    // dates and manually fix them.
    date = null;
  }

  return {
    ...transaction,
    date,
    debit: debit != null ? integerToCurrency(debit) : '',
    credit: credit != null ? integerToCurrency(credit) : '',
  };
}

function deserializeTransaction(transaction, originalTransaction) {
  const { debit, credit, date: originalDate, ...realTransaction } = transaction;

  let amount;
  if (debit !== '') {
    const parsed = evalArithmetic(debit, null);
    amount = parsed != null ? -parsed : null;
  } else {
    amount = evalArithmetic(credit, null);
  }

  amount =
    amount != null ? amountToInteger(amount) : originalTransaction.amount;

  let date = originalDate;
  if (date == null) {
    date = originalTransaction.date || currentDay();
  }

  return { ...realTransaction, date, amount };
}

function isLastChild(transactions, index) {
  const trans = transactions[index];
  return (
    trans &&
    trans.is_child &&
    (transactions[index + 1] == null ||
      transactions[index + 1].parent_id !== trans.parent_id)
  );
}

function selectAscDesc(field, ascDesc, clicked, defaultAscDesc = 'asc') {
  return field === clicked
    ? ascDesc === 'asc'
      ? 'desc'
      : 'asc'
    : defaultAscDesc;
}

const TransactionHeader = memo(
  ({
    hasSelected,
    showAccount,
    showCategory,
    showBalance,
    showCleared,
    scrollWidth,
    onSort,
    ascDesc,
    field,
  }) => {
    const dispatchSelected = useSelectedDispatch();

    useHotkeys(
      'ctrl+a, cmd+a, meta+a',
      e => dispatchSelected({ type: 'select-all', event: e }),
      {
        preventDefault: true,
        scopes: ['app'],
      },
      [dispatchSelected],
    );

    return (
      <Row
        style={{
          fontWeight: 300,
          zIndex: 200,
          color: theme.tableHeaderText,
          backgroundColor: theme.tableBackground,
          paddingRight: `${5 + (scrollWidth ?? 0)}px`,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.tableBorder,
        }}
      >
        <SelectCell
          exposed={true}
          focused={false}
          selected={hasSelected}
          width={20}
          style={{
            borderTopWidth: 0,
            borderBottomWidth: 0,
          }}
          onSelect={e => dispatchSelected({ type: 'select-all', event: e })}
        />
        <HeaderCell
          value="Date"
          width={110}
          alignItems="flex"
          marginLeft={-5}
          id="date"
          icon={field === 'date' ? ascDesc : 'clickable'}
          onClick={() =>
            onSort('date', selectAscDesc(field, ascDesc, 'date', 'desc'))
          }
        />
        {showAccount && (
          <HeaderCell
            value="Account"
            width="flex"
            alignItems="flex"
            marginLeft={-5}
            id="account"
            icon={field === 'account' ? ascDesc : 'clickable'}
            onClick={() =>
              onSort('account', selectAscDesc(field, ascDesc, 'account', 'asc'))
            }
          />
        )}
        <HeaderCell
          value="Payee"
          width="flex"
          alignItems="flex"
          marginLeft={-5}
          id="payee"
          icon={field === 'payee' ? ascDesc : 'clickable'}
          onClick={() =>
            onSort('payee', selectAscDesc(field, ascDesc, 'payee', 'asc'))
          }
        />
        <HeaderCell
          value="Notes"
          width="flex"
          alignItems="flex"
          marginLeft={-5}
          id="notes"
          icon={field === 'notes' ? ascDesc : 'clickable'}
          onClick={() =>
            onSort('notes', selectAscDesc(field, ascDesc, 'notes', 'asc'))
          }
        />
        {showCategory && (
          <HeaderCell
            value="Category"
            width="flex"
            alignItems="flex"
            marginLeft={-5}
            id="category"
            icon={field === 'category' ? ascDesc : 'clickable'}
            onClick={() =>
              onSort(
                'category',
                selectAscDesc(field, ascDesc, 'category', 'asc'),
              )
            }
          />
        )}
        <HeaderCell
          value="Payment"
          width={100}
          alignItems="flex-end"
          marginRight={-5}
          id="payment"
          icon={field === 'payment' ? ascDesc : 'clickable'}
          onClick={() =>
            onSort('payment', selectAscDesc(field, ascDesc, 'payment', 'asc'))
          }
        />
        <HeaderCell
          value="Deposit"
          width={100}
          alignItems="flex-end"
          marginRight={-5}
          id="deposit"
          icon={field === 'deposit' ? ascDesc : 'clickable'}
          onClick={() =>
            onSort('deposit', selectAscDesc(field, ascDesc, 'deposit', 'desc'))
          }
        />
        {showBalance && (
          <HeaderCell
            value="Balance"
            width={103}
            alignItems="flex-end"
            marginRight={-5}
            id="balance"
          />
        )}
        {showCleared && (
          <HeaderCell
            value="✓"
            width={38}
            alignItems="center"
            id="cleared"
            icon={field === 'cleared' ? ascDesc : 'clickable'}
            onClick={() => {
              onSort(
                'cleared',
                selectAscDesc(field, ascDesc, 'cleared', 'asc'),
              );
            }}
          />
        )}
      </Row>
    );
  },
);

TransactionHeader.displayName = 'TransactionHeader';

function getPayeePretty(transaction, payee, transferAcct, numHiddenPayees = 0) {
  const formatPayeeName = payeeName =>
    numHiddenPayees > 0 ? `${payeeName} (+${numHiddenPayees} more)` : payeeName;

  const { payee: payeeId } = transaction;

  if (transferAcct) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {formatPayeeName(transferAcct.name)}
        </div>
      </View>
    );
  } else if (payee) {
    return formatPayeeName(payee.name);
  } else if (payeeId && payeeId.startsWith('new:')) {
    return formatPayeeName(payeeId.slice('new:'.length));
  }

  return '';
}

function StatusCell({
  id,
  focused,
  selected,
  status,
  isChild,
  isPreview,
  onEdit,
  onUpdate,
}) {
  const isClearedField =
    status === 'cleared' || status === 'reconciled' || status == null;
  const statusProps = getStatusProps(status);

  const statusColor =
    status === 'cleared'
      ? theme.noticeTextLight
      : status === 'reconciled'
        ? theme.noticeTextLight
        : status === 'missed'
          ? theme.errorText
          : status === 'due'
            ? theme.warningText
            : selected
              ? theme.pageTextLinkLight
              : theme.pageTextSubdued;

  function onSelect() {
    if (isClearedField) {
      onUpdate('cleared', !(status === 'cleared'));
    }
  }

  return (
    <Cell
      name="cleared"
      width={38}
      alignItems="center"
      focused={focused}
      style={{ padding: 1 }}
      plain
    >
      <CellButton
        style={{
          padding: 3,
          backgroundColor: 'transparent',
          border: '1px solid transparent',
          borderRadius: 50,
          ':focus': {
            ...(isPreview
              ? {
                  boxShadow: 'none',
                }
              : {
                  border: '1px solid ' + theme.formInputBorderSelected,
                  boxShadow: '0 1px 2px ' + theme.formInputBorderSelected,
                }),
          },
          cursor: isClearedField ? 'pointer' : 'default',
          ...(isChild && { visibility: 'hidden' }),
        }}
        disabled={isPreview || isChild}
        onEdit={() => onEdit(id, 'cleared')}
        onSelect={onSelect}
      >
        {createElement(statusProps.Icon, {
          style: {
            width: 13,
            height: 13,
            color: statusColor,
            marginTop: status === 'due' ? -1 : 0,
          },
        })}
      </CellButton>
    </Cell>
  );
}

function HeaderCell({
  value,
  id,
  width,
  alignItems,
  marginLeft,
  marginRight,
  icon,
  onClick,
}) {
  const style = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: theme.tableHeaderText,
    fontWeight: 300,
    marginLeft,
    marginRight,
  };

  return (
    <CustomCell
      width={width}
      name={id}
      alignItems={alignItems}
      value={value}
      style={{
        borderTopWidth: 0,
        borderBottomWidth: 0,
      }}
      unexposedContent={({ value: cellValue }) =>
        onClick ? (
          <Button type="bare" onClick={onClick} style={style}>
            <UnexposedCellContent value={cellValue} />
            {icon === 'asc' && (
              <SvgArrowDown width={10} height={10} style={{ marginLeft: 5 }} />
            )}
            {icon === 'desc' && (
              <SvgArrowUp width={10} height={10} style={{ marginLeft: 5 }} />
            )}
          </Button>
        ) : (
          <Text style={style}>{cellValue}</Text>
        )
      }
    />
  );
}

const useParentPayee = (
  payees,
  subtransactions,
  transferAccountsByTransaction,
) =>
  useMemo(() => {
    if (!subtransactions) {
      return null;
    }

    const { counts, mostCommonPayeeTransaction } =
      subtransactions?.reduce(
        ({ counts, ...result }, sub) => {
          if (sub.payee) {
            counts[sub.payee] = (counts[sub.payee] || 0) + 1;
            if (counts[sub.payee] > result.maxCount) {
              return {
                counts,
                maxCount: counts[sub.payee],
                mostCommonPayeeTransaction: sub,
              };
            }
          }
          return { counts, ...result };
        },
        { counts: {}, maxCount: 0, mostCommonPayeeTransaction: null },
      ) || {};

    if (!mostCommonPayeeTransaction) {
      return 'Split (no payee)';
    }

    const mostCommonPayee =
      getPayeesById(payees)[mostCommonPayeeTransaction.payee];
    const numDistinctPayees = Object.keys(counts).length;
    return getPayeePretty(
      mostCommonPayeeTransaction,
      mostCommonPayee,
      transferAccountsByTransaction[mostCommonPayeeTransaction.id],
      numDistinctPayees - 1,
    );
  }, [subtransactions, payees, transferAccountsByTransaction]);

function PayeeCell({
  id,
  payee,
  focused,
  payees,
  accounts,
  transferAccountsByTransaction,
  valueStyle,
  transaction,
  subtransactions,
  importedPayee,
  isPreview,
  onEdit,
  onUpdate,
  onCreatePayee,
  onManagePayees,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
}) {
  const isCreatingPayee = useRef(false);

  const dispatch = useDispatch();

  const parentPayee = useParentPayee(
    payees,
    subtransactions,
    transferAccountsByTransaction,
  );

  const transferAccount = transferAccountsByTransaction[transaction.id];

  return transaction.is_parent ? (
    <Cell
      name="payee"
      width="flex"
      focused={focused}
      style={{ padding: 0 }}
      plain
    >
      <CellButton
        bare
        style={{
          alignSelf: 'flex-start',
          borderRadius: 4,
          border: '1px solid transparent', // so it doesn't shift on hover
          ':hover': {
            border: '1px solid ' + theme.buttonNormalBorder,
          },
        }}
        disabled={isPreview}
        onSelect={() =>
          dispatch(
            pushModal('payee-autocomplete', {
              onSelect: payeeId => {
                onUpdate('payee', payeeId);
              },
            }),
          )
        }
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'stretch',
            borderRadius: 4,
            flex: 1,
            padding: 4,
            color: theme.pageTextSubdued,
          }}
        >
          <SvgSplit
            style={{
              color: 'inherit',
              width: 14,
              height: 14,
              marginRight: 5,
            }}
          />
          <Text
            style={{
              fontStyle: 'italic',
              fontWeight: 300,
              userSelect: 'none',
              borderBottom: importedPayee
                ? `1px dashed ${theme.pageTextSubdued}`
                : 'none',
            }}
          >
            {importedPayee ? (
              <Tooltip
                content={
                  <View style={{ padding: 10 }}>
                    <Text style={{ fontWeight: 'bold' }}>Imported Payee</Text>
                    <Text style={{ fontWeight: 'normal' }}>
                      {importedPayee}
                    </Text>
                  </View>
                }
                style={{ ...styles.tooltip, borderRadius: '0px 5px 5px 0px' }}
                placement="bottom"
                triggerProps={{ delay: 750 }}
              >
                {parentPayee}
              </Tooltip>
            ) : (
              parentPayee
            )}
          </Text>
        </View>
      </CellButton>
    </Cell>
  ) : (
    <CustomCell
      width="flex"
      name="payee"
      textAlign="flex"
      value={payee?.id}
      valueStyle={valueStyle}
      exposed={focused}
      onExpose={name => !isPreview && onEdit(id, name)}
      onUpdate={async value => {
        onUpdate('payee', value);

        if (value && value.startsWith('new:') && !isCreatingPayee.current) {
          isCreatingPayee.current = true;
          const id = await onCreatePayee(value.slice('new:'.length));
          onUpdate('payee', id);
          isCreatingPayee.current = false;
        }
      }}
      formatter={() => getPayeePretty(transaction, payee, transferAccount)}
      unexposedContent={props => {
        const payeeName = (
          <UnexposedCellContent
            {...props}
            style={
              importedPayee
                ? { borderBottom: `1px dashed ${theme.pageTextSubdued}` }
                : {}
            }
          />
        );

        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <PayeeIcons
              transaction={transaction}
              transferAccount={transferAccount}
              onNavigateToTransferAccount={onNavigateToTransferAccount}
              onNavigateToSchedule={onNavigateToSchedule}
            />
            {importedPayee ? (
              <Tooltip
                content={
                  <View style={{ padding: 10 }}>
                    <Text style={{ fontWeight: 'bold' }}>Imported Payee</Text>
                    <Text style={{ fontWeight: 'normal' }}>
                      {importedPayee}
                    </Text>
                  </View>
                }
                style={{ ...styles.tooltip, borderRadius: '0px 5px 5px 0px' }}
                placement="bottom"
                triggerProps={{ delay: 750 }}
              >
                {payeeName}
              </Tooltip>
            ) : (
              payeeName
            )}
          </div>
        );
      }}
    >
      {({
        onBlur,
        onKeyDown,
        onUpdate,
        onSave,
        shouldSaveFromKey,
        inputStyle,
      }) => (
        <PayeeAutocomplete
          payees={payees}
          accounts={accounts}
          value={payee?.id}
          shouldSaveFromKey={shouldSaveFromKey}
          inputProps={{
            onBlur,
            onKeyDown,
            style: inputStyle,
          }}
          showManagePayees={true}
          clearOnBlur={false}
          focused={true}
          onUpdate={(id, value) => onUpdate?.(value)}
          onSelect={onSave}
          onManagePayees={() => onManagePayees(payee?.id)}
          menuPortalTarget={undefined}
        />
      )}
    </CustomCell>
  );
}

function PayeeIcons({
  transaction,
  transferAccount,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
}) {
  const scheduleId = transaction.schedule;
  const scheduleData = useCachedSchedules();
  const schedule =
    scheduleId && scheduleData
      ? scheduleData.schedules.find(s => s.id === scheduleId)
      : null;

  if (schedule == null && transferAccount == null) {
    // Neither a valid scheduled transaction nor a transfer.
    return null;
  }

  const buttonStyle = {
    marginLeft: -5,
    marginRight: 2,
    width: 23,
    height: 23,
    color: 'inherit',
  };

  const scheduleIconStyle = { width: 13, height: 13 };

  const transferIconStyle = { width: 10, height: 10 };

  const recurring = schedule && schedule._date && !!schedule._date.frequency;

  return (
    <>
      {schedule && (
        <Button
          type="bare"
          style={buttonStyle}
          onClick={e => {
            e.stopPropagation();
            onNavigateToSchedule(scheduleId);
          }}
        >
          {recurring ? (
            <SvgArrowsSynchronize style={scheduleIconStyle} />
          ) : (
            <SvgCalendar style={scheduleIconStyle} />
          )}
        </Button>
      )}
      {transferAccount && (
        <Button
          type="bare"
          aria-label="Transfer"
          style={buttonStyle}
          onClick={e => {
            e.stopPropagation();
            if (!isTemporaryId(transaction.id)) {
              onNavigateToTransferAccount(transferAccount.id);
            }
          }}
        >
          {(transaction._inverse ? -1 : 1) * transaction.amount > 0 ? (
            <SvgLeftArrow2 style={transferIconStyle} />
          ) : (
            <SvgRightArrow2 style={transferIconStyle} />
          )}
        </Button>
      )}
    </>
  );
}

const Transaction = memo(function Transaction({
  allTransactions,
  transaction: originalTransaction,
  subtransactions,
  transferAccountsByTransaction,
  editing,
  showAccount,
  showBalance,
  showCleared,
  showZeroInDeposit,
  style,
  selected,
  highlighted,
  added,
  matched,
  expanded,
  focusedField,
  categoryGroups,
  payees,
  accounts,
  balance,
  dateFormat = 'MM/dd/yyyy',
  hideFraction,
  onSave,
  onEdit,
  onDelete,
  onSplit,
  onManagePayees,
  onCreatePayee,
  onToggleSplit,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
  onNotesTagClick,
  splitError,
  listContainerRef,
}) {
  const dispatch = useDispatch();
  const dispatchSelected = useSelectedDispatch();
  const triggerRef = useRef(null);

  const [prevShowZero, setPrevShowZero] = useState(showZeroInDeposit);
  const [prevTransaction, setPrevTransaction] = useState(originalTransaction);
  const [transaction, setTransaction] = useState(() =>
    serializeTransaction(originalTransaction, showZeroInDeposit),
  );
  const isPreview = isPreviewId(transaction.id);

  if (
    originalTransaction !== prevTransaction ||
    showZeroInDeposit !== prevShowZero
  ) {
    setTransaction(
      serializeTransaction(originalTransaction, showZeroInDeposit),
    );
    setPrevTransaction(originalTransaction);
    setPrevShowZero(showZeroInDeposit);
  }

  const [showReconciliationWarning, setShowReconciliationWarning] =
    useState(false);

  function onUpdate(name, value) {
    // Had some issues with this is called twice which is a problem now that we are showing a warning
    // modal if the transaction is locked. I added a boolean to guard against showing the modal twice.
    // I'm still not completely happy with how the cells update pre/post modal. Sometimes you have to
    // click off of the cell manually after confirming your change post modal for example. The last
    // row seems to have more issues than others but the combination of tab, return, and clicking out
    // of the cell all have different implications as well.

    if (transaction[name] !== value) {
      if (
        transaction.reconciled === true &&
        (name === 'credit' ||
          name === 'debit' ||
          name === 'payee' ||
          name === 'account' ||
          name === 'date')
      ) {
        if (showReconciliationWarning === false) {
          setShowReconciliationWarning(true);
          dispatch(
            pushModal('confirm-transaction-edit', {
              onCancel: () => {
                setShowReconciliationWarning(false);
              },
              onConfirm: () => {
                setShowReconciliationWarning(false);
                onUpdateAfterConfirm(name, value);
              },
              confirmReason: 'editReconciled',
            }),
          );
        }
      } else {
        onUpdateAfterConfirm(name, value);
      }
    }

    // Allow un-reconciling (unlocking) transactions
    if (name === 'cleared' && transaction.reconciled) {
      dispatch(
        pushModal('confirm-transaction-edit', {
          onConfirm: () => {
            onUpdateAfterConfirm('reconciled', false);
          },
          confirmReason: 'unlockReconciled',
        }),
      );
    }
  }

  function onUpdateAfterConfirm(name, value) {
    const newTransaction = { ...transaction, [name]: value };

    // Don't change the note to an empty string if it's null (since they are both rendered the same)
    if (name === 'note' && value === '' && transaction.note == null) {
      return;
    }

    if (
      name === 'account' &&
      value &&
      getAccountsById(accounts)[value].offbudget
    ) {
      newTransaction.category = null;
    }

    // If entering an amount in either of the credit/debit fields, we
    // need to clear out the other one so it's always properly
    // translated into the desired amount (see
    // `deserializeTransaction`)
    if (name === 'credit') {
      newTransaction['debit'] = '';
    } else if (name === 'debit') {
      newTransaction['credit'] = '';
    }

    if (name === 'account' && transaction.account !== value) {
      newTransaction.reconciled = false;
    }

    // Don't save a temporary value (a new payee) which will be
    // filled in with a real id later
    if (name === 'payee' && value && value.startsWith('new:')) {
      setTransaction(newTransaction);
    } else {
      const deserialized = deserializeTransaction(
        newTransaction,
        originalTransaction,
      );
      // Run the transaction through the formatting so that we know
      // it's always showing the formatted result
      setTransaction(serializeTransaction(deserialized, showZeroInDeposit));

      const deserializedName = ['credit', 'debit'].includes(name)
        ? 'amount'
        : name;
      onSave(deserialized, subtransactions, deserializedName);
    }
  }

  const {
    id,
    amount,
    debit,
    credit,
    payee: payeeId,
    imported_payee: importedPayee,
    notes,
    date,
    account: accountId,
    category: categoryId,
    cleared,
    reconciled,
    is_parent: isParent,
    _unmatched = false,
    _inverse = false,
  } = transaction;

  // Join in some data
  const payee = payees && payeeId && getPayeesById(payees)[payeeId];
  const account = accounts && accountId && getAccountsById(accounts)[accountId];

  const isChild = transaction.is_child;
  const transferAcct = transferAccountsByTransaction[id];
  const isBudgetTransfer = transferAcct && transferAcct.offbudget === 0;
  const isOffBudget = account && account.offbudget === 1;

  const valueStyle = added ? { fontWeight: 600 } : null;
  const backgroundFocus = focusedField === 'select';
  const amountStyle = hideFraction ? { letterSpacing: -0.5 } : null;

  const runningBalance = !isTemporaryId(id)
    ? balance
    : balance + (_inverse ? -1 : 1) * amount;

  // Ok this entire logic is a dirty, dirty hack.. but let me explain.
  // Problem: the split-error Popover (which has the buttons to distribute/add split)
  // renders before schedules are added to the table. After schedules finally load
  // the entire table gets pushed down. But the Popover does not re-calculate
  // its positioning. This is because there is nothing in react-aria that would be
  // watching for the position of the trigger element.
  // Solution: when transactions (this includes schedules) change - we increment
  // a variable (with a small delay in order for the next render cycle to pick up
  // the change instead of the current). We pass the integer to the Popover which
  // causes it to re-calculate the positioning. Thus fixing the problem.
  const [updateId, setUpdateId] = useState(1);
  useEffect(() => {
    // The hack applies to only transactions with split errors
    if (!splitError) {
      return;
    }

    setTimeout(() => {
      setUpdateId(state => state + 1);
    }, 1);
  }, [splitError, allTransactions]);

  return (
    <Row
      ref={triggerRef}
      style={{
        backgroundColor: selected
          ? theme.tableRowBackgroundHighlight
          : backgroundFocus
            ? theme.tableRowBackgroundHover
            : theme.tableBackground,
        ':hover': !(backgroundFocus || selected) && {
          backgroundColor: theme.tableRowBackgroundHover,
        },
        '& .hover-visible': {
          opacity: 0,
        },
        ':hover .hover-visible': {
          opacity: 1,
        },
        ...(highlighted || selected
          ? { color: theme.tableRowBackgroundHighlightText }
          : { color: theme.tableText }),
        ...style,
        ...(isPreview && {
          color: theme.tableTextInactive,
          fontStyle: 'italic',
        }),
        ...(_unmatched && { opacity: 0.5 }),
      }}
    >
      {splitError && listContainerRef.current && (
        <Popover
          arrowSize={updateId}
          triggerRef={triggerRef}
          isOpen
          isNonModal
          style={{ width: 375, padding: 5, maxHeight: '38px !important' }}
          shouldFlip={false}
          placement="bottom end"
          UNSTABLE_portalContainer={listContainerRef.current}
        >
          {splitError}
        </Popover>
      )}

      {isChild && (
        <Field
          /* Checkmark blank placeholder for Child transaction */
          width={110}
          style={{
            width: 110,
            backgroundColor: theme.tableRowBackgroundHover,
            border: 0, // known z-order issue, bottom border for parent transaction hidden
          }}
        />
      )}

      {isChild && showAccount && (
        <Field
          /* Account blank placeholder for Child transaction */
          style={{
            flex: 1,
            backgroundColor: theme.tableRowBackgroundHover,
            border: 0,
          }}
        />
      )}

      {/* Checkmark - for Child transaction
      between normal Date and Payee or Account and Payee if needed */}
      {isTemporaryId(transaction.id) ? (
        isChild ? (
          <DeleteCell
            onDelete={() => onDelete && onDelete(transaction.id)}
            exposed={editing}
            style={{ ...(isChild && { borderLeftWidth: 1 }), lineHeight: 0 }}
          />
        ) : (
          <Cell width={20} />
        )
      ) : (
        <SelectCell
          /* Checkmark field for non-child transaction */
          exposed
          buttonProps={{
            className: selected || editing ? null : 'hover-visible',
          }}
          focused={focusedField === 'select'}
          onSelect={e => {
            dispatchSelected({ type: 'select', id: transaction.id, event: e });
          }}
          onEdit={() => onEdit(id, 'select')}
          selected={selected}
          style={{ ...(isChild && { borderLeftWidth: 1 }) }}
          value={
            matched && (
              <SvgHyperlink2
                style={{ width: 13, height: 13, color: 'inherit' }}
              />
            )
          }
        />
      )}
      {!isChild && (
        <CustomCell
          /* Date field for non-child transaction */
          name="date"
          width={110}
          textAlign="flex"
          exposed={focusedField === 'date'}
          value={date}
          valueStyle={valueStyle}
          formatter={date =>
            date ? formatDate(parseISO(date), dateFormat) : ''
          }
          onExpose={name => !isPreview && onEdit(id, name)}
          onUpdate={value => {
            onUpdate('date', value);
          }}
        >
          {({
            onBlur,
            onKeyDown,
            onUpdate,
            onSave,
            shouldSaveFromKey,
            inputStyle,
          }) => (
            <DateSelect
              value={date || ''}
              dateFormat={dateFormat}
              inputProps={{ onBlur, onKeyDown, style: inputStyle }}
              shouldSaveFromKey={shouldSaveFromKey}
              clearOnBlur={true}
              onUpdate={onUpdate}
              onSelect={onSave}
            />
          )}
        </CustomCell>
      )}

      {!isChild && showAccount && (
        <CustomCell
          /* Account field for non-child transaction */
          name="account"
          width="flex"
          textAlign="flex"
          value={accountId}
          formatter={acctId => {
            const acct = acctId && getAccountsById(accounts)[acctId];
            if (acct) {
              return acct.name;
            }
            return '';
          }}
          valueStyle={valueStyle}
          exposed={focusedField === 'account'}
          onExpose={name => !isPreview && onEdit(id, name)}
          onUpdate={async value => {
            // Only ever allow non-null values
            if (value) {
              onUpdate('account', value);
            }
          }}
        >
          {({
            onBlur,
            onKeyDown,
            onUpdate,
            onSave,
            shouldSaveFromKey,
            inputStyle,
          }) => (
            <AccountAutocomplete
              includeClosedAccounts={false}
              value={accountId}
              accounts={accounts}
              shouldSaveFromKey={shouldSaveFromKey}
              clearOnBlur={false}
              focused={true}
              inputProps={{ onBlur, onKeyDown, style: inputStyle }}
              onUpdate={onUpdate}
              onSelect={onSave}
              menuPortalTarget={undefined}
            />
          )}
        </CustomCell>
      )}
      {(() => (
        <PayeeCell
          /* Payee field for all transactions */
          id={id}
          payee={payee}
          focused={focusedField === 'payee'}
          /* Filter out the account we're currently in as it is not a valid transfer */
          accounts={accounts.filter(account => account.id !== accountId)}
          payees={payees.filter(payee => payee.transfer_acct !== accountId)}
          valueStyle={valueStyle}
          transaction={transaction}
          subtransactions={subtransactions}
          transferAccountsByTransaction={transferAccountsByTransaction}
          importedPayee={importedPayee}
          isPreview={isPreview}
          onEdit={onEdit}
          onUpdate={onUpdate}
          onCreatePayee={onCreatePayee}
          onManagePayees={onManagePayees}
          onNavigateToTransferAccount={onNavigateToTransferAccount}
          onNavigateToSchedule={onNavigateToSchedule}
        />
      ))()}

      {isPreview ? (
        /* Notes field for all transactions */
        <Cell name="notes" width="flex" />
      ) : (
        <InputCell
          width="flex"
          name="notes"
          textAlign="flex"
          exposed={focusedField === 'notes'}
          focused={focusedField === 'notes'}
          value={notes || ''}
          valueStyle={valueStyle}
          formatter={value => notesTagFormatter(value, onNotesTagClick)}
          onExpose={name => !isPreview && onEdit(id, name)}
          inputProps={{
            value: notes || '',
            onUpdate: onUpdate.bind(null, 'notes'),
          }}
        />
      )}

      {isPreview ? (
        // Category field for preview transactions
        <Cell width="flex" style={{ alignItems: 'flex-start' }} exposed={true}>
          {() => (
            <View
              style={{
                color:
                  notes === 'missed'
                    ? theme.errorText
                    : notes === 'due'
                      ? theme.warningText
                      : selected
                        ? theme.formLabelText
                        : theme.upcomingText,
                backgroundColor:
                  notes === 'missed'
                    ? theme.errorBackground
                    : notes === 'due'
                      ? theme.warningBackground
                      : selected
                        ? theme.formLabelBackground
                        : theme.upcomingBackground,
                margin: '0 5px',
                padding: '3px 7px',
                borderRadius: 4,
              }}
            >
              {titleFirst(notes)}
            </View>
          )}
        </Cell>
      ) : isParent ? (
        <Cell
          /* Category field (Split button) for parent transactions */
          name="category"
          width="flex"
          focused={focusedField === 'category'}
          style={{ padding: 0 }}
          plain
        >
          <CellButton
            bare
            style={{
              alignSelf: 'flex-start',
              borderRadius: 4,
              border: '1px solid transparent', // so it doesn't shift on hover
              ':hover': {
                border: '1px solid ' + theme.buttonNormalBorder,
              },
            }}
            disabled={isTemporaryId(transaction.id)}
            onEdit={() => onEdit(id, 'category')}
            onSelect={() => onToggleSplit(id)}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'stretch',
                borderRadius: 4,
                flex: 1,
                padding: 4,
                color: theme.pageTextSubdued,
              }}
            >
              {isParent && (
                <SvgCheveronDown
                  style={{
                    color: 'inherit',
                    width: 14,
                    height: 14,
                    transition: 'transform .08s',
                    transform: expanded ? 'rotateZ(0)' : 'rotateZ(-90deg)',
                  }}
                />
              )}
              <Text
                style={{
                  fontStyle: 'italic',
                  fontWeight: 300,
                  userSelect: 'none',
                }}
              >
                Split
              </Text>
            </View>
          </CellButton>
        </Cell>
      ) : isBudgetTransfer || isOffBudget || isPreview ? (
        <InputCell
          /* Category field for transfer and off-budget transactions
     (NOT preview, it is covered first) */
          name="category"
          width="flex"
          exposed={focusedField === 'category'}
          focused={focusedField === 'category'}
          onExpose={name => !isPreview && onEdit(id, name)}
          value={
            isParent
              ? 'Split'
              : isOffBudget
                ? 'Off Budget'
                : isBudgetTransfer
                  ? 'Transfer'
                  : ''
          }
          valueStyle={valueStyle}
          style={{
            fontStyle: 'italic',
            color: theme.pageTextSubdued,
            fontWeight: 300,
          }}
          inputProps={{
            readOnly: true,
            style: { fontStyle: 'italic' },
          }}
        />
      ) : (
        <CustomCell
          /* Category field for normal and child transactions */
          name="category"
          width="flex"
          textAlign="flex"
          value={categoryId}
          formatter={value =>
            value
              ? getDisplayValue(
                  getCategoriesById(categoryGroups)[value],
                  'name',
                )
              : transaction.id
                ? 'Categorize'
                : ''
          }
          exposed={focusedField === 'category'}
          onExpose={name => onEdit(id, name)}
          valueStyle={
            !categoryId
              ? {
                  // uncategorized transaction
                  fontStyle: 'italic',
                  fontWeight: 300,
                  color: theme.formInputTextHighlight,
                }
              : valueStyle
          }
          onUpdate={async value => {
            if (value === 'split') {
              onSplit(transaction.id);
            } else {
              onUpdate('category', value);
            }
          }}
        >
          {({
            onBlur,
            onKeyDown,
            onUpdate,
            onSave,
            shouldSaveFromKey,
            inputStyle,
          }) => (
            <NamespaceContext.Provider
              value={monthUtils.sheetForMonth(
                monthUtils.monthFromDate(transaction.date),
              )}
            >
              <CategoryAutocomplete
                categoryGroups={categoryGroups}
                value={categoryId}
                focused={true}
                clearOnBlur={false}
                showSplitOption={!isChild && !isParent}
                shouldSaveFromKey={shouldSaveFromKey}
                inputProps={{ onBlur, onKeyDown, style: inputStyle }}
                onUpdate={onUpdate}
                onSelect={onSave}
                menuPortalTarget={undefined}
                showHiddenCategories={false}
              />
            </NamespaceContext.Provider>
          )}
        </CustomCell>
      )}

      <InputCell
        /* Debit field for all transactions */
        type="input"
        width={100}
        name="debit"
        exposed={focusedField === 'debit'}
        focused={focusedField === 'debit'}
        value={debit === '' && credit === '' ? '0.00' : debit}
        valueStyle={valueStyle}
        textAlign="right"
        title={debit}
        onExpose={name => !isPreview && onEdit(id, name)}
        style={{
          ...(isParent && { fontStyle: 'italic' }),
          ...styles.tnum,
          ...amountStyle,
        }}
        inputProps={{
          value: debit === '' && credit === '' ? '0.00' : debit,
          onUpdate: onUpdate.bind(null, 'debit'),
        }}
        privacyFilter={{
          activationFilters: [!isTemporaryId(transaction.id)],
        }}
      />

      <InputCell
        /* Credit field for all transactions */
        type="input"
        width={100}
        name="credit"
        exposed={focusedField === 'credit'}
        focused={focusedField === 'credit'}
        value={credit}
        valueStyle={valueStyle}
        textAlign="right"
        title={credit}
        onExpose={name => !isPreview && onEdit(id, name)}
        style={{
          ...(isParent && { fontStyle: 'italic' }),
          ...styles.tnum,
          ...amountStyle,
        }}
        inputProps={{
          value: credit,
          onUpdate: onUpdate.bind(null, 'credit'),
        }}
        privacyFilter={{
          activationFilters: [!isTemporaryId(transaction.id)],
        }}
      />

      {showBalance && (
        <Cell
          /* Balance field for all transactions */
          name="balance"
          value={
            runningBalance == null || isChild
              ? ''
              : integerToCurrency(runningBalance)
          }
          valueStyle={{
            color: runningBalance < 0 ? theme.errorText : theme.noticeTextLight,
          }}
          style={{ ...styles.tnum, ...amountStyle }}
          width={103}
          textAlign="right"
          privacyFilter
        />
      )}

      {showCleared && (
        <StatusCell
          /* Icon field for all transactions */
          id={id}
          focused={focusedField === 'cleared'}
          selected={selected}
          isPreview={isPreview}
          status={
            isPreview
              ? notes
              : reconciled
                ? 'reconciled'
                : cleared
                  ? 'cleared'
                  : null
          }
          isChild={isChild}
          onEdit={onEdit}
          onUpdate={onUpdate}
        />
      )}

      <Cell width={5} />
    </Row>
  );
});

function TransactionError({
  error,
  isDeposit,
  onAddSplit,
  onDistributeRemainder,
  style,
  canDistributeRemainder,
}) {
  switch (error.type) {
    case 'SplitTransactionError':
      if (error.version === 1) {
        return (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: '0 5px',
              ...style,
            }}
            data-testid="transaction-error"
          >
            <Text>
              Amount left:{' '}
              <Text style={{ fontWeight: 500 }}>
                {integerToCurrency(
                  isDeposit ? error.difference : -error.difference,
                )}
              </Text>
            </Text>
            <View style={{ flex: 1 }} />
            <Button
              type="normal"
              style={{ marginLeft: 15 }}
              onClick={onDistributeRemainder}
              data-testid="distribute-split-button"
              disabled={!canDistributeRemainder}
            >
              Distribute
            </Button>
            <Button
              type="primary"
              style={{ marginLeft: 10, padding: '4px 10px' }}
              onClick={onAddSplit}
              data-testid="add-split-button"
            >
              Add Split
            </Button>
          </View>
        );
      }
      break;
    default:
      return null;
  }
}

function makeTemporaryTransactions(
  currentAccountId,
  currentCategoryId,
  lastDate,
) {
  return [
    {
      id: 'temp',
      date: lastDate || currentDay(),
      account: currentAccountId || null,
      category: currentCategoryId || null,
      cleared: false,
      amount: null,
    },
  ];
}

function NewTransaction({
  transactions,
  accounts,
  categoryGroups,
  payees,
  transferAccountsByTransaction,
  editingTransaction,
  focusedField,
  showAccount,
  showCategory,
  showBalance,
  showCleared,
  dateFormat,
  hideFraction,
  onClose,
  onSplit,
  onEdit,
  onDelete,
  onSave,
  onAdd,
  onAddSplit,
  onDistributeRemainder,
  onManagePayees,
  onCreatePayee,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
  onNotesTagClick,
  balance,
}) {
  const error = transactions[0].error;
  const isDeposit = transactions[0].amount > 0;

  const childTransactions = transactions.filter(
    t => t.parent_id === transactions[0].id,
  );
  const emptyChildTransactions = childTransactions.filter(t => t.amount === 0);

  return (
    <View
      style={{
        borderBottom: '1px solid ' + theme.tableBorderHover,
        paddingBottom: 6,
        backgroundColor: theme.tableBackground,
      }}
      data-testid="new-transaction"
      onKeyDown={e => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      {transactions.map(transaction => (
        <Transaction
          isNew
          key={transaction.id}
          editing={editingTransaction === transaction.id}
          transaction={transaction}
          subtransactions={transaction.is_parent ? childTransactions : null}
          transferAccountsByTransaction={transferAccountsByTransaction}
          showAccount={showAccount}
          showCategory={showCategory}
          showBalance={showBalance}
          showCleared={showCleared}
          focusedField={editingTransaction === transaction.id && focusedField}
          showZeroInDeposit={isDeposit}
          accounts={accounts}
          categoryGroups={categoryGroups}
          payees={payees}
          dateFormat={dateFormat}
          hideFraction={hideFraction}
          expanded={true}
          onEdit={onEdit}
          onSave={onSave}
          onSplit={onSplit}
          onDelete={onDelete}
          onAdd={onAdd}
          onManagePayees={onManagePayees}
          onCreatePayee={onCreatePayee}
          style={{ marginTop: -1 }}
          onNavigateToTransferAccount={onNavigateToTransferAccount}
          onNavigateToSchedule={onNavigateToSchedule}
          onNotesTagClick={onNotesTagClick}
          balance={balance}
        />
      ))}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginTop: 6,
          marginRight: 20,
        }}
      >
        <Button
          style={{ marginRight: 10, padding: '4px 10px' }}
          onClick={() => onClose()}
          data-testid="cancel-button"
        >
          Cancel
        </Button>
        {error ? (
          <TransactionError
            error={error}
            isDeposit={isDeposit}
            onAddSplit={() => onAddSplit(transactions[0].id)}
            onDistributeRemainder={() =>
              onDistributeRemainder(transactions[0].id)
            }
            canDistributeRemainder={emptyChildTransactions.length > 0}
          />
        ) : (
          <Button
            type="primary"
            style={{ padding: '4px 10px' }}
            onClick={onAdd}
            data-testid="add-button"
          >
            Add
          </Button>
        )}
      </View>
    </View>
  );
}

function TransactionTableInner({
  tableNavigator,
  tableRef,
  listContainerRef,
  dateFormat = 'MM/dd/yyyy',
  newNavigator,
  renderEmpty,
  onScroll,
  ...props
}) {
  const containerRef = createRef();
  const isAddingPrev = usePrevious(props.isAdding);
  const [scrollWidth, setScrollWidth] = useState(0);

  function saveScrollWidth(parent, child) {
    const width = parent > 0 && child > 0 && parent - child;

    setScrollWidth(!width ? 0 : width);
  }

  const onNavigateToTransferAccount = useCallback(
    accountId => {
      props.onCloseAddTransaction();
      props.onNavigateToTransferAccount(accountId);
    },
    [props.onCloseAddTransaction, props.onNavigateToTransferAccount],
  );

  const onNavigateToSchedule = useCallback(
    scheduleId => {
      props.onCloseAddTransaction();
      props.onNavigateToSchedule(scheduleId);
    },
    [props.onCloseAddTransaction, props.onNavigateToSchedule],
  );

  const onNotesTagClick = useCallback(
    noteTag => {
      props.onCloseAddTransaction();
      props.onNotesTagClick(noteTag);
    },
    [props.onCloseAddTransaction, props.onNotesTagClick],
  );

  useEffect(() => {
    if (!isAddingPrev && props.isAdding) {
      newNavigator.onEdit('temp', 'date');
    }
  }, [isAddingPrev, props.isAdding, newNavigator]);

  const renderRow = ({ item, index, editing }) => {
    const {
      transactions,
      selectedItems,
      accounts,
      categoryGroups,
      payees,
      showCleared,
      showAccount,
      showCategory,
      showBalances,
      balances,
      hideFraction,
      isNew,
      isMatched,
      isExpanded,
    } = props;

    const trans = item;
    const selected = selectedItems.has(trans.id);

    const parent = props.transactionMap.get(trans.parent_id);
    const isChildDeposit = parent && parent.amount > 0;
    const expanded = isExpanded && isExpanded((parent || trans).id);

    // For backwards compatibility, read the error of the transaction
    // since in previous versions we stored it there. In the future we
    // can simplify this to just the parent
    const error = expanded
      ? (parent && parent.error) || trans.error
      : trans.error;

    const hasSplitError =
      (!expanded || isLastChild(transactions, index)) &&
      error &&
      error.type === 'SplitTransactionError';

    const childTransactions = trans.is_parent
      ? props.transactionsByParent[trans.id]
      : null;
    const emptyChildTransactions = props.transactionsByParent[
      trans.is_parent ? trans.id : trans.parent_id
    ]?.filter(t => t.amount === 0);

    return (
      <Transaction
        allTransactions={props.transactions}
        editing={editing}
        transaction={trans}
        transferAccountsByTransaction={props.transferAccountsByTransaction}
        subtransactions={childTransactions}
        showAccount={showAccount}
        showCategory={showCategory}
        showBalance={showBalances}
        showCleared={showCleared}
        selected={selected}
        highlighted={false}
        added={isNew?.(trans.id)}
        expanded={isExpanded?.(trans.id)}
        matched={isMatched?.(trans.id)}
        showZeroInDeposit={isChildDeposit}
        balance={balances?.[trans.id]?.balance}
        focusedField={editing && tableNavigator.focusedField}
        accounts={accounts}
        categoryGroups={categoryGroups}
        payees={payees}
        dateFormat={dateFormat}
        hideFraction={hideFraction}
        onEdit={tableNavigator.onEdit}
        onSave={props.onSave}
        onDelete={props.onDelete}
        onSplit={props.onSplit}
        onManagePayees={props.onManagePayees}
        onCreatePayee={props.onCreatePayee}
        onToggleSplit={props.onToggleSplit}
        onNavigateToTransferAccount={onNavigateToTransferAccount}
        onNavigateToSchedule={onNavigateToSchedule}
        onNotesTagClick={onNotesTagClick}
        splitError={
          hasSplitError && (
            <TransactionError
              error={error}
              isDeposit={isChildDeposit}
              onAddSplit={() => props.onAddSplit(trans.id)}
              onDistributeRemainder={() =>
                props.onDistributeRemainder(trans.id)
              }
              canDistributeRemainder={emptyChildTransactions.length > 0}
            />
          )
        }
        listContainerRef={listContainerRef}
      />
    );
  };

  return (
    <View
      innerRef={containerRef}
      style={{
        flex: 1,
        cursor: 'default',
        ...props.style,
      }}
    >
      <View>
        <TransactionHeader
          hasSelected={props.selectedItems.size > 0}
          showAccount={props.showAccount}
          showCategory={props.showCategory}
          showBalance={props.showBalances}
          showCleared={props.showCleared}
          scrollWidth={scrollWidth}
          onSort={props.onSort}
          ascDesc={props.ascDesc}
          field={props.sortField}
        />

        {props.isAdding && (
          <View
            {...newNavigator.getNavigatorProps({
              onKeyDown: e => props.onCheckNewEnter(e),
            })}
          >
            <NewTransaction
              transactions={props.newTransactions}
              transferAccountsByTransaction={
                props.transferAccountsByTransaction
              }
              editingTransaction={newNavigator.editingId}
              focusedField={newNavigator.focusedField}
              accounts={props.accounts}
              categoryGroups={props.categoryGroups}
              payees={props.payees || []}
              showAccount={props.showAccount}
              showCategory={props.showCategory}
              showBalance={props.showBalances}
              showCleared={props.showCleared}
              dateFormat={dateFormat}
              hideFraction={props.hideFraction}
              onClose={props.onCloseAddTransaction}
              onAdd={props.onAddTemporary}
              onAddSplit={props.onAddSplit}
              onSplit={props.onSplit}
              onEdit={newNavigator.onEdit}
              onSave={props.onSave}
              onDelete={props.onDelete}
              onManagePayees={props.onManagePayees}
              onCreatePayee={props.onCreatePayee}
              onNavigateToTransferAccount={onNavigateToTransferAccount}
              onNavigateToSchedule={onNavigateToSchedule}
              onNotesTagClick={onNotesTagClick}
              onDistributeRemainder={props.onDistributeRemainder}
              balance={
                props.transactions?.length > 0
                  ? props.balances?.[props.transactions[0]?.id]?.balance
                  : 0
              }
            />
          </View>
        )}
      </View>
      {/*// * On Windows, makes the scrollbar always appear
         //   the full height of the container ??? */}

      <View
        style={{ flex: 1, overflow: 'hidden' }}
        data-testid="transaction-table"
      >
        <Table
          navigator={tableNavigator}
          ref={tableRef}
          listContainerRef={listContainerRef}
          items={props.transactions}
          renderItem={renderRow}
          renderEmpty={renderEmpty}
          loadMore={props.loadMoreTransactions}
          isSelected={id => props.selectedItems.has(id)}
          onKeyDown={e => props.onCheckEnter(e)}
          onScroll={onScroll}
          saveScrollWidth={saveScrollWidth}
        />

        {props.isAdding && (
          <div
            key="shadow"
            style={{
              position: 'absolute',
              top: -20,
              left: 0,
              right: 0,
              height: 20,
              backgroundColor: theme.errorText,
              boxShadow: '0 0 6px rgba(0, 0, 0, .20)',
            }}
          />
        )}
      </View>
    </View>
  );
}

export const TransactionTable = forwardRef((props, ref) => {
  const [newTransactions, setNewTransactions] = useState(null);
  const [prevIsAdding, setPrevIsAdding] = useState(false);
  const splitsExpanded = useSplitsExpanded();
  const prevSplitsExpanded = useRef(null);

  const tableRef = useRef(null);
  const listContainerRef = useRef(null);
  const mergedRef = useMergedRefs(tableRef, ref);

  const transactionsWithExpandedSplits = useMemo(() => {
    let result;
    if (splitsExpanded.state.transitionId != null) {
      const index = props.transactions.findIndex(
        t => t.id === splitsExpanded.state.transitionId,
      );
      result = props.transactions.filter((t, idx) => {
        if (t.parent_id) {
          if (idx >= index) {
            return splitsExpanded.expanded(t.parent_id);
          } else if (prevSplitsExpanded.current) {
            return prevSplitsExpanded.current.expanded(t.parent_id);
          }
        }
        return true;
      });
    } else {
      if (
        prevSplitsExpanded.current &&
        prevSplitsExpanded.current.state.transitionId != null
      ) {
        tableRef.current.anchor();
        tableRef.current.setRowAnimation(false);
      }
      prevSplitsExpanded.current = splitsExpanded;

      result = props.transactions.filter(t => {
        if (t.parent_id) {
          return splitsExpanded.expanded(t.parent_id);
        }
        return true;
      });
    }

    prevSplitsExpanded.current = splitsExpanded;
    return result;
  }, [props.transactions, splitsExpanded]);
  const transactionMap = useMemo(() => {
    return new Map(
      transactionsWithExpandedSplits.map(trans => [trans.id, trans]),
    );
  }, [transactionsWithExpandedSplits]);
  const transactionsByParent = useMemo(() => {
    return props.transactions.reduce((acc, trans) => {
      if (trans.is_child) {
        acc[trans.parent_id] = [...(acc[trans.parent_id] ?? []), trans];
      }
      return acc;
    }, {});
  }, [props.transactions]);

  const transferAccountsByTransaction = useMemo(() => {
    if (!props.accounts) {
      return {};
    }
    const accounts = getAccountsById(props.accounts);
    const payees = getPayeesById(props.payees);

    return Object.fromEntries(
      props.transactions.map(t => {
        if (!props.accounts) {
          return [t.id, null];
        }

        const payee = t.payee && payees[t.payee];
        let transferAccount;
        if (t._inverse) {
          transferAccount = t.account && accounts[t.account];
        } else {
          transferAccount =
            payee?.transfer_acct && accounts[payee.transfer_acct];
        }
        return [t.id, transferAccount || null];
      }),
    );
  }, [props.transactions, props.payees, props.accounts]);

  useEffect(() => {
    // If it's anchored that means we've also disabled animations. To
    // reduce the chance for side effect collision, only do this if
    // we've actually anchored it
    if (tableRef.current.isAnchored()) {
      tableRef.current.unanchor();
      tableRef.current.setRowAnimation(true);
    }
  }, [prevSplitsExpanded.current]);

  const newNavigator = useTableNavigator(newTransactions, getFields);
  const tableNavigator = useTableNavigator(
    transactionsWithExpandedSplits,
    getFields,
  );
  const shouldAdd = useRef(false);
  const latestState = useRef({ newTransactions, newNavigator, tableNavigator });
  const savePending = useRef(false);
  const afterSaveFunc = useRef(false);
  const [_, forceRerender] = useState({});
  const selectedItems = useSelectedItems();

  useLayoutEffect(() => {
    latestState.current = {
      newTransactions,
      newNavigator,
      tableNavigator,
      transactions: props.transactions,
    };
  });

  // Derive new transactions from the `isAdding` prop
  if (prevIsAdding !== props.isAdding) {
    if (!prevIsAdding && props.isAdding) {
      setNewTransactions(
        makeTemporaryTransactions(
          props.currentAccountId,
          props.currentCategoryId,
        ),
      );
    }
    setPrevIsAdding(props.isAdding);
  }

  useEffect(() => {
    if (shouldAdd.current) {
      if (newTransactions[0].account == null) {
        props.addNotification({
          type: 'error',
          message: 'Account is a required field',
        });
        newNavigator.onEdit('temp', 'account');
      } else {
        const transactions = latestState.current.newTransactions;
        const lastDate = transactions.length > 0 ? transactions[0].date : null;
        setNewTransactions(
          makeTemporaryTransactions(
            props.currentAccountId,
            props.currentCategoryId,
            lastDate,
          ),
        );
        newNavigator.onEdit('temp', 'date');
        props.onAdd(transactions);
      }
      shouldAdd.current = false;
    }
  });

  useEffect(() => {
    if (savePending.current && afterSaveFunc.current) {
      afterSaveFunc.current(props);
      afterSaveFunc.current = null;
    }

    savePending.current = false;
  }, [newTransactions, props.transactions]);

  function getFields(item) {
    let fields = [
      'select',
      'date',
      'account',
      'payee',
      'notes',
      'category',
      'debit',
      'credit',
      'cleared',
    ];

    fields = item.is_child
      ? ['select', 'payee', 'notes', 'category', 'debit', 'credit']
      : fields.filter(
          f =>
            (props.showAccount || f !== 'account') &&
            (props.showCategory || f !== 'category'),
        );

    if (isPreviewId(item.id)) {
      fields = ['select'];
    }
    if (isTemporaryId(item.id)) {
      // You can't focus the select/delete button of temporary
      // transactions
      fields = fields.slice(1);
    }

    return fields;
  }

  function afterSave(func) {
    if (savePending.current) {
      afterSaveFunc.current = func;
    } else {
      func(props);
    }
  }

  function onCheckNewEnter(e) {
    if (e.key === 'Enter') {
      if (e.metaKey) {
        e.stopPropagation();
        onAddTemporary();
      } else if (!e.shiftKey) {
        function getLastTransaction(state) {
          const { newTransactions } = state.current;
          return newTransactions[newTransactions.length - 1];
        }

        // Right now, the table navigator does some funky stuff with
        // focus, so we want to stop it from handling this event. We
        // still want enter to move up/down normally, so we only stop
        // it if we are on the last transaction (where we are about to
        // do some logic). I don't like this.
        if (newNavigator.editingId === getLastTransaction(latestState).id) {
          e.stopPropagation();
        }

        afterSave(() => {
          const lastTransaction = getLastTransaction(latestState);
          const isSplit =
            lastTransaction.parent_id || lastTransaction.is_parent;

          if (
            latestState.current.newTransactions[0].error &&
            newNavigator.editingId === lastTransaction.id
          ) {
            // add split
            onAddSplit(lastTransaction.id);
          } else if (
            newNavigator.editingId === lastTransaction.id &&
            (!isSplit || !lastTransaction.error)
          ) {
            onAddTemporary();
          }
        });
      }
    }
  }

  function onCheckEnter(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      const { editingId: id, focusedField } = tableNavigator;

      afterSave(() => {
        const transactions = latestState.current.transactions;
        const idx = transactions.findIndex(t => t.id === id);
        const parent = transactions.find(
          t => t.id === transactions[idx]?.parent_id,
        );

        if (
          isLastChild(transactions, idx) &&
          parent &&
          parent.error &&
          focusedField !== 'select'
        ) {
          e.stopPropagation();
          onAddSplit(id);
        }
      });
    }
  }

  const onAddTemporary = useCallback(() => {
    shouldAdd.current = true;
    // A little hacky - this forces a rerender which will cause the
    // effect we want to run. We have to wait for all updates to be
    // committed (the input could still be saving a value).
    forceRerender({});
  }, [props.onAdd, newNavigator.onEdit]);

  const onSave = useCallback(
    async (transaction, subtransactions = null, updatedFieldName = null) => {
      savePending.current = true;

      let groupedTransaction = subtransactions
        ? groupTransaction([transaction, ...subtransactions])
        : transaction;

      if (isTemporaryId(transaction.id)) {
        if (props.onApplyRules) {
          groupedTransaction = await props.onApplyRules(
            groupedTransaction,
            updatedFieldName,
          );
        }

        const newTrans = latestState.current.newTransactions;
        // Future refactor: we shouldn't need to iterate through the entire
        // transaction list to ungroup, just the new transactions.
        setNewTransactions(
          ungroupTransactions(
            updateTransaction(newTrans, groupedTransaction).data,
          ),
        );
      } else {
        props.onSave(groupedTransaction);
      }
    },
    [props.onSave],
  );

  const onDelete = useCallback(id => {
    const temporary = isTemporaryId(id);

    if (temporary) {
      const newTrans = latestState.current.newTransactions;

      if (id === newTrans[0].id) {
        // You can never delete the parent new transaction
        return;
      }

      setNewTransactions(deleteTransaction(newTrans, id).data);
    }
  }, []);

  const onSplit = useMemo(() => {
    return id => {
      if (isTemporaryId(id)) {
        const { newNavigator } = latestState.current;
        const newTrans = latestState.current.newTransactions;
        const { data, diff } = splitTransaction(newTrans, id);
        setNewTransactions(data);

        // Jump next to "debit" field if it is empty
        // Otherwise jump to the same field as before, but downwards
        // to the added split transaction
        if (newTrans[0].amount === null) {
          newNavigator.onEdit(newTrans[0].id, 'debit');
        } else {
          newNavigator.onEdit(
            diff.added[0].id,
            latestState.current.newNavigator.focusedField,
          );
        }
      } else {
        const trans = latestState.current.transactions.find(t => t.id === id);
        const newId = props.onSplit(id);

        splitsExpanded.dispatch({ type: 'open-split', id: trans.id });

        const { tableNavigator } = latestState.current;
        if (trans.amount === null) {
          tableNavigator.onEdit(trans.id, 'debit');
        } else {
          tableNavigator.onEdit(newId, tableNavigator.focusedField);
        }
      }
    };
  }, [props.onSplit, splitsExpanded.dispatch]);

  const onAddSplit = useCallback(
    id => {
      if (isTemporaryId(id)) {
        const newTrans = latestState.current.newTransactions;
        const { data, diff } = addSplitTransaction(newTrans, id);
        setNewTransactions(data);
        newNavigator.onEdit(
          diff.added[0].id,
          latestState.current.newNavigator.focusedField,
        );
      } else {
        const newId = props.onAddSplit(id);
        tableNavigator.onEdit(
          newId,
          latestState.current.tableNavigator.focusedField,
        );
      }
    },
    [props.onAddSplit],
  );

  const onDistributeRemainder = useCallback(
    async id => {
      const { transactions, tableNavigator, newTransactions } =
        latestState.current;

      const targetTransactions = isTemporaryId(id)
        ? newTransactions
        : transactions;
      const transaction = targetTransactions.find(t => t.id === id);

      const parentTransaction = transaction.is_parent
        ? transaction
        : targetTransactions.find(t => t.id === transaction.parent_id);

      const siblingTransactions = targetTransactions.filter(
        t =>
          t.parent_id ===
          (transaction.is_parent ? transaction.id : transaction.parent_id),
      );

      const emptyTransactions = siblingTransactions.filter(t => t.amount === 0);

      const remainingAmount =
        parentTransaction.amount -
        siblingTransactions.reduce((acc, t) => acc + t.amount, 0);

      const amountPerTransaction = Math.floor(
        remainingAmount / emptyTransactions.length,
      );
      let remainingCents =
        remainingAmount - amountPerTransaction * emptyTransactions.length;

      const amounts = new Array(emptyTransactions.length).fill(
        amountPerTransaction,
      );

      for (const amountIndex in amounts) {
        if (remainingCents === 0) break;

        amounts[amountIndex] += 1;
        remainingCents--;
      }

      if (isTemporaryId(id)) {
        newNavigator.onEdit(null);
      } else {
        tableNavigator.onEdit(null);
      }

      for (const transactionIndex in emptyTransactions) {
        await onSave({
          ...emptyTransactions[transactionIndex],
          amount: amounts[transactionIndex],
        });
      }
    },
    [latestState],
  );

  function onCloseAddTransaction() {
    setNewTransactions(
      makeTemporaryTransactions(
        props.currentAccountId,
        props.currentCategoryId,
      ),
    );
    props.onCloseAddTransaction();
  }

  const onToggleSplit = useCallback(
    id => splitsExpanded.dispatch({ type: 'toggle-split', id }),
    [splitsExpanded.dispatch],
  );

  return (
    <TransactionTableInner
      tableRef={mergedRef}
      listContainerRef={listContainerRef}
      {...props}
      transactions={transactionsWithExpandedSplits}
      transactionMap={transactionMap}
      transactionsByParent={transactionsByParent}
      transferAccountsByTransaction={transferAccountsByTransaction}
      selectedItems={selectedItems}
      isExpanded={splitsExpanded.expanded}
      onSave={onSave}
      onDelete={onDelete}
      onSplit={onSplit}
      onCheckNewEnter={onCheckNewEnter}
      onCheckEnter={onCheckEnter}
      onAddTemporary={onAddTemporary}
      onAddSplit={onAddSplit}
      onDistributeRemainder={onDistributeRemainder}
      onCloseAddTransaction={onCloseAddTransaction}
      onToggleSplit={onToggleSplit}
      newTransactions={newTransactions}
      tableNavigator={tableNavigator}
      newNavigator={newNavigator}
    />
  );
});

TransactionTable.displayName = 'TransactionTable';

function notesTagFormatter(notes, onNotesTagClick) {
  const words = notes.split(' ');
  return (
    <>
      {words.map((word, i, arr) => {
        const separator = arr.length - 1 === i ? '' : ' ';
        if (word.includes('#') && word.length > 1) {
          // Treat tags in a single word as separate tags.
          // #tag1#tag2 => (#tag1)(#tag2)
          // not-a-tag#tag2#tag3 => not-a-tag(#tag2)(#tag3)
          return word.split('#').map((tag, ti) => {
            if (ti === 0) {
              return tag;
            }

            if (!tag) {
              return '#';
            }

            const validTag = `#${tag}`;
            return (
              <span key={`${validTag}${ti}`}>
                <Button
                  type="bare"
                  key={i}
                  style={{
                    display: 'inline-flex',
                    padding: '3px 7px',
                    borderRadius: 16,
                    userSelect: 'none',
                    backgroundColor: theme.noteTagBackground,
                    color: theme.noteTagText,
                    cursor: 'pointer',
                  }}
                  hoveredStyle={{
                    backgroundColor: theme.noteTagBackgroundHover,
                    color: theme.noteTagText,
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    onNotesTagClick?.(validTag);
                  }}
                >
                  {validTag}
                </Button>
                {separator}
              </span>
            );
          });
        }
        return `${word}${separator}`;
      })}
    </>
  );
}
