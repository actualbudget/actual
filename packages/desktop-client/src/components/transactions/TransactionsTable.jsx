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

import {
  format as formatDate,
  parseISO,
  isValid as isDateValid,
} from 'date-fns';

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
import { SvgLeftArrow2, SvgRightArrow2 } from '../../icons/v0';
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
import { Text } from '../common/Text';
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
import { Tooltip } from '../tooltips';

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

    return (
      <Row
        style={{
          fontWeight: 300,
          zIndex: 200,
          color: theme.tableHeaderText,
          backgroundColor: theme.tableBackground,
        }}
      >
        <SelectCell
          exposed={true}
          focused={false}
          selected={hasSelected}
          width={20}
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
          width={90}
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
          width={85}
          alignItems="flex-end"
          marginRight={-5}
          id="deposit"
          icon={field === 'deposit' ? ascDesc : 'clickable'}
          onClick={() =>
            onSort('deposit', selectAscDesc(field, ascDesc, 'deposit', 'desc'))
          }
        />
        {showBalance && <Cell value="Balance" width={88} textAlign="right" />}

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

        <Cell value="" width={5 + (scrollWidth ?? 0)} />
      </Row>
    );
  },
);

TransactionHeader.displayName = 'TransactionHeader';

function getPayeePretty(transaction, payee, transferAcct) {
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
          {transferAcct.name}
        </div>
      </View>
    );
  } else if (payee) {
    return payee.name;
  } else if (payeeId && payeeId.startsWith('new:')) {
    return payeeId.slice('new:'.length);
  }

  return '';
}

function StatusCell({
  id,
  focused,
  selected,
  status,
  isChild,
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
            border: '1px solid ' + theme.formInputBorderSelected,
            boxShadow: '0 1px 2px ' + theme.formInputBorderSelected,
          },
          cursor: isClearedField ? 'pointer' : 'default',
          ...(isChild && { visibility: 'hidden' }),
        }}
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
  return (
    <CustomCell
      width={width}
      name={id}
      alignItems={alignItems}
      unexposedContent={
        <Button
          type="bare"
          onClick={onClick}
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: theme.tableHeaderText,
            fontWeight: 300,
            marginLeft,
            marginRight,
          }}
        >
          <UnexposedCellContent value={value} />
          {icon === 'asc' && (
            <SvgArrowDown width={10} height={10} style={{ marginLeft: 5 }} />
          )}
          {icon === 'desc' && (
            <SvgArrowUp width={10} height={10} style={{ marginLeft: 5 }} />
          )}
        </Button>
      }
    />
  );
}

function PayeeCell({
  id,
  payeeId,
  accountId,
  focused,
  inherited,
  payees,
  accounts,
  valueStyle,
  transaction,
  payee,
  transferAcct,
  isPreview,
  onEdit,
  onUpdate,
  onCreatePayee,
  onManagePayees,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
}) {
  const isCreatingPayee = useRef(false);

  // Filter out the account we're currently in as it is not a valid transfer
  accounts = accounts.filter(account => account.id !== accountId);
  payees = payees.filter(payee => payee.transfer_acct !== accountId);

  return (
    <CustomCell
      width="flex"
      name="payee"
      textAlign="flex"
      value={payeeId}
      valueStyle={{
        ...valueStyle,
        ...(inherited && { color: theme.tableTextInactive }),
      }}
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
      unexposedContent={
        <>
          <PayeeIcons
            transaction={transaction}
            transferAccount={transferAcct}
            onNavigateToTransferAccount={onNavigateToTransferAccount}
            onNavigateToSchedule={onNavigateToSchedule}
          />
          <UnexposedCellContent
            value={payeeId}
            formatter={() => getPayeePretty(transaction, payee, transferAcct)}
          />
        </>
      }
    >
      {({
        onBlur,
        onKeyDown,
        onUpdate,
        onSave,
        shouldSaveFromKey,
        inputStyle,
      }) => {
        return (
          <PayeeAutocomplete
            payees={payees}
            accounts={accounts}
            value={payeeId}
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
            onManagePayees={() => onManagePayees(payeeId)}
            menuPortalTarget={undefined}
          />
        );
      }}
    </CustomCell>
  );
}

function PayeeIcons({
  transaction,
  transferAccount,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
  children,
}) {
  const scheduleId = transaction.schedule;
  const scheduleData = useCachedSchedules();
  const schedule = scheduleData
    ? scheduleData.schedules.find(s => s.id === scheduleId)
    : null;

  if (schedule == null && transferAccount == null) {
    // Neither a valid scheduled transaction nor a transfer.
    return children;
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

const Transaction = memo(function Transaction(props) {
  const {
    transaction: originalTransaction,
    subtransactions,
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
    inheritedFields,
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
  } = props;

  const dispatchSelected = useSelectedDispatch();

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
    // modal is the transaction is locked. I added a boolean to guard against showing the modal twice.
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
          props.pushModal('confirm-transaction-edit', {
            onConfirm: () => {
              setShowReconciliationWarning(false);
              onUpdateAfterConfirm(name, value);
            },
            confirmReason: 'editReconciled',
          });
        }
      } else {
        onUpdateAfterConfirm(name, value);
      }
    }

    // Allow un-reconciling (unlocking) transactions
    if (name === 'cleared' && transaction.reconciled) {
      props.pushModal('confirm-transaction-edit', {
        onConfirm: () => {
          onUpdateAfterConfirm('reconciled', false);
        },
        confirmReason: 'unlockReconciled',
      });
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

      onSave(deserialized, subtransactions);
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
  let transferAcct;

  if (_inverse) {
    transferAcct =
      accounts && accountId && getAccountsById(accounts)[accountId];
  } else {
    transferAcct =
      payee &&
      payee.transfer_acct &&
      getAccountsById(accounts)[payee.transfer_acct];
  }

  const isChild = transaction.is_child;
  const isBudgetTransfer = transferAcct && transferAcct.offbudget === 0;
  const isOffBudget = account && account.offbudget === 1;

  const valueStyle = added ? { fontWeight: 600 } : null;
  const backgroundFocus = focusedField === 'select';
  const amountStyle = hideFraction ? { letterSpacing: -0.5 } : null;

  const runningBalance = !isTemporaryId(id)
    ? balance
    : balance + (_inverse ? -1 : 1) * amount;

  return (
    <Row
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
          backgroundColor: !selected ? theme.tableBackground : undefined,
          fontStyle: 'italic',
        }),
        ...(_unmatched && { opacity: 0.5 }),
      }}
    >
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
          payeeId={payeeId}
          accountId={accountId}
          focused={focusedField === 'payee'}
          inherited={inheritedFields && inheritedFields.has('payee')}
          payees={payees}
          accounts={accounts}
          valueStyle={valueStyle}
          transaction={transaction}
          payee={payee}
          transferAcct={transferAcct}
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
              <Text style={{ fontStyle: 'italic', userSelect: 'none' }}>
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
        width={90}
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
        width={85}
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
          width={88}
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

  useEffect(() => {
    if (!isAddingPrev && props.isAdding) {
      newNavigator.onEdit('temp', 'date');
    }
  }, [isAddingPrev, props.isAdding, newNavigator]);

  const renderRow = ({ item, index, position, editing }) => {
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

    const emptyChildTransactions = transactions.filter(
      t =>
        t.parent_id === (trans.is_parent ? trans.id : trans.parent_id) &&
        t.amount === 0,
    );

    return (
      <>
        {hasSplitError && (
          <Tooltip
            position="bottom-right"
            width={350}
            forceTop={position}
            forceLayout={true}
            style={{ transform: 'translate(-5px, 2px)' }}
          >
            <TransactionError
              error={error}
              isDeposit={isChildDeposit}
              onAddSplit={() => props.onAddSplit(trans.id)}
              onDistributeRemainder={() =>
                props.onDistributeRemainder(trans.id)
              }
              canDistributeRemainder={emptyChildTransactions.length > 0}
            />
          </Tooltip>
        )}
        <Transaction
          editing={editing}
          transaction={trans}
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
          inheritedFields={
            parent?.payee === trans.payee ? new Set(['payee']) : new Set()
          }
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
          pushModal={props.pushModal}
        />
      </>
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
  const mergedRef = useMergedRefs(tableRef, ref);

  const transactions = useMemo(() => {
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
    return new Map(transactions.map(trans => [trans.id, trans]));
  }, [transactions]);

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
  const tableNavigator = useTableNavigator(transactions, getFields);
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
      fields = ['select', 'cleared'];
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
    async (transaction, subtransactions = null) => {
      savePending.current = true;

      let groupedTransaction = subtransactions
        ? groupTransaction([transaction, ...subtransactions])
        : transaction;

      if (isTemporaryId(transaction.id)) {
        if (props.onApplyRules) {
          groupedTransaction = await props.onApplyRules(groupedTransaction);
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
      {...props}
      transactions={transactions}
      transactionMap={transactionMap}
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
