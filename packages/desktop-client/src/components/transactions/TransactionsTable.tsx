import {
  createElement,
  createRef,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  CSSProperties,
  ForwardedRef,
  KeyboardEvent,
  ReactNode,
  Ref,
  RefObject,
} from 'react';
import { DragPreview } from 'react-aria';
import type { DragPreviewRenderer } from 'react-aria';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgSplit } from '@actual-app/components/icons/v0';
import {
  SvgArrowDown,
  SvgArrowUp,
  SvgCheveronDown,
} from '@actual-app/components/icons/v1';
import {
  SvgAlertTriangle,
  SvgArrowsSynchronize,
  SvgCalendar3,
  SvgCheckCircle1,
  SvgCheckCircleHollow,
  SvgEditSkull1,
  SvgHyperlink2,
  SvgLockClosed,
  SvgSubtract,
} from '@actual-app/components/icons/v2';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { memoizeOne } from '@actual-app/core/shared/memoize';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import { DEFAULT_UPCOMING_SCHEDULE_DAYS } from '@actual-app/core/shared/schedules';
import {
  addSplitTransaction,
  deleteTransaction,
  groupTransaction,
  isPreviewId,
  isTemporaryId,
  makeEmptySplitSubtransactions,
  splitTransaction,
  ungroupTransactions,
  updateTransaction,
} from '@actual-app/core/shared/transactions';
import {
  amountToCurrency,
  currencyToAmount,
  integerToCurrency,
  titleFirst,
} from '@actual-app/core/shared/util';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  PayeeEntity,
  RuleEntity,
  ScheduleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { format as formatDate, parseISO } from 'date-fns';

import { getAccountsById } from '#accounts/accountsSlice';
import { AccountAutocomplete } from '#components/autocomplete/AccountAutocomplete';
import { CategoryAutocomplete } from '#components/autocomplete/CategoryAutocomplete';
import { PayeeAutocomplete } from '#components/autocomplete/PayeeAutocomplete';
import { TagAutocomplete } from '#components/autocomplete/TagAutocomplete';
import { TransferDirectionIcon } from '#components/common/TransferDirectionIcon';
import { getStatusProps } from '#components/schedules/StatusBadge';
import type { StatusTypes } from '#components/schedules/StatusBadge';
import { DateSelect } from '#components/select/DateSelect';
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
  UnexposedCellContent,
  useTableNavigator,
} from '#components/table';
import type {
  TableHandleRef,
  TableNavigator,
  TableProps,
} from '#components/table';
import {
  SchedulesProvider,
  useCachedSchedules,
} from '#hooks/useCachedSchedules';
import { DisplayPayeeProvider, useDisplayPayee } from '#hooks/useDisplayPayee';
import {
  DropHighlight,
  isValidBoundaryDrop,
  useDrag,
  useDrop,
} from '#hooks/useDragDrop';
import type {
  DropPosition,
  OnDragChangeCallback,
  OnDropCallback,
} from '#hooks/useDragDrop';
import { useLocalPref } from '#hooks/useLocalPref';
import { useMergedRefs } from '#hooks/useMergedRefs';
import { usePrevious } from '#hooks/usePrevious';
import { useProperFocus } from '#hooks/useProperFocus';
import { useResizeObserver } from '#hooks/useResizeObserver';
import { useSelectedDispatch, useSelectedItems } from '#hooks/useSelected';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSplitsExpanded } from '#hooks/useSplitsExpanded';
import type { SplitsExpandedContextValue } from '#hooks/useSplitsExpanded';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import { NotesTagFormatter } from '#notes/NotesTagFormatter';
import { addNotification } from '#notifications/notificationsSlice';
import { getPayeesById } from '#payees';
import { aqlQuery } from '#queries/aqlQuery';
import { useDispatch } from '#redux';
import { getStatusLabel } from '#util/schedule';
import {
  calculateFutureTransactionInfo,
  createSingleTimeScheduleFromTransaction,
  isFutureTransaction,
} from '#util/schedule-actions';

import {
  isTransactionTableColumnAvailableInChildRows,
  isTransactionTableColumnDisplayOnly,
  TRANSACTION_TABLE_COLUMN_IDS,
  useTransactionTableColumnLabels,
} from './table/columns';
import type { TransactionTableColumnId } from './table/columns';
import {
  deserializeTransaction,
  isLastChild,
  makeTemporaryTransactions,
  selectAscDesc,
  serializeTransaction,
} from './table/utils';
import type {
  SerializedTransaction,
  TransactionEditFunction,
  TransactionUpdateFunction,
} from './table/utils';
import { useTransactionRowContextActions } from './useTransactionRowContextActions';

type AmountColumnWidths = {
  amount: number; // Applies to both debit and credit columns
  balance: number;
};

export const DEFAULT_AMOUNT_COLUMN_WIDTHS: AmountColumnWidths = {
  amount: 100,
  balance: 103,
};

// Tabular numerals (styles.tnum) make every digit glyph the same width, so a
// per-character estimate is a good enough proxy for the pixel width for a
// formatted amount. This would need to be adjusted with the font size.
const AMOUNT_COLUMN_CHAR_WIDTH = 7;
const AMOUNT_COLUMN_PADDING = 16;

function measureAmountColumnWidth(values: string[], minWidth: number) {
  const maxChars = values.reduce(
    (max, value) => Math.max(max, value.length),
    0,
  );
  return Math.max(
    minWidth,
    maxChars * AMOUNT_COLUMN_CHAR_WIDTH + AMOUNT_COLUMN_PADDING,
  );
}

// Widths are computed from every transaction currently loaded so the
// column doesn't jump width while scrolling.
export function useAmountColumnWidths(
  transactions: TransactionEntity[],
  balances: Record<TransactionEntity['id'], IntegerAmount> | null,
): AmountColumnWidths {
  const debitCreditValues = transactions.map(t =>
    integerToCurrency(Math.abs(t.amount ?? 0)),
  );
  const balanceValues = balances
    ? Object.values(balances).map(balance => integerToCurrency(balance))
    : [];

  return {
    amount: measureAmountColumnWidth(
      debitCreditValues,
      DEFAULT_AMOUNT_COLUMN_WIDTHS.amount,
    ),
    balance: measureAmountColumnWidth(
      balanceValues,
      DEFAULT_AMOUNT_COLUMN_WIDTHS.balance,
    ),
  };
}

type TransactionHeaderProps = {
  hasSelected: boolean;
  columns: TransactionTableColumnId[];
  scrollWidth: number;
  showSelection: boolean;
  onSort: (field: string, ascDesc: 'asc' | 'desc') => void;
  ascDesc: 'asc' | 'desc';
  field: string;
  amountColumnWidths: AmountColumnWidths;
};

const TransactionHeader = memo(
  ({
    hasSelected,
    columns,
    scrollWidth,
    onSort,
    ascDesc,
    field,
    showSelection,
    amountColumnWidths,
  }: TransactionHeaderProps) => {
    const dispatchSelected = useSelectedDispatch();
    const { t } = useTranslation();
    const columnLabels = useTransactionTableColumnLabels();

    useHotkeys(
      'ctrl+a, cmd+a, meta+a',
      () => dispatchSelected({ type: 'select-all' }),
      {
        preventDefault: true,
        scopes: ['app'],
      },
      [dispatchSelected],
    );

    // Per-column header cell config. `sortDirection` is the direction used
    // when the column is first clicked; columns without one aren't sortable.
    const headerConfig: Record<
      TransactionTableColumnId,
      Omit<HeaderCellProps, 'id' | 'icon' | 'onClick'> & {
        sortDirection?: 'asc' | 'desc';
      }
    > = {
      date: {
        value: columnLabels.date,
        width: 110,
        alignItems: 'flex',
        marginLeft: -5,
        sortDirection: 'desc',
      },
      account: {
        value: columnLabels.account,
        width: 'flex',
        alignItems: 'flex',
        marginLeft: -5,
        sortDirection: 'asc',
      },
      payee: {
        value: columnLabels.payee,
        width: 'flex',
        alignItems: 'flex',
        marginLeft: -5,
        sortDirection: 'asc',
      },
      notes: {
        value: columnLabels.notes,
        width: 'flex',
        alignItems: 'flex',
        marginLeft: -5,
        sortDirection: 'asc',
      },
      group: {
        value: t('Group'),
        width: 'flex',
        alignItems: 'flex',
        marginLeft: -5,
      },
      category: {
        value: columnLabels.category,
        width: 'flex',
        alignItems: 'flex',
        marginLeft: -5,
        sortDirection: 'asc',
      },
      payment: {
        value: columnLabels.payment,
        width: amountColumnWidths.amount,
        alignItems: 'flex-end',
        marginRight: -5,
        sortDirection: 'asc',
      },
      deposit: {
        value: columnLabels.deposit,
        width: amountColumnWidths.amount,
        alignItems: 'flex-end',
        marginRight: -5,
        sortDirection: 'desc',
      },
      balance: {
        value: t('Balance'),
        width: amountColumnWidths.balance,
        alignItems: 'flex-end',
        marginRight: -5,
      },
      cleared: {
        value: '✓',
        width: 38,
        alignItems: 'center',
        tooltip: <ClearedColumnLegend />,
        sortDirection: 'asc',
      },
    };

    return (
      <Row
        style={{
          fontWeight: 300,
          zIndex: 200,
          color: theme.tableHeaderText,
          backgroundColor: theme.tableHeaderBackground,
          paddingRight: `${5 + (scrollWidth ?? 0)}px`,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.tableBorder,
        }}
        data-testid="transaction-table-header"
      >
        {showSelection && (
          <SelectCell
            exposed
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
        {columns.map(columnId => {
          const { sortDirection, ...cellProps } = headerConfig[columnId];
          return (
            <HeaderCell
              key={columnId}
              id={columnId}
              {...cellProps}
              icon={
                sortDirection
                  ? field === columnId
                    ? ascDesc
                    : 'clickable'
                  : undefined
              }
              onClick={
                sortDirection
                  ? () =>
                      onSort(
                        columnId,
                        selectAscDesc(field, ascDesc, columnId, sortDirection),
                      )
                  : undefined
              }
            />
          );
        })}
      </Row>
    );
  },
);

TransactionHeader.displayName = 'TransactionHeader';

function ClearedColumnLegend() {
  const legendItems = [
    {
      Icon: SvgCheckCircleHollow,
      color: theme.pageTextSubdued,
      label: <Trans>Uncleared: not yet verified</Trans>,
    },
    {
      Icon: SvgCheckCircle1,
      color: theme.noticeTextLight,
      label: <Trans>Cleared: verified against your account</Trans>,
    },
    {
      Icon: SvgLockClosed,
      color: theme.noticeTextLight,
      label: <Trans>Reconciled: locked after reconciliation</Trans>,
    },
    {
      Icon: SvgCalendar3,
      color: theme.pageTextSubdued,
      label: <Trans>Upcoming scheduled transaction</Trans>,
    },
    {
      Icon: SvgAlertTriangle,
      color: theme.warningText,
      label: <Trans>Due scheduled transaction</Trans>,
    },
    {
      Icon: SvgEditSkull1,
      color: theme.errorText,
      label: <Trans>Missed scheduled transaction</Trans>,
    },
  ];

  return (
    <View style={{ maxWidth: 260, padding: 4 }}>
      <Text style={{ fontWeight: 600 }}>
        <Trans>Transaction status</Trans>
      </Text>
      {legendItems.map(({ Icon, color, label }, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
          }}
        >
          <Icon style={{ width: 13, height: 13, color, flexShrink: 0 }} />
          <Text>{label}</Text>
        </View>
      ))}
    </View>
  );
}

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
  tooltip?: ReactNode;
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
  tooltip,
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
      unexposedContent={({ value: cellValue }) => {
        const content = onClick ? (
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
        );

        return tooltip ? (
          <Tooltip content={tooltip} placement="bottom end">
            {content}
          </Tooltip>
        ) : (
          content
        );
      }}
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
                style={{
                  ...styles.tooltip,
                  borderRadius: '0px 5px 5px 0px',
                }}
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
                  style={{
                    ...styles.tooltip,
                    borderRadius: '0px 5px 5px 0px',
                  }}
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
          showManagePayees
          clearOnBlur={false}
          focused
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
          <TransferDirectionIcon
            isDeposit={isDeposit}
            style={transferIconStyle}
          />
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
  columns: TransactionTableColumnId[];
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
  // Drag and drop props
  canDrag?: boolean;
  draggedDate?: string | null;
  draggedId?: TransactionEntity['id'] | null;
  draggedParentId?: TransactionEntity['parent_id'] | null;
  siblingCount?: number;
  previewSiblingCount?: number;
  prevRowDate?: string | null;
  nextRowDate?: string | null;
  sortField?: string;
  ascDesc?: 'asc' | 'desc';
  onDragChange?: OnDragChangeCallback<TransactionEntity>;
  onDrop?: OnDropCallback;
  index: number;
  amountColumnWidths: AmountColumnWidths;
};

const Transaction = memo(function Transaction({
  allTransactions,
  transaction: originalTransaction,
  subtransactions,
  transferAccountsByTransaction,
  editing,
  columns,
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
  canDrag = false,
  draggedDate,
  draggedId,
  draggedParentId,
  siblingCount = 0,
  previewSiblingCount = 0,
  prevRowDate,
  nextRowDate,
  sortField,
  ascDesc,
  onDragChange,
  onDrop,
  index,
  amountColumnWidths,
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
  const [syncTransferDatePref, setSyncTransferDatePref] =
    useSyncedPref('sync-transfer-date');
  const syncTransferDate = String(syncTransferDatePref) === 'true';
  const setSyncTransferDate = (checked: boolean) =>
    setSyncTransferDatePref(checked ? 'true' : 'false');
  const transferDateSyncSeq = useRef(0);

  const onUpdate: TransactionUpdateFunction = async (name, value) => {
    // Had some issues with this is called twice which is a problem now that we are showing a warning
    // modal if the transaction is locked. I added a boolean to guard against showing the modal twice.
    // I'm still not completely happy with how the cells update pre/post modal. Sometimes you have to
    // click off of the cell manually after confirming your change post modal for example. The last
    // row seems to have more issues than others but the combination of tab, return, and clicking out
    // of the cell all have different implications as well.

    if (transaction[name] !== value) {
      const isReconciledField =
        name === 'credit' ||
        name === 'debit' ||
        name === 'payee' ||
        name === 'account' ||
        name === 'date';

      if (transaction.reconciled === true && isReconciledField) {
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
      } else if (
        isReconciledField &&
        transaction.transfer_id &&
        showReconciliationWarning === false
      ) {
        const { data } = await aqlQuery(
          q('transactions')
            .filter({ id: transaction.transfer_id, reconciled: true })
            .select('id'),
        );
        if ((data as TransactionEntity[]).length > 0) {
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
                  confirmReason: 'batchEditWithReconciledTransfer',
                },
              },
            }),
          );
        } else {
          onUpdateAfterConfirm(name, value);
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
      typeof value === 'string' &&
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

      if (name === 'date' && typeof value === 'string' && syncTransferDate) {
        // transaction's own leg, or a split child's leg
        const transferIds = [
          transaction.transfer_id,
          ...(subtransactions?.map(t => t.transfer_id) ?? []),
        ].filter((id): id is string => Boolean(id));

        if (transferIds.length > 0) {
          const seq = ++transferDateSyncSeq.current;
          void (async () => {
            const updated: { id: string; date: string }[] = transferIds.map(
              id => ({ id, date: value }),
            );

            // sync split parent if the other leg is a split child
            const { data } = (await aqlQuery(
              q('transactions')
                .filter({ id: { $oneof: transferIds } })
                .select(['id', 'is_child', 'parent_id']),
            )) as {
              data: Pick<TransactionEntity, 'id' | 'is_child' | 'parent_id'>[];
            };
            updated.push(
              ...data
                .filter(
                  (t): t is typeof t & { parent_id: string } =>
                    t.is_child === true && typeof t.parent_id === 'string',
                )
                .map(t => ({ id: t.parent_id, date: value })),
            );

            // a newer date edit started while we were querying: let it win
            if (seq !== transferDateSyncSeq.current) {
              return;
            }

            await send('transactions-batch-update', {
              updated,
              runTransfers: false,
            });
          })().catch(error => {
            console.error('Failed to sync transfer date:', error);
          });
        }
      }
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

  const valueStyle = added
    ? { fontWeight: 600, color: theme.tableTextItemAdded }
    : null;
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
  useEffect(() => {
    // The hack applies to only transactions with split errors
    if (!splitError) {
      return;
    }

    const id = setTimeout(() => {
      window.dispatchEvent(new Event('resize')); // Force popover to recalculate position
    }, 1);
    return () => clearTimeout(id);
  }, [splitError, allTransactions]);

  // Drag and drop support
  const isChildTransaction = transaction.is_child;
  const parentId = transaction.parent_id;
  // Disable drag if this is the only transaction on its date (nothing to reorder with)
  // For child transactions, disable if there's only one sibling (nothing to reorder with)
  // For previews, disable if there's only one preview on this date (real transactions
  // sharing the date don't count; previews can only reorder against other previews)
  const isOnlyTransactionOnDate = isChildTransaction
    ? siblingCount <= 1
    : isPreview
      ? previewSiblingCount <= 1
      : prevRowDate !== transaction.date && nextRowDate !== transaction.date;
  const previewRef = useRef<DragPreviewRenderer>(null);
  // Row-level drag must not compete with inline editors (notes, amounts,
  // payee, etc.): otherwise clicks/drags inside inputs start a reorder drag
  // instead of moving the caret or selecting text (see GH #7567).
  const allowRowDrag =
    canDrag &&
    !isOnlyTransactionOnDate &&
    (!editing || focusedField === 'select' || focusedField === 'cleared');
  const { dragRef, dragProps } = useDrag<TransactionEntity>({
    item: originalTransaction,
    type: 'transaction',
    canDrag: allowRowDrag,
    onDragChange,
    preview: previewRef,
  });

  // Gate callbacks for non-reorderable rows (children/previews) to avoid invalid drop operations
  // For child transactions, allow drops only from siblings (same parent)
  // For previews, allow drops only from another preview on the same date
  const draggedIsPreview = draggedId != null && isPreviewId(draggedId);
  const isSiblingDrag = isChildTransaction && draggedParentId === parentId;
  const isSiblingPreviewDrag =
    isPreview && draggedIsPreview && draggedDate === transaction.date;
  const safeOnDrop: OnDropCallback | undefined = isPreview
    ? isSiblingPreviewDrag
      ? onDrop
      : undefined
    : draggedIsPreview
      ? undefined
      : isChildTransaction
        ? isSiblingDrag
          ? onDrop
          : undefined
        : onDrop;

  const { dropRef, dropProps, dropPos } = useDrop<TransactionEntity>({
    types: 'transaction',
    id: transaction.id,
    onDrop: safeOnDrop,
  });

  // Merge refs: drag on row, drop on outer view
  const rowRef = useMergedRefs(triggerRef, dragRef);

  // Check if this row is a valid drop target for the currently dragged transaction
  const isValidDropTarget = useMemo(() => {
    // Previews can only be valid drop targets for other previews on the
    // same date. Never mix preview and real transactions.
    if (isPreview !== draggedIsPreview) return false;
    if (isPreview) {
      return draggedDate === transaction.date && dropPos != null;
    }

    // When dragging a child transaction, only siblings are valid targets
    if (draggedParentId) {
      // Only allow drops between siblings (same parent)
      if (!isChildTransaction || draggedParentId !== parentId) return false;
      return dropPos != null;
    }

    // Child transactions are not valid drop targets for parent transactions
    if (isChildTransaction) return false;

    // Parent transaction drop logic (existing behavior)
    if (!draggedDate) return false;
    // Only allow drops when sorted by date (or no sort active)
    if (sortField && sortField !== 'date') return false;
    // Prevent inserting between a split parent and its children
    if (isParent && dropPos === 'after') return false;
    // Same date is always a valid drop target
    if (transaction.date === draggedDate) return true;
    // Boundary drops require a valid drop position
    if (!dropPos) return false;

    const isAscending = sortField === 'date' && ascDesc === 'asc';
    const neighborDate = dropPos === 'before' ? prevRowDate : nextRowDate;
    return isValidBoundaryDrop(
      dropPos,
      transaction.date,
      draggedDate,
      neighborDate ?? null,
      isAscending,
    );
  }, [
    draggedDate,
    draggedParentId,
    draggedIsPreview,
    parentId,
    isChildTransaction,
    isPreview,
    sortField,
    isParent,
    dropPos,
    transaction.date,
    ascDesc,
    prevRowDate,
    nextRowDate,
  ]);

  // Dim this row if it (or its parent) is being dragged
  const isBeingDragged =
    draggedId != null &&
    (draggedId === transaction.id || draggedId === transaction.parent_id);

  // Show drop highlight only for valid targets that aren't the dragged row
  const showDropHighlight = Boolean(
    dropPos && isValidDropTarget && !isBeingDragged,
  );

  useTransactionRowContextActions({
    rowRef: triggerRef,
    transaction,
    getTransaction: id => allTransactions?.find(t => t.id === id),
    onDelete: ids => onBatchDelete?.(ids),
    onDuplicate: ids => onBatchDuplicate?.(ids),
    onLinkSchedule: ids => onBatchLinkSchedule?.(ids),
    onUnlinkSchedule: ids => onBatchUnlinkSchedule?.(ids),
    onCreateRule: ids => onCreateRule?.(ids),
    onScheduleAction: (name, ids) => onScheduleAction?.(name, ids),
    onMakeAsNonSplitTransactions: ids => onMakeAsNonSplitTransactions?.(ids),
  });

  // For child transactions the date/account cells render as blank
  // placeholders, and the select/delete cell sits immediately before the
  // first content cell instead of at the far left. Both layouts use the
  // same set of cell widths, so the columns still line up with the parent.
  let selectionCellIndex = 0;
  if (isChild) {
    const firstContentIndex = columns.findIndex(
      isTransactionTableColumnAvailableInChildRows,
    );
    selectionCellIndex =
      firstContentIndex === -1 ? columns.length : firstContentIndex;
  }

  const selectionCell = isTemporaryId(transaction.id) ? (
    isChild ? (
      <DeleteCell
        onDelete={() => onDelete && onDelete(transaction.id)}
        exposed={editing}
        style={{
          ...(isChild && { borderLeftWidth: 1 }),
          lineHeight: 0,
        }}
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
  );

  const renderColumnCell = (columnId: TransactionTableColumnId) => {
    switch (columnId) {
      case 'date':
        return isChild ? (
          <Field
            key={columnId}
            /* Date blank placeholder for Child transaction */
            width={110}
            style={{
              width: 110,
              backgroundColor: theme.tableRowBackgroundHover,
              border: 0, // known z-order issue, bottom border for parent transaction hidden
            }}
          />
        ) : (
          <CustomCell
            key={columnId}
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
            onExpose={name => {
              if (!isPreview) {
                onEdit(id, name);
              }
            }}
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
                clearOnBlur
                onUpdate={onUpdate}
                onSelect={onSave}
                transferDateSyncChecked={syncTransferDate}
                onTransferDateSyncChange={
                  transaction.transfer_id ||
                  subtransactions?.some(t => t.transfer_id)
                    ? setSyncTransferDate
                    : undefined
                }
              />
            )}
          </CustomCell>
        );
      case 'account':
        return isChild ? (
          <Field
            key={columnId}
            /* Account blank placeholder for Child transaction */
            style={{
              flex: 1,
              backgroundColor: theme.tableRowBackgroundHover,
              border: 0,
            }}
          />
        ) : (
          <CustomCell
            key={columnId}
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
                focused
                inputProps={{ onBlur, onKeyDown, style: inputStyle }}
                onUpdate={onUpdate}
                onSelect={onSave}
              />
            )}
          </CustomCell>
        );
      case 'payee':
        return (
          <PayeeCell
            key={columnId}
            /* Payee field for all transactions */
            id={id}
            payee={payee}
            focused={focusedField === 'payee'}
            /* Filter out the account we're currently in as it is not a valid transfer */
            accounts={accounts.filter(account => account.id !== accountId)}
            payees={payees.filter(
              payee =>
                !payee.transfer_acct || payee.transfer_acct !== accountId,
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
        );
      case 'notes':
        return (
          <NotesCell
            key={columnId}
            note={notes ?? ''}
            scheduleNote={isPreview ? schedule?.name : null}
            focused={focusedField === 'notes'}
            valueStyle={valueStyle}
            onClickTag={onNotesTagClick}
            onUpdate={value => {
              onUpdate('notes', value?.trim());
            }}
            onExpose={name => !isPreview && onEdit(id, name)}
          />
        );
      case 'group':
        return (
          <Cell
            key={columnId}
            name="group"
            width="flex"
            style={{
              fontStyle: 'italic',
              color: theme.pageTextSubdued,
              fontWeight: 300,
            }}
            value={
              categoryId
                ? (getGroupByCatId(categoryGroups)[categoryId]?.name ?? '')
                : ''
            }
          />
        );
      case 'category':
        return (isPreview && !isChild) || isParent ? (
          <Cell
            key={columnId}
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
            key={columnId}
            /* Category field for transfer and off budget transactions
              (NOT preview, it is covered first) */
            name="category"
            width="flex"
            exposed={focusedField === 'category'}
            focused={focusedField === 'category'}
            onExpose={name => onEdit(id, name)}
            value={
              isOffBudget
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
            key={columnId}
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
                  focused
                  clearOnBlur={false}
                  showSplitOption={
                    !isChild && !isParent && allowSplitTransaction
                  }
                  showCreateOption
                  shouldSaveFromKey={shouldSaveFromKey}
                  inputProps={{ onBlur, onKeyDown, style: inputStyle }}
                  onUpdate={onUpdate}
                  onSelect={onSave}
                  showHiddenCategories={showHiddenCategories}
                />
              </SheetNameProvider>
            )}
          </CustomCell>
        );
      case 'payment':
        return (
          <InputCell
            key={columnId}
            /* Debit field for all transactions */
            type="input"
            width={amountColumnWidths.amount}
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
              value:
                debit === '' && credit === '' ? amountToCurrency(0) : debit,
              onUpdate: onUpdate.bind(null, 'debit'),
              'data-1p-ignore': true,
            }}
            privacyFilter={{
              activationFilters: [!isTemporaryId(transaction.id)],
            }}
          />
        );
      case 'deposit':
        return (
          <InputCell
            key={columnId}
            /* Credit field for all transactions */
            type="input"
            width={amountColumnWidths.amount}
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
        );
      case 'balance':
        return (
          <Cell
            key={columnId}
            /* Balance field for all transactions */
            name="balance"
            value={
              runningBalance == null || isChild || isTemporaryId(id)
                ? ''
                : integerToCurrency(runningBalance)
            }
            valueStyle={{
              color:
                runningBalance < 0
                  ? theme.numberNegative
                  : theme.numberPositive,
            }}
            style={{ ...styles.tnum, ...amountStyle }}
            width={amountColumnWidths.balance}
            textAlign="right"
            privacyFilter
          />
        );
      case 'cleared':
        return (
          <StatusCell
            key={columnId}
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
        );
      default:
        return null;
    }
  };

  return (
    <View
      innerRef={dropRef}
      {...dropProps}
      style={{
        position: 'relative',
      }}
    >
      <DropHighlight pos={showDropHighlight ? dropPos : null} />
      <Row
        ref={rowRef}
        {...dragProps}
        style={{
          backgroundColor: selected
            ? theme.tableRowBackgroundHighlight
            : backgroundFocus
              ? theme.tableRowBackgroundHover
              : index % 2 === 0
                ? theme.tableBackground
                : theme.tableRowBackgroundAlternate,
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
          ...(isBeingDragged && { opacity: 0.5 }),
        }}
      >
        {splitError && listContainerRef?.current && (
          <Popover
            triggerRef={triggerRef}
            isOpen
            isNonModal
            style={{
              width: 'max-content',
              maxWidth: 'none',
              maxHeight: 'none !important',
              minWidth: 375,
              padding: 5,
            }}
            shouldFlip={false}
            placement="bottom end"
            UNSTABLE_portalContainer={listContainerRef.current}
          >
            {splitError}
          </Popover>
        )}

        {columns.slice(0, selectionCellIndex).map(renderColumnCell)}
        {selectionCell}
        {columns.slice(selectionCellIndex).map(renderColumnCell)}

        <Cell width={5} />
      </Row>
      <DragPreview ref={previewRef}>
        {() => (
          <View
            style={{
              backgroundColor: theme.tableBackground,
              borderRadius: 4,
              padding: '8px 16px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              width: '50vw',
              minWidth: 500,
              flexDirection: 'row',
              alignItems: 'center',
              border: '1px solid ' + theme.tableBorder,
              opacity: 0.8,
            }}
          >
            <Text style={{ color: theme.tableText, width: '10%' }}>
              {date ? formatDate(parseISO(date), dateFormat) : ''}
            </Text>
            <Text
              style={{
                fontWeight: 500,
                color: theme.tableText,
                width: '50%',
                paddingLeft: 16,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {payee?.name || importedPayee || <Trans>No payee</Trans>}
            </Text>
            <Text
              style={{
                color: isParent ? theme.tableTextSubdued : theme.tableText,
                fontStyle: isParent ? 'italic' : undefined,
                width: '30%',
                paddingLeft: 16,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {isParent ? (
                <Trans>Split ({{ count: subtransactions?.length ?? 0 }})</Trans>
              ) : categoryId ? (
                (getCategoriesById(categoryGroups)[categoryId]?.name ?? '')
              ) : (
                ''
              )}
            </Text>
            <Text
              style={{
                color: theme.tableText,
                width: '10%',
                paddingLeft: 16,
                textAlign: 'right',
              }}
            >
              {integerToCurrency(amount)}
            </Text>
          </View>
        )}
      </DragPreview>
    </View>
  );
});

type NotesCellProps = {
  note: string;
  scheduleNote: string | null | undefined;
  focused: boolean;
  valueStyle: CSSProperties | null;
  onUpdate: (value: string) => void;
  onClickTag: (tag: string) => void;
  onExpose: (name: string) => void;
};

function NotesCell({
  note,
  scheduleNote,
  focused,
  valueStyle,
  onUpdate,
  onClickTag,
  onExpose,
}: NotesCellProps) {
  const [inputValue, setInputValue] = useState(note);
  useEffect(() => {
    setInputValue(note);
  }, [note, setInputValue]);

  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const checkTruncated = useCallback(() => {
    const el = textRef.current;
    setIsTruncated(el != null && el.scrollWidth > el.clientWidth);
  }, []);
  const resizeRef = useResizeObserver<HTMLSpanElement>(checkTruncated);
  const setTextRef = useCallback(
    (el: HTMLSpanElement | null) => {
      textRef.current = el;
      resizeRef(el as HTMLSpanElement);
    },
    [resizeRef],
  );

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      onUpdate(inputValue);
    } else if (e.key === 'Escape') {
      setInputValue(note);
    }
  }

  const displayedNote = note || scheduleNote || '';

  useLayoutEffect(() => {
    checkTruncated();
  }, [displayedNote, checkTruncated]);

  return (
    <CustomCell
      width="flex"
      name="notes"
      value={displayedNote}
      valueStyle={valueStyle}
      formatter={value =>
        NotesTagFormatter({ notes: value, onNotesTagClick: onClickTag })
      }
      focused={focused}
      exposed={focused}
      onExpose={onExpose}
      onUpdate={onUpdate}
      onKeyDown={onKeyDown}
      onBlur={() => onUpdate(inputValue)}
      unexposedContent={props => (
        <Tooltip
          content={
            <View style={{ padding: 10, maxWidth: 400 }}>
              <Text style={{ whiteSpace: 'pre-wrap' }}>
                <NotesTagFormatter
                  notes={displayedNote}
                  onNotesTagClick={onClickTag}
                />
              </Text>
            </View>
          }
          style={{ ...styles.tooltip }}
          placement="bottom start"
          triggerProps={{ delay: 500, isDisabled: !isTruncated }}
        >
          <UnexposedCellContent {...props} ref={setTextRef} />
        </Tooltip>
      )}
    >
      {({ inputStyle, onKeyDown, onBlur }) => (
        <TagAutocomplete
          inputValue={inputValue}
          setInputValue={setInputValue}
          inputStyle={inputStyle}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onUpdate={onUpdate}
        />
      )}
    </CustomCell>
  );
}

type TransactionErrorProps = {
  error: NonNullable<TransactionEntity['error']>;
  isDeposit: boolean;
  onAddSplit: () => void;
  onDistributeRemainder: () => void;
  style?: CSSProperties;
};

function TransactionError({
  error,
  isDeposit,
  onAddSplit,
  onDistributeRemainder,
  style,
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
              gap: 5,
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
              onPress={onDistributeRemainder}
              data-testid="distribute-split-button"
            >
              <Trans>Distribute</Trans>
            </Button>
            <Button
              variant="primary"
              style={{ padding: '4px 10px' }}
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
  onSchedule: () => void;
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
  columns: TransactionTableColumnId[];
  balance?: number | null;
  transactions: TransactionEntity[];
  amountColumnWidths: AmountColumnWidths;
  transferAccountsByTransaction: {
    [id: TransactionEntity['id']]: AccountEntity | null;
  };
  showHiddenCategories?: boolean;
};
function NewTransaction({
  transactions,
  amountColumnWidths,
  accounts,
  categoryGroups,
  payees,
  transferAccountsByTransaction,
  editingTransaction,
  focusedField,
  columns,
  dateFormat,
  hideFraction,
  onClose,
  onSplit,
  onToggleSplit,
  onEdit,
  onDelete,
  onSave,
  onSchedule,
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
  const isFuture = isFutureTransaction(transactions[0]);

  const childTransactions = transactions.filter(
    t => t.parent_id === transactions[0].id,
  );

  const addButtonRef = useRef(null);
  useProperFocus(addButtonRef, focusedField === 'add');
  const scheduleButtonRef = useRef(null);
  useProperFocus(scheduleButtonRef, focusedField === 'schedule');
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
      {transactions.map((transaction, index) => (
        <Transaction
          key={transaction.id}
          index={index}
          amountColumnWidths={amountColumnWidths}
          editing={editingTransaction === transaction.id}
          transaction={transaction}
          subtransactions={transaction.is_parent ? childTransactions : null}
          transferAccountsByTransaction={transferAccountsByTransaction}
          columns={columns}
          focusedField={
            editingTransaction === transaction.id ? focusedField : undefined
          }
          showZeroInDeposit={isDeposit}
          accounts={accounts}
          categoryGroups={categoryGroups}
          payees={payees}
          dateFormat={dateFormat}
          hideFraction={!!hideFraction}
          expanded
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
          showSelection
          allowSplitTransaction
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
        {isFuture && (
          <Button
            style={{ marginRight: 10, padding: '4px 10px' }}
            onPress={onSchedule}
            data-testid="schedule-button"
            ref={scheduleButtonRef}
          >
            <Trans>Schedule</Trans>
          </Button>
        )}
        {error ? (
          <TransactionError
            error={error}
            isDeposit={isDeposit}
            onAddSplit={() => onAddSplit(transactions[0].id)}
            onDistributeRemainder={() =>
              onDistributeRemainder(transactions[0].id)
            }
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
  columns: TransactionTableColumnId[];
  showReconciled: boolean;
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
  onScheduleTemporary: (id?: TransactionEntity['id']) => void;
  onAddTemporary: (id?: TransactionEntity['id']) => void;
  onAddAndCloseTemporary: () => void;
  onDistributeRemainder: (id: TransactionEntity['id']) => void;
  onToggleSplit: (id: TransactionEntity['id']) => void;
  onManagePayees: (id?: PayeeEntity['id']) => void;

  onSort: (field: string, ascDesc: 'asc' | 'desc') => void;
  showHiddenCategories?: boolean;
  // Drag and drop props
  canDrag?: boolean;
  draggedId?: TransactionEntity['id'] | null;
  draggedParentId?: TransactionEntity['parent_id'] | null;
  draggedDate?: string | null;
  onDragChange?: OnDragChangeCallback<TransactionEntity>;
  onDrop?: OnDropCallback;
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

  const amountColumnWidths = useAmountColumnWidths(
    transactionsToRender,
    props.balances,
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
      columns,
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

    // Get sibling count for child transactions (used for drag/drop)
    const siblingCount =
      trans.is_child && trans.parent_id
        ? (props.transactionsByParent[trans.parent_id]?.length ?? 0)
        : 0;

    // Get preview sibling count on the same date (used for drag/drop)
    const previewSiblingCount = isPreviewId(trans.id)
      ? props.transactions.filter(
          t => isPreviewId(t.id) && t.date === trans.date,
        ).length
      : 0;

    // Compute adjacent row dates for boundary drop detection
    // Use transactionsToRender (filtered list) to match rendered row indices
    // Skip non-reorderable rows (child/preview) when finding neighbors
    const findPrevReorderableDate = (): string | null => {
      for (let i = index - 1; i >= 0; i--) {
        const row = transactionsToRender[i];
        if (row && !row.is_child && !isPreviewId(row.id)) {
          return row.date ?? null;
        }
      }
      return null;
    };
    const findNextReorderableDate = (): string | null => {
      for (let i = index + 1; i < transactionsToRender.length; i++) {
        const row = transactionsToRender[i];
        if (row && !row.is_child && !isPreviewId(row.id)) {
          return row.date ?? null;
        }
      }
      return null;
    };
    const prevRowDate = findPrevReorderableDate();
    const nextRowDate = findNextReorderableDate();

    return (
      <Transaction
        allTransactions={props.transactions}
        editing={editing}
        transaction={trans}
        transferAccountsByTransaction={props.transferAccountsByTransaction}
        subtransactions={childTransactions}
        columns={columns}
        selected={selected}
        highlighted={false}
        added={isNew?.(trans.id)}
        expanded={isExpanded?.(trans.id)}
        matched={isMatched?.(trans.id)}
        showZeroInDeposit={isChildDeposit}
        balance={balances?.[trans.id] ?? 0}
        amountColumnWidths={amountColumnWidths}
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
            />
          )
        }
        listContainerRef={listContainerRef}
        showSelection={showSelection}
        allowSplitTransaction={allowSplitTransaction}
        showHiddenCategories={showHiddenCategories}
        canDrag={props.canDrag}
        draggedId={props.draggedId}
        draggedParentId={props.draggedParentId}
        draggedDate={props.draggedDate}
        siblingCount={siblingCount}
        previewSiblingCount={previewSiblingCount}
        prevRowDate={prevRowDate}
        nextRowDate={nextRowDate}
        sortField={props.sortField}
        ascDesc={props.ascDesc}
        onDragChange={props.onDragChange}
        onDrop={props.onDrop}
        index={index}
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
          columns={props.columns}
          scrollWidth={scrollWidth}
          onSort={props.onSort}
          ascDesc={props.ascDesc}
          field={props.sortField}
          showSelection={props.showSelection}
          amountColumnWidths={amountColumnWidths}
        />

        {props.isAdding && (
          <View
            {...newNavigator.getNavigatorProps({
              onKeyDown: (e: KeyboardEvent) => props.onCheckNewEnter(e),
            })}
          >
            <NewTransaction
              transactions={props.newTransactions}
              amountColumnWidths={amountColumnWidths}
              transferAccountsByTransaction={
                props.transferAccountsByTransaction
              }
              editingTransaction={newNavigator.editingId}
              focusedField={newNavigator.focusedField}
              accounts={props.accounts}
              categoryGroups={props.categoryGroups}
              payees={props.payees || []}
              columns={props.columns}
              dateFormat={dateFormat}
              hideFraction={props.hideFraction}
              onClose={props.onCloseAddTransaction}
              onSchedule={props.onScheduleTemporary}
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
  showGroup?: boolean;
  // The full set of columns the user wants visible, in display order. When
  // provided, columns are rendered in this order; the show* flags above
  // still control the availability of the account/category/group/balance/
  // cleared columns in the current view.
  columnOrder?: TransactionTableColumnId[];
  currentAccountId: AccountEntity['id'];
  currentCategoryId: CategoryEntity['id'];
  isAdding: boolean;
  isNew: (id: TransactionEntity['id']) => boolean;
  isMatched: (id: TransactionEntity['id']) => boolean;
  isFiltered?: boolean;
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
  onReorder?: (
    id: string,
    dropPos: DropPosition,
    targetId: string,
  ) => Promise<void> | void;
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
    const [upcomingLength = DEFAULT_UPCOMING_SCHEDULE_DAYS] = useSyncedPref(
      'upcomingScheduledTransactionLength',
    );
    const [newTransactions, setNewTransactions] = useState<TransactionEntity[]>(
      [],
    );

    // The ordered list of columns to render. The show* flags control which
    // of the account/category/balance/cleared columns are available in the
    // current view; `columnOrder` carries the user's column preferences.
    // Memoized manually (the compiler bails out on this component) so the
    // array identity is stable across renders — it crosses the `memo()`
    // boundary of every transaction row.
    const {
      columnOrder,
      showAccount,
      showCategory,
      showGroup,
      showBalances,
      showCleared,
    } = props;
    const visibleColumns = useMemo(
      () =>
        (columnOrder ?? TRANSACTION_TABLE_COLUMN_IDS).filter(columnId => {
          switch (columnId) {
            case 'account':
              return showAccount;
            case 'category':
              return showCategory;
            case 'group':
              return !!showGroup;
            case 'balance':
              return showBalances;
            case 'cleared':
              return showCleared;
            default:
              return true;
          }
        }),
      [
        columnOrder,
        showAccount,
        showCategory,
        showGroup,
        showBalances,
        showCleared,
      ],
    );
    const [prevIsAdding, setPrevIsAdding] = useState(false);
    const splitsExpanded = useSplitsExpanded();
    const splitsExpandedDispatch = splitsExpanded.dispatch;
    const prevSplitsExpanded = useRef<SplitsExpandedContextValue | null>(null);

    // Drag state for transaction reordering
    const [draggedId, setDraggedId] = useState<TransactionEntity['id'] | null>(
      null,
    );
    const [draggedDate, setDraggedDate] = useState<string | null>(null);
    const [draggedParentId, setDraggedParentId] = useState<
      TransactionEntity['parent_id'] | null
    >(null);

    // Dragging is enabled when:
    // - No sort is active (sortField is empty) OR sorted by date
    // - Not filtered (isFiltered is false)
    // - onReorder callback is provided
    const canDrag = useMemo(
      () =>
        (!props.sortField || props.sortField === 'date') &&
        !props.isFiltered &&
        props.onReorder != null,
      [props.sortField, props.isFiltered, props.onReorder],
    );

    const onDragChange = useCallback<OnDragChangeCallback<TransactionEntity>>(
      drag => {
        if (drag.state === 'start-preview') {
          // Set dragged item info immediately when drag preview starts
          setDraggedId(drag.item?.id ?? null);
          setDraggedDate(drag.item?.date ?? null);
          setDraggedParentId(drag.item?.parent_id ?? null);
        } else if (drag.state === 'end') {
          setDraggedId(null);
          setDraggedDate(null);
          setDraggedParentId(null);
        }
      },
      [],
    );

    const { onReorder } = props;
    const onDrop = useCallback<OnDropCallback>(
      (id, dropPos, targetId) => {
        if (id === targetId) {
          return;
        }
        void onReorder?.(id, dropPos, targetId);
      },
      [onReorder],
    );

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
    const shouldSchedule = useRef(false);
    const shouldAdd = useRef(false);
    const shouldAddAndClose = useRef(false);
    const pendingConvertToSchedule = useRef<null | {
      daysUntilTransaction: number;
      upcomingDays: number;
      onConfirm: () => void;
    }>(null);
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

    if (shouldSchedule.current) {
      const transactions = latestState.current.newTransactions;
      if (transactions[0] == null) {
        shouldSchedule.current = false;
      } else if (transactions[0].account == null) {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: t('Account is a required field'),
            },
          }),
        );
        newNavigator.onEdit('temp', 'account');
      } else if (transactions[0].schedule != null) {
        // Already linked to a schedule; keep it as a transaction.
        shouldSchedule.current = false;
      } else {
        const tx = transactions[0];
        const subs = tx.is_parent
          ? transactions.filter(t => t.parent_id === tx.id)
          : null;
        const transaction = subs ? groupTransaction([tx, ...subs]) : tx;

        const createSchedule = () => {
          afterSave(async () => {
            try {
              await createSingleTimeScheduleFromTransaction(transaction);
              dispatch(
                addNotification({
                  notification: {
                    type: 'message',
                    message: t('Schedule created successfully'),
                  },
                }),
              );
              // Reset form like onAddTemporary does
              setNewTransactions(
                makeTemporaryTransactions(
                  props.currentAccountId,
                  props.currentCategoryId,
                ),
              );
              newNavigator.onEdit('temp', 'date');
            } catch {
              dispatch(
                addNotification({
                  notification: {
                    type: 'error',
                    message: t('Failed to create schedule'),
                  },
                }),
              );
            }
          });
        };

        const { isBeyondWindow, daysUntilTransaction, upcomingDays } =
          calculateFutureTransactionInfo(transaction, upcomingLength);

        if (isBeyondWindow) {
          pendingConvertToSchedule.current = {
            daysUntilTransaction,
            upcomingDays,
            onConfirm: createSchedule,
          };
        } else {
          createSchedule();
        }
      }
      shouldSchedule.current = false;
    }

    useEffect(() => {
      if (pendingConvertToSchedule.current) {
        const options = pendingConvertToSchedule.current;
        pendingConvertToSchedule.current = null;
        dispatch(
          pushModal({
            modal: {
              name: 'convert-to-schedule',
              options,
            },
          }),
        );
      }
    });

    useEffect(() => {
      if (savePending.current && afterSaveFunc.current) {
        const func = afterSaveFunc.current;
        afterSaveFunc.current = null;
        savePending.current = false;
        func();
      } else {
        savePending.current = false;
      }
    }, [newTransactions, props, props.transactions]);

    function columnToField(columnId: TransactionTableColumnId) {
      // The payment/deposit columns map to the debit/credit fields
      return columnId === 'payment'
        ? 'debit'
        : columnId === 'deposit'
          ? 'credit'
          : columnId;
    }

    function getFocusableFields() {
      return visibleColumns
        .filter(columnId => !isTransactionTableColumnDisplayOnly(columnId))
        .map(columnToField);
    }

    function getFieldsNewTransaction(item?: TransactionEntity) {
      const fields = [
        'select',
        ...getFocusableFields(),
        'cancel',
        'schedule',
        'add',
      ];

      return getFields(item, fields).filter(
        f => f !== 'schedule' || (item ? isFutureTransaction(item) : false),
      );
    }

    function getFieldsTableTransaction(item?: TransactionEntity) {
      const fields = ['select', ...getFocusableFields()];

      return getFields(item, fields);
    }

    function getFields(item: TransactionEntity | undefined, fields: string[]) {
      fields = item?.is_child
        ? [
            'select',
            ...visibleColumns
              .filter(
                columnId =>
                  isTransactionTableColumnAvailableInChildRows(columnId) &&
                  !isTransactionTableColumnDisplayOnly(columnId),
              )
              .map(columnToField),
          ]
        : fields;

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
        if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
          const current = latestState.current.newTransactions[0];
          if (!current || !isFutureTransaction(current)) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          afterSave(() => {
            const transaction = latestState.current.newTransactions[0];
            if (transaction && isFutureTransaction(transaction)) {
              shouldSchedule.current = true;
              forceRerender({});
            }
          });
        } else if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          e.stopPropagation();
          afterSave(() => {
            shouldAddAndClose.current = true;
            forceRerender({});
          });
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

    const onScheduleTemporary = useCallback(() => {
      afterSave(() => {
        shouldSchedule.current = true;
        forceRerender({});
      });
    }, []);

    const onAddTemporary = useCallback(() => {
      afterSave(() => {
        shouldAdd.current = true;
        // A little hacky - this forces a rerender which will cause the
        // effect we want to run. We have to wait for all updates to be
        // committed (the input could still be saving a value).
        forceRerender({});
      });
    }, []);

    const onAddAndCloseTemporary = useCallback(() => {
      afterSave(() => {
        shouldAddAndClose.current = true;
        forceRerender({});
      });
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
          const { data, diff } = splitTransaction(
            newTrans,
            id,
            makeEmptySplitSubtransactions,
          );
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

        let amounts: number[] = [];
        if (emptyTransactions.length > 0) {
          const amountPerTransaction = Math.floor(
            remainingAmount / emptyTransactions.length,
          );
          let remainingCents =
            remainingAmount - amountPerTransaction * emptyTransactions.length;

          amounts = new Array(emptyTransactions.length).fill(
            amountPerTransaction,
          );

          for (const [amountIndex] of amounts.entries()) {
            if (remainingCents === 0) break;

            amounts[amountIndex] += 1;
            remainingCents--;
          }

          if (isTemporaryId(id)) {
            newNavigator.onEdit(null);
          } else {
            tableNavigator.onEdit(null);
          }

          for (const [
            transactionIndex,
            transaction,
          ] of emptyTransactions.entries()) {
            await onSave({
              ...transaction,
              amount: amounts[transactionIndex],
            });
          }
        } else if (
          emptyTransactions.length === 0 &&
          siblingTransactions.length > 0
        ) {
          const siblingTotal = siblingTransactions.reduce(
            (acc, t) => acc + t.amount,
            0,
          );
          const siblingProportions = siblingTransactions.map(
            t => t.amount / siblingTotal,
          );

          for (const [
            transactionIndex,
            transaction,
          ] of siblingTransactions.entries()) {
            amounts[transactionIndex] =
              Math.floor(
                siblingProportions[transactionIndex] * remainingAmount,
              ) + transaction.amount;
          }

          let remainingCents =
            parentTransaction.amount - amounts.reduce((acc, a) => acc + a, 0);

          let amountIndex = 0;
          while (remainingCents !== 0) {
            amountIndex = amountIndex % amounts.length;
            if (remainingCents > 0) {
              amounts[amountIndex] += 1;
              remainingCents--;
            } else {
              amounts[amountIndex] -= 1;
              remainingCents++;
            }
            amountIndex++;
          }

          if (isTemporaryId(id)) {
            newNavigator.onEdit(null);
          } else {
            tableNavigator.onEdit(null);
          }

          for (const [
            transactionIndex,
            transaction,
          ] of siblingTransactions.entries()) {
            await onSave({
              ...transaction,
              amount: amounts[transactionIndex],
            });
          }
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

    const allSchedulesQuery = useMemo(() => q('schedules').select('*'), []);

    return (
      <DisplayPayeeProvider transactions={displayPayeeTransactions}>
        <SchedulesProvider query={allSchedulesQuery}>
          <TransactionTableInner
            tableRef={mergedRef}
            listContainerRef={listContainerRef}
            {...props}
            columns={visibleColumns}
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
            onScheduleTemporary={onScheduleTemporary}
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
            canDrag={canDrag}
            draggedId={draggedId}
            draggedParentId={draggedParentId}
            draggedDate={draggedDate}
            onDragChange={onDragChange}
            onDrop={onDrop}
          />
        </SchedulesProvider>
      </DisplayPayeeProvider>
    );
  },
);

TransactionTable.displayName = 'TransactionTable';

const getCategoriesById = memoizeOne(
  (categoryGroups: CategoryGroupEntity[] | null | undefined) => {
    const res: { [id: CategoryEntity['id']]: CategoryEntity } = {};
    categoryGroups?.forEach(group => {
      group.categories?.forEach(cat => {
        res[cat.id] = cat;
      });
    });

    return res;
  },
);

const getGroupByCatId = memoizeOne(
  (categoryGroups: CategoryGroupEntity[] | null | undefined) => {
    const res: { [id: CategoryEntity['id']]: CategoryGroupEntity } = {};
    categoryGroups?.forEach(group => {
      group.categories?.forEach(cat => {
        res[cat.id] = group;
      });
    });

    return res;
  },
);
