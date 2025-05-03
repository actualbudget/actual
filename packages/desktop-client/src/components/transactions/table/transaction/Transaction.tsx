import React, {
  memo,
  useState,
  useRef,
  useEffect,
  type CSSProperties,
  type RefObject,
} from 'react';

import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { SvgHyperlink2 } from '@actual-app/components/icons/v2';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { format as formatDate, parseISO } from 'date-fns';

import { pushModal } from 'loot-core/client/modals/modalsSlice';
import {
  getAccountsById,
  getPayeesById,
  getCategoriesById,
} from 'loot-core/client/queries/queriesSlice';
import * as monthUtils from 'loot-core/shared/months';
import { isTemporaryId, isPreviewId } from 'loot-core/shared/transactions';
import { integerToCurrency, titleFirst } from 'loot-core/shared/util';
import {
  type AccountEntity,
  type CategoryGroupEntity,
  type PayeeEntity,
  type ScheduleEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useContextMenu } from '../../../../hooks/useContextMenu';
import { useSelectedDispatch } from '../../../../hooks/useSelected';
import { useDispatch } from '../../../../redux';
import { AccountAutocomplete } from '../../../autocomplete/AccountAutocomplete';
import { CategoryAutocomplete } from '../../../autocomplete/CategoryAutocomplete';
import { type StatusTypes } from '../../../schedules/StatusBadge';
import { DateSelect } from '../../../select/DateSelect';
import { NamespaceContext } from '../../../spreadsheet/NamespaceContext';
import {
  Cell,
  Field,
  Row,
  InputCell,
  SelectCell,
  DeleteCell,
  CustomCell,
  CellButton,
} from '../../../table';
import { TransactionMenu } from '../../TransactionMenu';
import {
  deserializeTransaction,
  type SerializedTransaction,
  serializeTransaction,
} from '../utils';

import { PayeeCell } from './PayeeCell';
import { StatusCell } from './StatusCell';

type TransactionProps = {
  allTransactions: SerializedTransaction[];
  transaction: TransactionEntity;
  subtransactions: SerializedTransaction[];
  transferAccountsByTransaction: {
    [id: TransactionEntity['id']]: AccountEntity;
  };
  editing: boolean;
  showAccount?: boolean;
  showBalance?: boolean;
  showCleared?: boolean;
  showZeroInDeposit?: boolean;
  style?: CSSProperties;
  selected?: boolean;
  highlighted?: boolean;
  added?: boolean;
  matched?: boolean;
  expanded?: boolean;
  focusedField?: string;
  categoryGroups: CategoryGroupEntity[];
  payees: PayeeEntity[];
  accounts: AccountEntity[];
  balance: number;
  dateFormat?: string;
  hideFraction?: boolean;
  onSave: (
    tx: TransactionEntity,
    subTxs: SerializedTransaction[],
    name: string,
  ) => void;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onDelete: (id: TransactionEntity['id']) => void;
  onDuplicate: (id: TransactionEntity['id']) => void;
  onLinkSchedule: (id: TransactionEntity['id']) => void;
  onUnlinkSchedule: (id: TransactionEntity['id']) => void;
  onCreateRule: (id: TransactionEntity['id']) => void;
  onScheduleAction: (action: string, id: TransactionEntity['id']) => void;
  onMakeAsNonSplitTransactions?: (id: TransactionEntity['id']) => void;
  onSplit: (id: TransactionEntity['id']) => void;
  onToggleSplit: (id: TransactionEntity['id']) => void;
  onCreatePayee: (name: string) => Promise<PayeeEntity['id']>;
  onManagePayees: (id: PayeeEntity['id'] | undefined) => void;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
  onNotesTagClick: (tag: string) => void;
  splitError?: string;
  listContainerRef: RefObject<HTMLDivElement>;
  showSelection?: boolean;
  allowSplitTransaction?: boolean;
};

export const Transaction = memo(TransactionInner);

function TransactionInner({
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
  onDuplicate,
  onLinkSchedule,
  onUnlinkSchedule,
  onCreateRule,
  onScheduleAction,
  onMakeAsNonSplitTransactions,
  onSplit,
  onManagePayees,
  onCreatePayee,
  onToggleSplit,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
  onNotesTagClick,
  splitError,
  listContainerRef,
  showSelection,
  allowSplitTransaction,
}: TransactionProps) {
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

  function onUpdate<T extends keyof SerializedTransaction>(
    name: T,
    value: SerializedTransaction[T],
  ) {
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
            pushModal({
              modal: {
                name: 'confirm-transaction-edit',
                options: {
                  onCancel: () => {
                    setShowReconciliationWarning(false);
                  },
                  onConfirm: () => {
                    setShowReconciliationWarning(false);
                    onUpdateAfterConfirm(name, value);
                  },
                  confirmReason: 'editReconciled',
                },
              },
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
        pushModal({
          modal: {
            name: 'confirm-transaction-edit',
            options: {
              onConfirm: () => {
                onUpdateAfterConfirm('reconciled', false);
              },
              confirmReason: 'unlockReconciled',
            },
          },
        }),
      );
    }
  }

  function onUpdateAfterConfirm<T extends keyof SerializedTransaction>(
    name: T,
    value: SerializedTransaction[T],
  ) {
    const newTransaction = { ...transaction, [name]: value };

    // Don't change the note to an empty string if it's null (since they are both rendered the same)
    if (name === 'notes' && value === '' && transaction.notes == null) {
      return;
    }

    if (
      name === 'account' &&
      value &&
      getAccountsById(accounts)[value].offbudget
    ) {
      newTransaction.category = undefined;
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
    if (name === 'payee' && value && (value as string).startsWith('new:')) {
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
    forceUpcoming,
    is_parent: isParent,
    _unmatched = false,
  } = transaction;

  const previewStatus = forceUpcoming ? 'upcoming' : categoryId;

  // Join in some data
  const payee =
    (payees && payeeId && getPayeesById(payees)[payeeId]) || undefined;
  const account = accounts && accountId && getAccountsById(accounts)[accountId];

  const isChild = transaction.is_child;
  const transferAcct =
    isTemporaryId(id) && payee?.transfer_acct
      ? getAccountsById(accounts)[payee.transfer_acct]
      : transferAccountsByTransaction[id];
  const isBudgetTransfer = transferAcct && transferAcct.offbudget === 0;
  const isOffBudget = account && account.offbudget === 1;

  const valueStyle = added ? { fontWeight: 600 } : null;
  const backgroundFocus = focusedField === 'select';
  const amountStyle = hideFraction ? { letterSpacing: -0.5 } : null;

  const runningBalance = !isTemporaryId(id) ? balance : balance + amount;

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
  const [_, setUpdateId] = useState(1);
  useEffect(() => {
    // The hack applies to only transactions with split errors
    if (!splitError) {
      return;
    }

    setTimeout(() => {
      setUpdateId(state => state + 1);
    }, 1);
  }, [splitError, allTransactions]);

  const { setMenuOpen, menuOpen, handleContextMenu, position } =
    useContextMenu();

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
      onContextMenu={handleContextMenu}
    >
      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
        {...position}
        style={{ width: 200, margin: 1 }}
        isNonModal
      >
        <TransactionMenu
          transaction={transaction}
          onDelete={() => onDelete?.(transaction.id)}
          onDuplicate={() => onDuplicate?.(transaction.id)}
          onLinkSchedule={() => onLinkSchedule?.(transaction.id)}
          onUnlinkSchedule={() => onUnlinkSchedule?.(transaction.id)}
          onCreateRule={() => onCreateRule?.(transaction.id)}
          onScheduleAction={action =>
            onScheduleAction?.(action, transaction.id)
          }
          onMakeAsNonSplitTransactions={() =>
            onMakeAsNonSplitTransactions?.(transaction.id)
          }
          closeMenu={() => setMenuOpen(false)}
        />
      </Popover>

      {splitError && listContainerRef.current && (
        <Popover
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
      ) : (isPreview && isChild) || !showSelection ? (
        <Cell width={20} />
      ) : (
        <SelectCell
          /* Checkmark field for non-child transaction */
          exposed
          buttonProps={{
            className: selected || editing ? undefined : 'hover-visible',
          }}
          focused={focusedField === 'select'}
          onSelect={e => {
            dispatchSelected({
              type: 'select',
              id: transaction.id,
              isRangeSelect: e.shiftKey,
            });
          }}
          onEdit={() => onEdit(id, 'select')}
          selected={selected}
          style={{ ...(isChild && { borderLeftWidth: 1 }) }}
          // @ts-ignore TODO: fix this. May involve modifying cell prop
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
              shouldSaveFromKey={shouldSaveFromKey}
              clearOnBlur={false}
              focused={true}
              inputProps={{ onBlur, onKeyDown, style: inputStyle }}
              onUpdate={onUpdate}
              onSelect={onSave}
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
          payees={payees.filter(
            payee => !payee.transfer_acct || payee.transfer_acct !== accountId,
          )}
          valueStyle={valueStyle}
          transaction={transaction}
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

      {(isPreview && !isChild) || isParent ? (
        <Cell
          /* Category field (Split button) for parent transactions */
          name="category"
          width="flex"
          focused={focusedField === 'category'}
          style={{
            padding: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            height: '100%',
          }}
          plain
        >
          {isPreview && (
            <View
              style={{
                color:
                  previewStatus === 'missed'
                    ? theme.errorText
                    : previewStatus === 'due'
                      ? theme.warningText
                      : selected
                        ? theme.formLabelText
                        : theme.upcomingText,
                backgroundColor:
                  previewStatus === 'missed'
                    ? theme.errorBackground
                    : previewStatus === 'due'
                      ? theme.warningBackground
                      : selected
                        ? theme.formLabelBackground
                        : theme.upcomingBackground,
                margin: '0 5px',
                padding: '3px 7px',
                borderRadius: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-block',
              }}
            >
              {titleFirst(previewStatus ?? '')}
            </View>
          )}
          <CellButton
            bare
            style={{
              borderRadius: 4,
              border: '1px solid transparent', // so it doesn't shift on hover
              ':hover': {
                border: '1px solid ' + theme.buttonNormalBorder,
              },
            }}
            disabled={isTemporaryId(transaction.id)}
            onEdit={() => !isPreview && onEdit(id, 'category')}
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
              {!isPreview && (
                <Text
                  style={{
                    fontStyle: 'italic',
                    fontWeight: 300,
                    userSelect: 'none',
                  }}
                >
                  Split
                </Text>
              )}
            </View>
          </CellButton>
        </Cell>
      ) : isBudgetTransfer || isOffBudget ? (
        <InputCell
          /* Category field for transfer and off budget transactions
     (NOT preview, it is covered first) */
          name="category"
          width="flex"
          exposed={focusedField === 'category'}
          focused={focusedField === 'category'}
          onExpose={name => onEdit(id, name)}
          value={
            isParent
              ? 'Split'
              : isOffBudget
                ? 'Off budget'
                : isBudgetTransfer
                  ? categoryId != null
                    ? 'Needs Repair'
                    : 'Transfer'
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
              ? getCategoriesById(categoryGroups)[value]?.name
              : transaction.id
                ? 'Categorize'
                : ''
          }
          exposed={focusedField === 'category'}
          onExpose={name => !isPreview && onEdit(id, name)}
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
                value={categoryId ?? null}
                focused={true}
                clearOnBlur={false}
                showSplitOption={!isChild && !isParent && allowSplitTransaction}
                shouldSaveFromKey={shouldSaveFromKey}
                inputProps={{ onBlur, onKeyDown, style: inputStyle }}
                onUpdate={onUpdate}
                onSelect={onSave}
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
              ? (previewStatus as StatusTypes)
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
}
