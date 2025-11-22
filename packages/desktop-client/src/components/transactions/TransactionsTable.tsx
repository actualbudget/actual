import {
  createElement,
  createRef,
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type KeyboardEvent,
  memo,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgLeftArrow2,
  SvgRightArrow2,
  SvgSplit,
} from '@actual-app/components/icons/v0';
import {
  SvgArrowDown,
  SvgArrowUp,
  SvgCheveronDown,
} from '@actual-app/components/icons/v1';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
  SvgHyperlink2,
  SvgSubtract,
} from '@actual-app/components/icons/v2';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { format as formatDate, parseISO } from 'date-fns';

import * as monthUtils from 'loot-core/shared/months';
import { getStatusLabel } from 'loot-core/shared/schedules';
import {
  addSplitTransaction,
  deleteTransaction,
  groupTransaction,
  isPreviewId,
  isTemporaryId,
  splitTransaction,
  ungroupTransactions,
  updateTransaction,
} from 'loot-core/shared/transactions';
import {
  amountToCurrency,
  currencyToAmount,
  type IntegerAmount,
  integerToCurrency,
  titleFirst,
} from 'loot-core/shared/util';
import {
  type AccountEntity,
  type CategoryEntity,
  type CategoryGroupEntity,
  type PayeeEntity,
  type RuleEntity,
  type ScheduleEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import {
  deserializeTransaction,
  isLastChild,
  makeTemporaryTransactions,
  selectAscDesc,
  type SerializedTransaction,
  serializeTransaction,
  type TransactionEditFunction,
  type TransactionUpdateFunction,
} from './table/utils';
import { TransactionMenu } from './TransactionMenu';

import { getAccountsById } from '@desktop-client/accounts/accountsSlice';
import { getCategoriesById } from '@desktop-client/budget/budgetSlice';
import { AccountAutocomplete } from '@desktop-client/components/autocomplete/AccountAutocomplete';
import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import { PayeeAutocomplete } from '@desktop-client/components/autocomplete/PayeeAutocomplete';
import {
  getStatusProps,
  type StatusTypes,
} from '@desktop-client/components/schedules/StatusBadge';
import { DateSelect } from '@desktop-client/components/select/DateSelect';
import {
  Cell,
  CellButton,
  CustomCell,
  DeleteCell,
  Field,
  InputCell,
  Row,
  SelectCell,
  Table,
  type TableHandleRef,
  type TableNavigator,
  type TableProps,
  UnexposedCellContent,
  useTableNavigator,
} from '@desktop-client/components/table';
import { useCachedSchedules } from '@desktop-client/hooks/useCachedSchedules';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import {
  DisplayPayeeProvider,
  useDisplayPayee,
} from '@desktop-client/hooks/useDisplayPayee';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { useMergedRefs } from '@desktop-client/hooks/useMergedRefs';
import { usePrevious } from '@desktop-client/hooks/usePrevious';
import { useProperFocus } from '@desktop-client/hooks/useProperFocus';
import {
  useSelectedDispatch,
  useSelectedItems,
} from '@desktop-client/hooks/useSelected';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import {
  type SplitsExpandedContextValue,
  useSplitsExpanded,
} from '@desktop-client/hooks/useSplitsExpanded';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { NotesTagFormatter } from '@desktop-client/notes/NotesTagFormatter';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { getPayeesById } from '@desktop-client/payees/payeesSlice';
import { useDispatch } from '@desktop-client/redux';

type TransactionHeaderProps = {
  hasSelected: boolean;
  showAccount: boolean;
  showCategory: boolean;
  showBalance: boolean;
  showCleared: boolean;
  scrollWidth: number;
  showSelection: boolean;
  onSort: (field: string, ascDesc: 'asc' | 'desc') => void;
  ascDesc: 'asc' | 'desc';
  field: string;
};

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
    showSelection,
  }: TransactionHeaderProps) => {
    const dispatchSelected = useSelectedDispatch();
    const { t } = useTranslation();

    useHotkeys(
      'ctrl+a, cmd+a, meta+a',
      () => dispatchSelected({ type: 'select-all' }),
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
        {showSelection && (
          <SelectCell
            exposed={true}
            focused={false}
            selected={hasSelected}
            width={20}
            style={{
              borderTopWidth: 0,
              borderBottomWidth: 0,
            }}
            icon={<SvgSubtract width={6} height={6} />}
            onSelect={(e: KeyboardEvent<HTMLDivElement>) =>
              dispatchSelected({
                type: 'select-all',
                isRangeSelect: e.shiftKey,
              })
            }
          />
        )}
        {!showSelection && (
          <Field
            style={{
              width: '20px',
              border: 0,
            }}
          />
        )}
        <HeaderCell
          value={t('Date')}
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
            value={t('Account')}
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
          value={t('Payee')}
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
          value={t('Notes')}
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
            value={t('Category')}
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
          value={t('Payment')}
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
          value={t('Deposit')}
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
            value={t('Balance')}
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

type StatusCellProps = {
  id: TransactionEntity['id'];
  status?: StatusTypes | null;
  focused?: boolean;
  selected?: boolean;
  isChild?: boolean;
  isPreview?: boolean;
  onEdit: TransactionEditFunction;
  onUpdate: TransactionUpdateFunction;
};

function StatusCell({
  id,
  focused,
  selected,
  status,
  isChild,
  isPreview,
  onEdit,
  onUpdate,
}: StatusCellProps) {
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

type HeaderCellProps = {
  value: string;
  id: string;
  icon?: 'asc' | 'desc' | 'clickable';
  onClick?: () => void;
} & Pick<CSSProperties, 'width' | 'alignItems' | 'marginLeft' | 'marginRight'>;

function HeaderCell({
  value,
  id,
  width,
  alignItems,
  marginLeft,
  marginRight,
  icon,
  onClick,
}: HeaderCellProps) {
  const style = {
    whiteSpace: 'nowrap' as CSSProperties['whiteSpace'],
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
          <Button variant="bare" onPress={onClick} style={style}>
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

type PayeeCellProps = {
  id: TransactionEntity['id'];
  payee?: PayeeEntity;
  focused: boolean;
  payees: PayeeEntity[];
  accounts: AccountEntity[];
  transferAccountsByTransaction: {
    [id: TransactionEntity['id']]: AccountEntity | null;
  };
  valueStyle: CSSProperties | null;
  transaction: SerializedTransaction;
  importedPayee?: PayeeEntity['id'];
  isPreview: boolean;
  onEdit: TransactionEditFunction;
  onUpdate: TransactionUpdateFunction;
  onCreatePayee: (name: string) => Promise<null | PayeeEntity['id']>;
  onManagePayees: (id: PayeeEntity['id'] | undefined) => void;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
};

function PayeeCell({
  id,
  payee,
  focused,
  payees,
  accounts,
  transferAccountsByTransaction,
  valueStyle,
  transaction,
  importedPayee,
  isPreview,
  onEdit,
  onUpdate,
  onCreatePayee,
  onManagePayees,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
}: PayeeCellProps) {
  const isCreatingPayee = useRef(false);
  const { t } = useTranslation();

  const dispatch = useDispatch();

  const transferAccount = transferAccountsByTransaction[transaction.id];

  const displayPayee = useDisplayPayee({ transaction });

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
          alignSelf: 'stretch',
          borderRadius: 4,
          border: '1px solid transparent', // so it doesn't shift on hover
          ':hover': isPreview
            ? {}
            : {
                border: '1px solid ' + theme.buttonNormalBorder,
              },
        }}
        disabled={isPreview}
        onSelect={() =>
          dispatch(
            pushModal({
              modal: {
                name: 'payee-autocomplete',
                options: {
                  onSelect: (payeeId: PayeeEntity['id']) => {
                    onUpdate('payee', payeeId);
                  },
                },
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
          <PayeeIcons
            transaction={transaction}
            transferAccount={transferAccount}
            onNavigateToTransferAccount={onNavigateToTransferAccount}
            onNavigateToSchedule={onNavigateToSchedule}
          />
          <SvgSplit
            style={{
              color: 'inherit',
              width: 14,
              height: 14,
              marginRight: 5,
              flexShrink: 0,
            }}
          />
          <Text
            style={{
              fontStyle: 'italic',
              fontWeight: 300,
              userSelect: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              borderBottom: importedPayee
                ? `1px dashed ${theme.pageTextSubdued}`
                : 'none',
            }}
          >
            {importedPayee ? (
              <Tooltip
                content={
                  <View style={{ padding: 10 }}>
                    <Text style={{ fontWeight: 'bold' }}>
                      <Trans>Imported Payee</Trans>
                    </Text>
                    <Text style={{ fontWeight: 'normal' }}>
                      {importedPayee}
                    </Text>
                  </View>
                }
                style={{ ...styles.tooltip, borderRadius: '0px 5px 5px 0px' }}
                placement="bottom"
                triggerProps={{ delay: 750 }}
              >
                {displayPayee}
              </Tooltip>
            ) : (
              displayPayee
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
          onUpdate('payee', id ?? undefined);
          isCreatingPayee.current = false;
        }
      }}
      formatter={() => {
        if (!displayPayee && isPreview) {
          return t('(No payee)');
        }
        return displayPayee;
      }}
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
          <>
            <PayeeIcons
              transaction={transaction}
              transferAccount={transferAccount}
              onNavigateToTransferAccount={onNavigateToTransferAccount}
              onNavigateToSchedule={onNavigateToSchedule}
            />
            <div
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {importedPayee ? (
                <Tooltip
                  content={
                    <View style={{ padding: 10 }}>
                      <Text style={{ fontWeight: 'bold' }}>
                        <Trans>Imported Payee</Trans>
                      </Text>
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
          </>
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
          value={payee?.id ?? null}
          shouldSaveFromKey={shouldSaveFromKey}
          inputProps={{
            onBlur,
            onKeyDown,
            style: inputStyle,
          }}
          showManagePayees={true}
          clearOnBlur={false}
          focused={true}
          onUpdate={(_, value) => onUpdate?.(value)}
          onSelect={onSave}
          onManagePayees={() => onManagePayees(payee?.id)}
        />
      )}
    </CustomCell>
  );
}

const payeeIconButtonStyle = {
  marginLeft: -5,
  marginRight: 2,
  width: 23,
  height: 23,
  color: 'inherit',
};
const scheduleIconStyle = { width: 13, height: 13 };
const transferIconStyle = { width: 10, height: 10 };

type PayeeIconsProps = {
  transaction: SerializedTransaction;
  transferAccount: AccountEntity | null;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
};

function PayeeIcons({
  transaction,
  transferAccount,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
}: PayeeIconsProps) {
  const { t } = useTranslation();

  const scheduleId = transaction.schedule;
  const { isLoading, schedules = [] } = useCachedSchedules();

  if (isLoading) {
    return null;
  }

  const schedule = scheduleId ? schedules.find(s => s.id === scheduleId) : null;

  if (schedule == null && transferAccount == null) {
    // Neither a valid scheduled transaction nor a transfer.
    return null;
  }

  const recurring =
    schedule &&
    schedule._date &&
    typeof schedule._date === 'object' &&
    !!schedule._date.frequency;
  const isDeposit = transaction.amount > 0;

  return (
    <>
      {schedule && (
        <Button
          variant="bare"
          data-testid="schedule-icon"
          aria-label={t('See schedule details')}
          style={payeeIconButtonStyle}
          onPress={() => {
            if (scheduleId) {
              onNavigateToSchedule(scheduleId);
            }
          }}
        >
          {recurring ? (
            <SvgArrowsSynchronize style={scheduleIconStyle} />
          ) : (
            <SvgCalendar3 style={scheduleIconStyle} />
          )}
        </Button>
      )}
      {transferAccount && (
        <Button
          variant="bare"
          data-testid="transfer-icon"
          aria-label={t('See transfer account')}
          style={payeeIconButtonStyle}
          onPress={() => {
            if (!isTemporaryId(transaction.id)) {
              onNavigateToTransferAccount(transferAccount.id);
            }
          }}
        >
          {isDeposit ? (
            <SvgLeftArrow2 style={transferIconStyle} />
          ) : (
            <SvgRightArrow2 style={transferIconStyle} />
          )}
        </Button>
      )}
    </>
  );
}

type TransactionProps = {
  allTransactions?: TransactionEntity[];
  transaction: TransactionEntity;
  subtransactions: TransactionEntity[] | null;
  transferAccountsByTransaction: {
    [id: TransactionEntity['id']]: AccountEntity | null;
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
  dateFormat: string;
  hideFraction: boolean;
  onSave: (
    tx: TransactionEntity,
    subTxs: TransactionEntity[] | null,
    name: string,
  ) => void;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onDelete: (id: TransactionEntity['id']) => void;
  onBatchDelete?: (ids: TransactionEntity['id'][]) => void;
  onBatchDuplicate?: (ids: TransactionEntity['id'][]) => void;
  onBatchLinkSchedule?: (ids: TransactionEntity['id'][]) => void;
  onBatchUnlinkSchedule?: (ids: TransactionEntity['id'][]) => void;
  onCreateRule?: (ids: TransactionEntity['id'][]) => void;
  onScheduleAction?: (
    name: 'skip' | 'post-transaction' | 'post-transaction-today' | 'complete',
    ids: TransactionEntity['id'][],
  ) => void;
  onMakeAsNonSplitTransactions?: (ids: TransactionEntity['id'][]) => void;
  onSplit: (id: TransactionEntity['id']) => void;
  onToggleSplit: (id: TransactionEntity['id']) => void;
  onCreatePayee: (name: string) => Promise<null | PayeeEntity['id']>;
  onManagePayees: (id: PayeeEntity['id'] | undefined) => void;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
  onNotesTagClick: (tag: string) => void;
  splitError?: ReactNode;
  listContainerRef?: RefObject<HTMLDivElement>;
  showSelection?: boolean;
  allowSplitTransaction?: boolean;
  showHiddenCategories?: boolean;
};

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
  onBatchDelete,
  onBatchDuplicate,
  onBatchLinkSchedule,
  onBatchUnlinkSchedule,
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
  showHiddenCategories,
}: TransactionProps) {
  const { t } = useTranslation();

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

  const onUpdate: TransactionUpdateFunction = (name, value) => {
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
  };

  const onUpdateAfterConfirm: TransactionUpdateFunction = (name, value) => {
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
    // need to clear out the other one or both so it's always properly
    // translated into the desired amount (see
    // `deserializeTransaction`)
    if (name === 'credit') {
      newTransaction['debit'] = '';
    } else if (name === 'debit') {
      newTransaction['credit'] = '';
    } else {
      newTransaction['debit'] = '';
      newTransaction['credit'] = '';
    }

    if (name === 'account' && transaction.account !== value) {
      newTransaction.reconciled = false;
    }

    // Don't save a temporary value (a new payee) which will be
    // filled in with a real id later
    if (
      name === 'payee' &&
      value &&
      (value as TransactionEntity['payee'])?.startsWith('new:')
    ) {
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
  };

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

  const { schedules = [] } = useCachedSchedules();
  const schedule = transaction.schedule
    ? schedules.find(s => s.id === transaction.schedule)
    : null;

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
          getTransaction={id => allTransactions?.find(t => t.id === id)}
          onDelete={ids => onBatchDelete?.(ids)}
          onDuplicate={ids => onBatchDuplicate?.(ids)}
          onLinkSchedule={ids => onBatchLinkSchedule?.(ids)}
          onUnlinkSchedule={ids => onBatchUnlinkSchedule?.(ids)}
          onCreateRule={ids => onCreateRule?.(ids)}
          onScheduleAction={(name, ids) => onScheduleAction?.(name, ids)}
          onMakeAsNonSplitTransactions={ids =>
            onMakeAsNonSplitTransactions?.(ids)
          }
          closeMenu={() => setMenuOpen(false)}
        />
      </Popover>

      {splitError && listContainerRef?.current && (
        <Popover
          triggerRef={triggerRef}
          isOpen
          isNonModal
          style={{
            maxWidth: 500,
            minWidth: 375,
            padding: 5,
            maxHeight: '38px !important',
          }}
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
          onSelect={(e: KeyboardEvent<HTMLDivElement>) => {
            dispatchSelected({
              type: 'select',
              id: transaction.id,
              isRangeSelect: e.shiftKey,
            });
          }}
          onEdit={() => onEdit(id, 'select')}
          selected={selected}
          style={{ ...(isChild && { borderLeftWidth: 1 }) }}
          value={
            matched
              ? // TODO: this will require changes in table.tsx
                ((
                  <SvgHyperlink2
                    style={{ width: 13, height: 13, color: 'inherit' }}
                  />
                ) as unknown as string)
              : undefined
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
        value={notes ?? (isPreview ? schedule?.name : null) ?? ''}
        valueStyle={valueStyle}
        formatter={value =>
          NotesTagFormatter({ notes: value, onNotesTagClick })
        }
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
                whiteSpace: 'nowrap',
              }}
            >
              {titleFirst(getStatusLabel(previewStatus ?? ''))}
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
                  <Trans>Split</Trans>
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
              ? t('Split')
              : isOffBudget
                ? t('Off budget')
                : isBudgetTransfer
                  ? categoryId != null
                    ? t('Needs Repair')
                    : t('Transfer')
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
              ? (getCategoriesById(categoryGroups)[value]?.name ?? '')
              : transaction.id
                ? t('Categorize')
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
            <SheetNameProvider
              name={monthUtils.sheetForMonth(
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
                showHiddenCategories={showHiddenCategories}
              />
            </SheetNameProvider>
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
        value={debit === '' && credit === '' ? amountToCurrency(0) : debit}
        formatter={value =>
          // reformat value so since we might have kept decimals
          value ? amountToCurrency(currencyToAmount(value) || 0) : ''
        }
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
          value: debit === '' && credit === '' ? amountToCurrency(0) : debit,
          onUpdate: onUpdate.bind(null, 'debit'),
          'data-1p-ignore': true,
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
        formatter={value =>
          // reformat value so since we might have kept decimals
          value ? amountToCurrency(currencyToAmount(value) || 0) : ''
        }
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
          'data-1p-ignore': true,
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
            runningBalance == null || isChild || isTemporaryId(id)
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
});

type TransactionErrorProps = {
  error: NonNullable<TransactionEntity['error']>;
  isDeposit: boolean;
  onAddSplit: () => void;
  onDistributeRemainder: () => void;
  style?: CSSProperties;
  canDistributeRemainder: boolean;
};

function TransactionError({
  error,
  isDeposit,
  onAddSplit,
  onDistributeRemainder,
  style,
  canDistributeRemainder,
}: TransactionErrorProps) {
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
            <Text style={{ whiteSpace: 'nowrap' }}>
              <Trans>Amount left:</Trans>{' '}
              <Text style={{ fontWeight: 500 }}>
                {integerToCurrency(
                  isDeposit ? error.difference : -error.difference,
                )}
              </Text>
            </Text>
            <View style={{ flex: 1 }} />
            <Button
              variant="normal"
              style={{ marginLeft: 15 }}
              onPress={onDistributeRemainder}
              data-testid="distribute-split-button"
              isDisabled={!canDistributeRemainder}
            >
              <Trans>Distribute</Trans>
            </Button>
            <Button
              variant="primary"
              style={{ marginLeft: 10, padding: '4px 10px' }}
              onPress={onAddSplit}
              data-testid="add-split-button"
            >
              <Trans>Add Split</Trans>
            </Button>
          </View>
        );
      }
      break;
    default:
      return null;
  }
}

type NewTransactionProps = {
  accounts: AccountEntity[];
  categoryGroups: CategoryGroupEntity[];
  dateFormat: string;
  editingTransaction: TransactionEntity['id'];
  focusedField: string;
  hideFraction: boolean;
  onAdd: () => void;
  onAddAndClose: () => void;
  onAddSplit: (id: TransactionEntity['id']) => void;
  onToggleSplit: (id: TransactionEntity['id']) => void;
  onClose: () => void;
  onCreatePayee: (name: string) => Promise<null | PayeeEntity['id']>;
  onDelete: (id: TransactionEntity['id']) => void;
  onDistributeRemainder: (id: TransactionEntity['id']) => void;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onManagePayees: (id: PayeeEntity['id'] | undefined) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNotesTagClick: (tag: string) => void;
  onSave: (
    tx: TransactionEntity,
    subTxs: TransactionEntity[] | null,
    name: string,
  ) => void;
  onSplit: (id: TransactionEntity['id']) => void;
  payees: PayeeEntity[];
  showAccount?: boolean;
  showBalance?: boolean;
  balance?: number | null;
  showCleared?: boolean;
  transactions: TransactionEntity[];
  transferAccountsByTransaction: {
    [id: TransactionEntity['id']]: AccountEntity | null;
  };
  showHiddenCategories?: boolean;
};
function NewTransaction({
  transactions,
  accounts,
  categoryGroups,
  payees,
  transferAccountsByTransaction,
  editingTransaction,
  focusedField,
  showAccount,
  showBalance,
  showCleared,
  dateFormat,
  hideFraction,
  onClose,
  onSplit,
  onToggleSplit,
  onEdit,
  onDelete,
  onSave,
  onAdd,
  onAddAndClose,
  onAddSplit,
  onDistributeRemainder,
  onManagePayees,
  onCreatePayee,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
  onNotesTagClick,
  balance,
  showHiddenCategories,
}: NewTransactionProps) {
  const error = transactions[0].error;
  const isDeposit = transactions[0].amount > 0;

  const childTransactions = transactions.filter(
    t => t.parent_id === transactions[0].id,
  );
  const emptyChildTransactions = childTransactions.filter(t => t.amount === 0);

  const addButtonRef = useRef(null);
  useProperFocus(addButtonRef, focusedField === 'add');
  const cancelButtonRef = useRef(null);
  useProperFocus(cancelButtonRef, focusedField === 'cancel');

  const handleAddClick = (e: { ctrlKey?: boolean; metaKey?: boolean }) => {
    if (e.ctrlKey || e.metaKey) {
      onAddAndClose();
    } else {
      onAdd();
    }
  };

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
          key={transaction.id}
          editing={editingTransaction === transaction.id}
          transaction={transaction}
          subtransactions={transaction.is_parent ? childTransactions : null}
          transferAccountsByTransaction={transferAccountsByTransaction}
          showAccount={showAccount}
          showBalance={showBalance}
          showCleared={showCleared}
          focusedField={
            editingTransaction === transaction.id ? focusedField : undefined
          }
          showZeroInDeposit={isDeposit}
          accounts={accounts}
          categoryGroups={categoryGroups}
          payees={payees}
          dateFormat={dateFormat}
          hideFraction={!!hideFraction}
          expanded={true}
          onEdit={onEdit}
          onSave={onSave}
          onSplit={onSplit}
          onToggleSplit={onToggleSplit}
          onDelete={onDelete}
          onManagePayees={onManagePayees}
          onCreatePayee={onCreatePayee}
          style={{ marginTop: -1 }}
          onNavigateToTransferAccount={onNavigateToTransferAccount}
          onNavigateToSchedule={onNavigateToSchedule}
          onNotesTagClick={onNotesTagClick}
          balance={balance ?? 0}
          showSelection={true}
          allowSplitTransaction={true}
          showHiddenCategories={showHiddenCategories}
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
          onPress={() => onClose()}
          data-testid="cancel-button"
          ref={cancelButtonRef}
        >
          <Trans>Cancel</Trans>
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
            variant="primary"
            style={{ padding: '4px 10px' }}
            onPress={handleAddClick}
            data-testid="add-button"
            ref={addButtonRef}
          >
            <Trans>Add</Trans>
          </Button>
        )}
      </View>
    </View>
  );
}

type TransactionTableInnerProps = {
  tableRef: Ref<TableHandleRef<TransactionEntity>>;
  listContainerRef: RefObject<HTMLDivElement>;
  tableNavigator: TableNavigator<TransactionEntity>;
  newNavigator: TableNavigator<TransactionEntity>;
  selectedItems: Set<string>;
  isExpanded: (id: string) => boolean;
  transactionMap: Map<TransactionEntity['id'], TransactionEntity>;
  transactionsByParent: {
    [parentId: TransactionEntity['id']]: TransactionEntity[];
  };
  transferAccountsByTransaction: {
    [id: TransactionEntity['id']]: AccountEntity | null;
  };
  newTransactions: TransactionEntity[];

  transactions: TransactionEntity[];
  loadMoreTransactions: () => void;
  accounts: AccountEntity[];
  categoryGroups: CategoryGroupEntity[];
  payees: PayeeEntity[];
  balances: Record<TransactionEntity['id'], IntegerAmount> | null;
  showBalances: boolean;
  showReconciled: boolean;
  showCleared: boolean;
  showAccount: boolean;
  showCategory: boolean;
  currentAccountId: AccountEntity['id'];
  currentCategoryId: CategoryEntity['id'];
  isAdding: boolean;
  isNew: (id: TransactionEntity['id']) => boolean;
  isMatched: (id: TransactionEntity['id']) => boolean;
  dateFormat: string | undefined;
  hideFraction: boolean;
  renderEmpty: ReactNode | (() => ReactNode);
  onSave: (transaction: TransactionEntity) => void;
  onApplyRules: (
    transaction: TransactionEntity,
    field: string,
  ) => Promise<TransactionEntity>;
  onSplit: (id: TransactionEntity['id']) => void;
  onAddSplit: (id: TransactionEntity['id']) => void;
  onCloseAddTransaction: () => void;
  onAdd: (transactions: TransactionEntity[]) => void;
  onCreatePayee: (name: string) => Promise<null | PayeeEntity['id']>;
  style?: CSSProperties;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
  onNotesTagClick: (tag: string) => void;
  sortField: string;
  ascDesc: 'asc' | 'desc';
  onCreateRule: (ids: RuleEntity['id'][]) => void;
  onScheduleAction: (
    name: 'skip' | 'post-transaction' | 'post-transaction-today' | 'complete',
    ids: TransactionEntity['id'][],
  ) => void;
  onMakeAsNonSplitTransactions: (ids: TransactionEntity['id'][]) => void;
  showSelection: boolean;
  allowSplitTransaction?: boolean;

  onDelete: (id: TransactionEntity['id']) => void;
  onBatchDelete: (ids: TransactionEntity['id'][]) => void;
  onBatchDuplicate: (ids: TransactionEntity['id'][]) => void;
  onBatchLinkSchedule: (ids: TransactionEntity['id'][]) => void;
  onBatchUnlinkSchedule: (ids: TransactionEntity['id'][]) => void;
  onCheckNewEnter: (e: KeyboardEvent) => void;
  onCheckEnter: (e: KeyboardEvent) => void;
  onAddTemporary: (id?: TransactionEntity['id']) => void;
  onAddAndCloseTemporary: () => void;
  onDistributeRemainder: (id: TransactionEntity['id']) => void;
  onToggleSplit: (id: TransactionEntity['id']) => void;
  onManagePayees: (id?: PayeeEntity['id']) => void;

  onSort: (field: string, ascDesc: 'asc' | 'desc') => void;
  showHiddenCategories?: boolean;
};

function TransactionTableInner({
  tableNavigator,
  tableRef,
  listContainerRef,
  dateFormat = 'MM/dd/yyyy',
  newNavigator,
  renderEmpty,
  showHiddenCategories,
  ...props
}: TransactionTableInnerProps) {
  const containerRef = createRef<HTMLDivElement>();
  const isAddingPrev = usePrevious(props.isAdding);
  const [scrollWidth, setScrollWidth] = useState(0);

  function saveScrollWidth(parent: number, child: number) {
    const width = parent > 0 && child > 0 && parent - child;

    setScrollWidth(!width ? 0 : width);
  }

  const {
    onCloseAddTransaction: onCloseAddTransactionProp,
    onNavigateToTransferAccount: onNavigateToTransferAccountProp,
    onNavigateToSchedule: onNavigateToScheduleProp,
    onNotesTagClick: onNotesTagClickProp,
  } = props;

  const onNavigateToTransferAccount = useCallback(
    (accountId: AccountEntity['id']) => {
      onCloseAddTransactionProp();
      onNavigateToTransferAccountProp(accountId);
    },
    [onCloseAddTransactionProp, onNavigateToTransferAccountProp],
  );

  const onNavigateToSchedule = useCallback(
    (scheduleId: ScheduleEntity['id']) => {
      onCloseAddTransactionProp();
      onNavigateToScheduleProp(scheduleId);
    },
    [onCloseAddTransactionProp, onNavigateToScheduleProp],
  );

  const onNotesTagClick = useCallback(
    (noteTag: string) => {
      onCloseAddTransactionProp();
      onNotesTagClickProp(noteTag);
    },
    [onCloseAddTransactionProp, onNotesTagClickProp],
  );

  useEffect(() => {
    if (!isAddingPrev && props.isAdding) {
      newNavigator.onEdit('temp', 'date');
    }
  }, [isAddingPrev, props.isAdding, newNavigator]);

  // Don't render reconciled transactions if we're hiding them.
  const transactionsToRender = useMemo(
    () =>
      props.showReconciled
        ? props.transactions
        : props.transactions.filter(t => !t.reconciled),
    [props.transactions, props.showReconciled],
  );

  const renderRow: TableProps<TransactionEntity>['renderItem'] = ({
    item,
    index,
    editing,
  }) => {
    const {
      transactions,
      selectedItems,
      accounts,
      categoryGroups,
      payees,
      showCleared,
      showAccount,
      showBalances,
      balances,
      hideFraction,
      isNew,
      isMatched,
      isExpanded,
      showSelection,
      allowSplitTransaction,
    } = props;

    const trans = item;
    const selected = selectedItems.has(trans.id);

    const parent = trans.parent_id && props.transactionMap.get(trans.parent_id);
    const isChildDeposit = parent ? parent.amount > 0 : undefined;
    const expanded = isExpanded && isExpanded((parent || trans).id);

    // For backwards compatibility, read the error of the transaction
    // since in previous versions we stored it there. In the future we
    // can simplify this to just the parent
    const error = expanded
      ? (parent && parent.error) || trans.error
      : trans.error;

    const hasSplitError =
      (trans.is_parent || trans.is_child) &&
      (!expanded || isLastChild(transactions, index)) &&
      error &&
      error.type === 'SplitTransactionError';

    const childTransactions = trans.is_parent
      ? props.transactionsByParent[trans.id]
      : null;
    const emptyChildTransactions = props.transactionsByParent[
      (trans.is_parent ? trans.id : trans.parent_id) || ''
    ]?.filter(t => t.amount === 0);

    return (
      <Transaction
        allTransactions={props.transactions}
        editing={editing}
        transaction={trans}
        transferAccountsByTransaction={props.transferAccountsByTransaction}
        subtransactions={childTransactions}
        showAccount={showAccount}
        showBalance={showBalances}
        showCleared={showCleared}
        selected={selected}
        highlighted={false}
        added={isNew?.(trans.id)}
        expanded={isExpanded?.(trans.id)}
        matched={isMatched?.(trans.id)}
        showZeroInDeposit={isChildDeposit}
        balance={balances?.[trans.id] ?? 0}
        focusedField={editing ? tableNavigator.focusedField : undefined}
        accounts={accounts}
        categoryGroups={categoryGroups}
        payees={payees}
        dateFormat={dateFormat}
        hideFraction={hideFraction}
        onEdit={tableNavigator.onEdit}
        onSave={props.onSave}
        onDelete={props.onDelete}
        onBatchDelete={props.onBatchDelete}
        onBatchDuplicate={props.onBatchDuplicate}
        onBatchLinkSchedule={props.onBatchLinkSchedule}
        onBatchUnlinkSchedule={props.onBatchUnlinkSchedule}
        onCreateRule={props.onCreateRule}
        onScheduleAction={props.onScheduleAction}
        onMakeAsNonSplitTransactions={props.onMakeAsNonSplitTransactions}
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
              isDeposit={!!isChildDeposit}
              onAddSplit={() => props.onAddSplit(trans.id)}
              onDistributeRemainder={() =>
                props.onDistributeRemainder(trans.id)
              }
              canDistributeRemainder={emptyChildTransactions.length > 0}
            />
          )
        }
        listContainerRef={listContainerRef}
        showSelection={showSelection}
        allowSplitTransaction={allowSplitTransaction}
        showHiddenCategories={showHiddenCategories}
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
          showSelection={props.showSelection}
        />

        {props.isAdding && (
          <View
            {...newNavigator.getNavigatorProps({
              onKeyDown: (e: KeyboardEvent) => props.onCheckNewEnter(e),
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
              showBalance={props.showBalances}
              showCleared={props.showCleared}
              dateFormat={dateFormat}
              hideFraction={props.hideFraction}
              onClose={props.onCloseAddTransaction}
              onAdd={props.onAddTemporary}
              onAddAndClose={props.onAddAndCloseTemporary}
              onAddSplit={props.onAddSplit}
              onToggleSplit={props.onToggleSplit}
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
              showHiddenCategories={showHiddenCategories}
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
          items={transactionsToRender}
          renderItem={renderRow}
          renderEmpty={renderEmpty}
          loadMore={props.loadMoreTransactions}
          isSelected={id => props.selectedItems.has(id)}
          onKeyDown={e => props.onCheckEnter(e)}
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

type TableState = {
  newTransactions: TransactionEntity[];
  newNavigator: TableNavigator<TransactionEntity>;
  tableNavigator: TableNavigator<TransactionEntity>;
  transactions: readonly TransactionEntity[];
};

export type TransactionTableProps = {
  transactions: readonly TransactionEntity[];
  loadMoreTransactions: () => void;
  accounts: AccountEntity[];
  categoryGroups: CategoryGroupEntity[];
  payees: PayeeEntity[];
  balances: Record<TransactionEntity['id'], IntegerAmount> | null;
  showBalances: boolean;
  showReconciled: boolean;
  showCleared: boolean;
  showAccount: boolean;
  showCategory: boolean;
  currentAccountId: AccountEntity['id'];
  currentCategoryId: CategoryEntity['id'];
  isAdding: boolean;
  isNew: (id: TransactionEntity['id']) => boolean;
  isMatched: (id: TransactionEntity['id']) => boolean;
  dateFormat: string | undefined;
  hideFraction: boolean;
  renderEmpty: ReactNode | (() => ReactNode);
  onSave: (transaction: TransactionEntity) => void;
  onApplyRules: (
    transaction: TransactionEntity,
    field: string | null,
  ) => Promise<TransactionEntity>;
  onSplit: (id: TransactionEntity['id']) => TransactionEntity['id'];
  onAddSplit: (id: TransactionEntity['id']) => TransactionEntity['id'];
  onCloseAddTransaction: () => void;
  onAdd: (transactions: TransactionEntity[]) => void;
  onCreatePayee: (name: string) => Promise<null | PayeeEntity['id']>;
  style?: CSSProperties;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
  onNotesTagClick: (tag: string) => void;
  onSort: (field: string, ascDesc: 'asc' | 'desc') => void;
  sortField: string;
  ascDesc: 'asc' | 'desc';
  onBatchDelete: (ids: TransactionEntity['id'][]) => void;
  onBatchDuplicate: (ids: TransactionEntity['id'][]) => void;
  onBatchLinkSchedule: (ids: TransactionEntity['id'][]) => void;
  onBatchUnlinkSchedule: (ids: TransactionEntity['id'][]) => void;
  onCreateRule: (ids: RuleEntity['id'][]) => void;
  onScheduleAction: (
    name: 'skip' | 'post-transaction' | 'post-transaction-today' | 'complete',
    ids: TransactionEntity['id'][],
  ) => void;
  onMakeAsNonSplitTransactions: (ids: string[]) => void;
  showSelection: boolean;
  allowSplitTransaction?: boolean;
  onManagePayees: (id?: PayeeEntity['id']) => void;
};

export const TransactionTable = forwardRef(
  (
    props: TransactionTableProps,
    ref: ForwardedRef<TableHandleRef<TransactionEntity>>,
  ) => {
    const { t } = useTranslation();

    const dispatch = useDispatch();
    const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');
    const [newTransactions, setNewTransactions] = useState<TransactionEntity[]>(
      [],
    );
    const [prevIsAdding, setPrevIsAdding] = useState(false);
    const splitsExpanded = useSplitsExpanded();
    const splitsExpandedDispatch = splitsExpanded.dispatch;
    const prevSplitsExpanded = useRef<SplitsExpandedContextValue | null>(null);

    const tableRef = useRef<TableHandleRef<TransactionEntity>>(null);
    const listContainerRef = useRef<HTMLDivElement>(
      null,
    ) as RefObject<HTMLDivElement>;
    const mergedRef = useMergedRefs(tableRef, ref);

    const transactionsWithExpandedSplits = useMemo(() => {
      let result: TransactionEntity[];

      if (splitsExpanded.state.transitionId != null) {
        const index = props.transactions.findIndex(
          t => t.id === splitsExpanded.state.transitionId,
        );
        result = props.transactions.filter((t, idx) => {
          if (t.parent_id) {
            if (idx >= index) {
              return splitsExpanded.isExpanded(t.parent_id);
            } else if (prevSplitsExpanded.current) {
              return prevSplitsExpanded.current.isExpanded(t.parent_id);
            }
          }
          return true;
        });
      } else {
        if (
          prevSplitsExpanded.current &&
          prevSplitsExpanded.current.state.transitionId != null
        ) {
          tableRef.current?.anchor();
          tableRef.current?.setRowAnimation(false);
        }
        prevSplitsExpanded.current = splitsExpanded;

        result = props.transactions.filter(t => {
          if (t.parent_id) {
            return splitsExpanded.isExpanded(t.parent_id);
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
      return props.transactions.reduce(
        (acc, trans) => {
          if (trans.is_child && trans.parent_id) {
            acc[trans.parent_id] = [...(acc[trans.parent_id] ?? []), trans];
          }
          return acc;
        },
        {} as { [parentId: TransactionEntity['id']]: TransactionEntity[] },
      );
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

          const payee = (t.payee && payees[t.payee]) || undefined;
          const transferAccount =
            payee?.transfer_acct && accounts[payee.transfer_acct];
          return [t.id, transferAccount || null];
        }),
      );
    }, [props.transactions, props.payees, props.accounts]);

    const hasPrevSplitsExpanded = prevSplitsExpanded.current;

    useEffect(() => {
      // If it's anchored that means we've also disabled animations. To
      // reduce the chance for side effect collision, only do this if
      // we've actually anchored it
      if (tableRef.current?.isAnchored()) {
        tableRef.current.unanchor();
        tableRef.current.setRowAnimation(true);
      }
    }, [hasPrevSplitsExpanded]);

    const newNavigator = useTableNavigator(
      newTransactions ?? [],
      getFieldsNewTransaction,
    );

    const tableNavigator = useTableNavigator(
      transactionsWithExpandedSplits,
      getFieldsTableTransaction,
    );
    const shouldAdd = useRef(false);
    const shouldAddAndClose = useRef(false);
    const latestState = useRef<TableState>({
      newTransactions: newTransactions ?? [],
      newNavigator,
      tableNavigator,
      transactions: [],
    });
    const savePending = useRef(false);
    const afterSaveFunc = useRef<null | (() => void)>(null);
    const [_, forceRerender] = useState({});
    const selectedItems = useSelectedItems();

    latestState.current = {
      newTransactions: newTransactions ?? [],
      newNavigator,
      tableNavigator,
      transactions: props.transactions,
    };

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

    if (shouldAdd.current || shouldAddAndClose.current) {
      if (newTransactions?.[0] && newTransactions[0].account == null) {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: t('Account is a required field'),
            },
          }),
        );
        newNavigator.onEdit('temp', 'account');
      } else {
        const transactions = latestState.current.newTransactions;

        if (shouldAddAndClose.current) {
          props.onAdd(transactions);
          props.onCloseAddTransaction();
        } else {
          const lastDate =
            transactions.length > 0 ? transactions[0].date : null;
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
      }
      shouldAdd.current = false;
      shouldAddAndClose.current = false;
    }

    useEffect(() => {
      if (savePending.current && afterSaveFunc.current) {
        afterSaveFunc.current();
        afterSaveFunc.current = null;
      }

      savePending.current = false;
    }, [newTransactions, props, props.transactions]);

    function getFieldsNewTransaction(item?: TransactionEntity) {
      const fields = [
        'select',
        'date',
        'account',
        'payee',
        'notes',
        'category',
        'debit',
        'credit',
        'cleared',
        'cancel',
        'add',
      ];

      return getFields(item, fields);
    }

    function getFieldsTableTransaction(item?: TransactionEntity) {
      const fields = [
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

      return getFields(item, fields);
    }

    function getFields(item: TransactionEntity | undefined, fields: string[]) {
      fields = item?.is_child
        ? ['select', 'payee', 'notes', 'category', 'debit', 'credit']
        : fields.filter(
            f =>
              (props.showAccount || f !== 'account') &&
              (props.showCategory || f !== 'category'),
          );

      if (item?.id && isPreviewId(item.id)) {
        fields = ['select'];
      }
      if (item?.id && isTemporaryId(item.id)) {
        // You can't focus the select/delete button of temporary
        // transactions
        fields = fields.slice(1);
      }

      return fields;
    }

    function afterSave(func: () => void) {
      if (savePending.current) {
        afterSaveFunc.current = func;
      } else {
        func();
      }
    }

    function onCheckNewEnter(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          e.stopPropagation();
          shouldAddAndClose.current = true;
          forceRerender({});
        } else if (!e.shiftKey) {
          function getLastTransaction(state: RefObject<TableState>) {
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

    function onCheckEnter(e: KeyboardEvent) {
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
    }, []);

    const onAddAndCloseTemporary = useCallback(() => {
      shouldAddAndClose.current = true;
      forceRerender({});
    }, []);

    const {
      onSave: onSaveProp,
      onApplyRules: onApplyRulesProp,
      onBatchDelete: onBatchDeleteProp,
      onBatchDuplicate: onBatchDuplicateProp,
      onBatchLinkSchedule: onBatchLinkScheduleProp,
      onBatchUnlinkSchedule: onBatchUnlinkScheduleProp,
      onCreateRule: onCreateRuleProp,
      onScheduleAction: onScheduleActionProp,
      onMakeAsNonSplitTransactions: onMakeAsNonSplitTransactionsProp,
      onSplit: onSplitProp,
    } = props;

    const onSave = useCallback(
      async (
        transaction: TransactionEntity,
        subtransactions: TransactionEntity[] | null = null,
        updatedFieldName: keyof TransactionEntity | null = null,
      ) => {
        savePending.current = true;

        let groupedTransaction = subtransactions
          ? groupTransaction([transaction, ...subtransactions])
          : transaction;

        if (isTemporaryId(transaction.id)) {
          if (onApplyRulesProp) {
            groupedTransaction = await onApplyRulesProp(
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
          onSaveProp(groupedTransaction);
        }
      },
      [onSaveProp, onApplyRulesProp],
    );

    const onDelete = useCallback((id: TransactionEntity['id']) => {
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

    const onBatchDelete = useCallback(
      (ids: TransactionEntity['id'][]) => {
        onBatchDeleteProp(ids);
      },
      [onBatchDeleteProp],
    );

    const onBatchDuplicate = useCallback(
      (ids: TransactionEntity['id'][]) => {
        onBatchDuplicateProp(ids);
      },
      [onBatchDuplicateProp],
    );

    const onBatchLinkSchedule = useCallback(
      (ids: TransactionEntity['id'][]) => {
        onBatchLinkScheduleProp(ids);
      },
      [onBatchLinkScheduleProp],
    );

    const onBatchUnlinkSchedule = useCallback(
      (ids: TransactionEntity['id'][]) => {
        onBatchUnlinkScheduleProp(ids);
      },
      [onBatchUnlinkScheduleProp],
    );

    const onCreateRule = useCallback(
      (ids: TransactionEntity['id'][]) => {
        onCreateRuleProp(ids);
      },
      [onCreateRuleProp],
    );

    const onScheduleAction = useCallback(
      (
        action:
          | 'skip'
          | 'post-transaction'
          | 'post-transaction-today'
          | 'complete',
        ids: TransactionEntity['id'][],
      ) => {
        onScheduleActionProp(action, ids);
      },
      [onScheduleActionProp],
    );

    const onMakeAsNonSplitTransactions = useCallback(
      (ids: TransactionEntity['id'][]) => {
        onMakeAsNonSplitTransactionsProp(ids);
      },
      [onMakeAsNonSplitTransactionsProp],
    );

    const onSplit = useMemo(() => {
      return (id: TransactionEntity['id']) => {
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
          const newId = onSplitProp(id);
          if (!trans) {
            return;
          }

          splitsExpandedDispatch({ type: 'open-split', id: trans.id });

          const { tableNavigator } = latestState.current;
          if (trans.amount === null) {
            tableNavigator.onEdit(trans.id, 'debit');
          } else {
            tableNavigator.onEdit(newId, tableNavigator.focusedField);
          }
        }
      };
    }, [onSplitProp, splitsExpandedDispatch]);

    const { onAddSplit: onAddSplitProp } = props;

    const onAddSplit = useCallback(
      (id: TransactionEntity['id']) => {
        const {
          tableNavigator,
          newNavigator,
          newTransactions: newTrans,
        } = latestState.current;

        if (isTemporaryId(id)) {
          const { data, diff } = addSplitTransaction(newTrans, id);
          setNewTransactions(data);
          newNavigator.onEdit(
            diff.added[0].id,
            latestState.current.newNavigator.focusedField,
          );
        } else {
          const newId = onAddSplitProp(id);
          tableNavigator.onEdit(
            newId,
            latestState.current.tableNavigator.focusedField,
          );
        }
      },
      [onAddSplitProp],
    );

    const onDistributeRemainder = useCallback(
      async (id: TransactionEntity['id']) => {
        const { transactions, newNavigator, tableNavigator, newTransactions } =
          latestState.current;

        const targetTransactions = isTemporaryId(id)
          ? newTransactions
          : transactions;
        const transaction = targetTransactions.find(t => t.id === id);

        const parentTransaction = transaction?.is_parent
          ? transaction
          : targetTransactions.find(t => t.id === transaction?.parent_id);

        const siblingTransactions = targetTransactions.filter(
          t =>
            t.parent_id &&
            t.parent_id ===
              (transaction?.is_parent
                ? transaction?.id
                : transaction?.parent_id),
        );

        const emptyTransactions = siblingTransactions.filter(
          t => t.amount === 0,
        );
        if (!parentTransaction) {
          console.error(
            'Parent transaction not found for transaction',
            transaction,
          );
          return;
        }

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
      [onSave],
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
      (id: TransactionEntity['id']) =>
        splitsExpandedDispatch({ type: 'toggle-split', id }),
      [splitsExpandedDispatch],
    );

    const displayPayeeTransactions = useMemo(
      () => [...props.transactions, ...newTransactions],
      [props.transactions, newTransactions],
    );

    return (
      <DisplayPayeeProvider transactions={displayPayeeTransactions}>
        <TransactionTableInner
          tableRef={mergedRef}
          listContainerRef={listContainerRef}
          {...props}
          transactions={transactionsWithExpandedSplits}
          transactionMap={transactionMap}
          transactionsByParent={transactionsByParent}
          transferAccountsByTransaction={transferAccountsByTransaction}
          selectedItems={selectedItems}
          isExpanded={splitsExpanded.isExpanded}
          onSave={onSave}
          onDelete={onDelete}
          onBatchDelete={onBatchDelete}
          onBatchDuplicate={onBatchDuplicate}
          onBatchLinkSchedule={onBatchLinkSchedule}
          onBatchUnlinkSchedule={onBatchUnlinkSchedule}
          onCreateRule={onCreateRule}
          onScheduleAction={onScheduleAction}
          onMakeAsNonSplitTransactions={onMakeAsNonSplitTransactions}
          onSplit={onSplit}
          onCheckNewEnter={onCheckNewEnter}
          onCheckEnter={onCheckEnter}
          onAddTemporary={onAddTemporary}
          onAddAndCloseTemporary={onAddAndCloseTemporary}
          onAddSplit={onAddSplit}
          onDistributeRemainder={onDistributeRemainder}
          onCloseAddTransaction={onCloseAddTransaction}
          onToggleSplit={onToggleSplit}
          newTransactions={newTransactions ?? []}
          tableNavigator={tableNavigator}
          newNavigator={newNavigator}
          showSelection={props.showSelection}
          allowSplitTransaction={props.allowSplitTransaction}
          showHiddenCategories={showHiddenCategories}
        />
      </DisplayPayeeProvider>
    );
  },
);

TransactionTable.displayName = 'TransactionTable';
