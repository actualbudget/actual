import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { ForwardedRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  isTemporaryId,
  updateTransaction,
} from '@actual-app/core/shared/transactions';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { Table, useTableNavigator } from '#components/table';
import type { TableHandleRef } from '#components/table';
import { useSelectedItems } from '#hooks/useSelected';
import { useSplitsExpanded } from '#hooks/useSplitsExpanded';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import { makeTemporaryTransactions } from '../table/utils';
import { TransactionHeader } from './components/TransactionHeader';
import { TransactionRow } from './components/TransactionRow';
import {
  createInitialState,
  getRowHeight,
  getVisibleTransactions,
  isRowExpanded,
  tableReducer,
} from './TransactionTableState';
import type { TransactionTableProps } from './types';
import { useTransactionTableColumnLayout } from './useTransactionTableColumnLayout';

const ROW_HEIGHT = 32;

export const TransactionTable = forwardRef(
  (
    props: TransactionTableProps,
    ref: ForwardedRef<TableHandleRef<TransactionEntity>>,
  ) => {
    const { t } = useTranslation();
    const {
      transactions,
      loadMoreTransactions,
      accounts,
      categoryGroups,
      payees,
      balances,
      showBalances,
      showCleared,
      showAccount,
      showCategory,
      currentAccountId,
      currentCategoryId,
      isAdding,
      isNew,
      isMatched,
      dateFormat = 'MM/dd/yyyy',
      hideFraction,
      renderEmpty,
      onSave,
      onApplyRules,
      onSplit,
      onCloseAddTransaction,
      onAdd,
      style,
      onNavigateToTransferAccount,
      onNavigateToSchedule,
      onSort,
      sortField,
      ascDesc,
      allowSplitTransaction,
      showSelection,
      onManagePayees,
    } = props;

    const [state, dispatch] = useReducer(tableReducer, createInitialState());
    const [scrollWidth, setScrollWidth] = useState(0);
    const [temporaryTransactions, setTemporaryTransactions] = useState<
      TransactionEntity[]
    >([]);
    const tableRef = useRef<TableHandleRef<TransactionEntity>>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const previousIsAdding = useRef(isAdding);
    const previousTemporaryTransactionId = useRef<
      TransactionEntity['id'] | null
    >(null);
    const selectedItems = useSelectedItems();
    const splitsExpanded = useSplitsExpanded();
    const dispatchRedux = useDispatch();
    const [containerWidth, setContainerWidth] = useState(0);

    useImperativeHandle(ref, () => tableRef.current!);

    useEffect(() => {
      function updateContainerWidth() {
        setContainerWidth(tableContainerRef.current?.clientWidth ?? 0);
      }

      updateContainerWidth();

      const resizeObserver =
        typeof ResizeObserver !== 'undefined'
          ? new ResizeObserver(() => updateContainerWidth())
          : null;

      if (tableContainerRef.current && resizeObserver) {
        resizeObserver.observe(tableContainerRef.current);
      } else {
        window.addEventListener('resize', updateContainerWidth);
      }

      return () => {
        resizeObserver?.disconnect();
        window.removeEventListener('resize', updateContainerWidth);
      };
    }, []);

    useEffect(() => {
      if (!previousIsAdding.current && isAdding) {
        setTemporaryTransactions(
          makeTemporaryTransactions(currentAccountId, currentCategoryId),
        );
      } else if (previousIsAdding.current && !isAdding) {
        setTemporaryTransactions([]);
      }

      previousIsAdding.current = isAdding;
    }, [isAdding, currentAccountId, currentCategoryId]);

    const visibleTransactions = useMemo(() => {
      return getVisibleTransactions(transactions, splitsExpanded.isExpanded);
    }, [transactions, splitsExpanded]);

    const navigatorTransactions = useMemo(() => {
      if (temporaryTransactions.length === 0) {
        return visibleTransactions;
      }

      return [...temporaryTransactions, ...visibleTransactions];
    }, [temporaryTransactions, visibleTransactions]);

    const tableItems = useMemo(() => {
      return visibleTransactions.filter(
        transaction => !isTemporaryId(transaction.id),
      );
    }, [visibleTransactions]);

    const handleToggleSplit = useCallback(
      (id: TransactionEntity['id']) => {
        splitsExpanded.dispatch({ type: 'toggle-split', id });
      },
      [splitsExpanded],
    );

    const handleToggleRowExpansion = useCallback(
      (id: TransactionEntity['id']) => {
        dispatch({ type: 'TOGGLE_ROW_EXPANSION', id });
      },
      [],
    );

    const handleSetRowHeight = useCallback(
      (id: TransactionEntity['id'], height: number) => {
        dispatch({ type: 'SET_ROW_HEIGHT', id, height });
      },
      [],
    );

    const getEditableFields = useCallback(
      (item?: TransactionEntity) => {
        const fields: string[] = [];

        if (showSelection) {
          fields.push('select');
        }

        if (!item?.is_child) {
          fields.push('date');
          if (showAccount) {
            fields.push('account');
          }
        }

        fields.push('payee', 'notes');

        if (showCategory) {
          fields.push('category');
        }

        fields.push('debit', 'credit');

        if (showCleared) {
          fields.push('cleared');
        }

        return fields;
      },
      [showSelection, showAccount, showCategory, showCleared],
    );

    const tableNavigator = useTableNavigator(
      navigatorTransactions,
      getEditableFields,
    );
    const {
      columnWidths,
      tableWidth,
      getResizeHandleProps,
      resetAllColumnWidths,
      resetColumnWidth,
    } = useTransactionTableColumnLayout({
      containerWidth,
      showAccount,
      showBalances,
      showCategory,
      showCleared,
      showSelection,
    });

    useEffect(() => {
      const currentTemporaryTransactionId =
        temporaryTransactions[0]?.id ?? null;

      if (
        currentTemporaryTransactionId &&
        currentTemporaryTransactionId !== previousTemporaryTransactionId.current
      ) {
        tableNavigator.onEdit(currentTemporaryTransactionId, 'date');
        tableRef.current?.scrollToTop();
      }

      previousTemporaryTransactionId.current = currentTemporaryTransactionId;
    }, [temporaryTransactions, tableNavigator]);

    const handleSave = useCallback(
      (transaction: TransactionEntity) => {
        if (isTemporaryId(transaction.id)) {
          setTemporaryTransactions(
            prev => updateTransaction(prev, transaction).data,
          );
          return;
        }

        onSave(transaction);
      },
      [onSave],
    );

    const handleCloseAddTransaction = useCallback(() => {
      setTemporaryTransactions([]);
      onCloseAddTransaction();
    }, [onCloseAddTransaction]);

    const handleAddTemporaryTransaction = useCallback(
      (closeAfterAdd: boolean) => {
        if (temporaryTransactions.length === 0) {
          return;
        }

        const parentTransaction = temporaryTransactions[0];

        if (parentTransaction.account == null) {
          dispatchRedux(
            addNotification({
              notification: {
                type: 'error',
                message: t('Account is a required field'),
              },
            }),
          );
          tableNavigator.onEdit(parentTransaction.id, 'account');
          return;
        }

        if (parentTransaction.error) {
          return;
        }

        onAdd(temporaryTransactions);

        if (closeAfterAdd) {
          handleCloseAddTransaction();
          return;
        }

        const lastDate = temporaryTransactions[0]?.date ?? null;
        const nextTemporaryTransactions = makeTemporaryTransactions(
          currentAccountId,
          currentCategoryId,
          lastDate,
        );

        setTemporaryTransactions(nextTemporaryTransactions);
        tableNavigator.onEdit(nextTemporaryTransactions[0].id, 'date');
        tableRef.current?.scrollToTop();
      },
      [
        temporaryTransactions,
        onAdd,
        dispatchRedux,
        handleCloseAddTransaction,
        currentAccountId,
        currentCategoryId,
        tableNavigator,
        t,
      ],
    );

    const temporaryParentTransaction = temporaryTransactions[0] ?? null;
    const canAddTemporaryTransactions =
      !!temporaryParentTransaction &&
      temporaryParentTransaction.account != null &&
      !temporaryParentTransaction.error;

    const renderTemporaryTransactionSection = useMemo(() => {
      if (temporaryTransactions.length === 0) {
        return null;
      }

      return (
        <View
          style={{
            borderBottom: `1px solid ${theme.tableBorderHover}`,
            paddingBottom: 6,
            backgroundColor: theme.tableBackground,
          }}
          data-testid="new-transaction"
        >
          {temporaryTransactions.map((transaction, index) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              focusedField={
                tableNavigator.editingId === transaction.id
                  ? tableNavigator.focusedField
                  : null
              }
              selected={false}
              accounts={accounts}
              categoryGroups={categoryGroups}
              payees={payees}
              showCleared={showCleared}
              showAccount={showAccount}
              showBalances={showBalances}
              showCategory={showCategory}
              balance={null}
              hideFraction={hideFraction}
              isNew={index === 0}
              isMatched={false}
              isExpanded={false}
              isSplitExpanded={splitsExpanded.isExpanded(transaction.id)}
              rowHeight={ROW_HEIGHT}
              dateFormat={dateFormat}
              columnWidths={columnWidths}
              onEdit={tableNavigator.onEdit}
              onSave={handleSave}
              onToggleSplit={handleToggleSplit}
              onToggleRowExpansion={handleToggleRowExpansion}
              onSetRowHeight={handleSetRowHeight}
              onNavigateToTransferAccount={onNavigateToTransferAccount}
              onNavigateToSchedule={onNavigateToSchedule}
              onApplyRules={onApplyRules}
              onManagePayees={onManagePayees}
              onSplit={onSplit}
              allowSplitTransaction={allowSplitTransaction}
              showSelection={showSelection}
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
              onPress={handleCloseAddTransaction}
              data-testid="cancel-button"
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="primary"
              style={{ padding: '4px 10px' }}
              onPress={event =>
                handleAddTemporaryTransaction(
                  !!(event.metaKey || event.ctrlKey),
                )
              }
              isDisabled={!canAddTemporaryTransactions}
              data-testid="add-button"
            >
              <Trans>Add</Trans>
            </Button>
          </View>
        </View>
      );
    }, [
      temporaryTransactions,
      tableNavigator,
      accounts,
      categoryGroups,
      payees,
      showCleared,
      showAccount,
      showBalances,
      showCategory,
      hideFraction,
      columnWidths,
      splitsExpanded,
      dateFormat,
      handleSave,
      handleToggleSplit,
      handleToggleRowExpansion,
      handleSetRowHeight,
      onNavigateToTransferAccount,
      onNavigateToSchedule,
      onApplyRules,
      onManagePayees,
      onSplit,
      allowSplitTransaction,
      showSelection,
      handleCloseAddTransaction,
      handleAddTemporaryTransaction,
      canAddTemporaryTransactions,
    ]);

    // Note: Current Table component uses FixedSizeList, so all rows have same height
    // For variable heights, we'd need to implement VariableSizeList support
    // For now, expandable rows will have a fixed expanded height

    const renderRow = useCallback(
      ({
        item,
        editing,
        focusedField,
        onEdit,
      }: {
        item: TransactionEntity;
        editing: boolean;
        focusedField: string | null;
        onEdit: (id: TransactionEntity['id'], field: string) => void;
      }) => {
        const selected = selectedItems.has(item.id);
        const balance = balances?.[item.id] ?? null;
        const rowHeight = getRowHeight(state, item.id, ROW_HEIGHT);
        const isExpanded = isRowExpanded(state, item.id);
        const isSplitExpanded = splitsExpanded.isExpanded(item.id);

        return (
          <TransactionRow
            transaction={item}
            focusedField={editing ? focusedField : null}
            selected={selected}
            accounts={accounts}
            categoryGroups={categoryGroups}
            payees={payees}
            showCleared={showCleared}
            showAccount={showAccount}
            showBalances={showBalances}
            showCategory={showCategory}
            balance={balance}
            hideFraction={hideFraction}
            isNew={isNew(item.id)}
            isMatched={isMatched(item.id)}
            isExpanded={isExpanded}
            isSplitExpanded={isSplitExpanded}
            rowHeight={rowHeight}
            dateFormat={dateFormat}
            columnWidths={columnWidths}
            onEdit={onEdit}
            onSave={handleSave}
            onToggleSplit={handleToggleSplit}
            onToggleRowExpansion={handleToggleRowExpansion}
            onSetRowHeight={handleSetRowHeight}
            onNavigateToTransferAccount={onNavigateToTransferAccount}
            onNavigateToSchedule={onNavigateToSchedule}
            onApplyRules={onApplyRules}
            onManagePayees={onManagePayees}
            onSplit={onSplit}
            allowSplitTransaction={allowSplitTransaction}
            showSelection={showSelection}
          />
        );
      },
      [
        selectedItems,
        balances,
        columnWidths,
        state,
        splitsExpanded,
        accounts,
        categoryGroups,
        payees,
        showCleared,
        showAccount,
        showBalances,
        showCategory,
        hideFraction,
        isNew,
        isMatched,
        dateFormat,
        handleSave,
        handleToggleSplit,
        handleToggleRowExpansion,
        handleSetRowHeight,
        onNavigateToTransferAccount,
        onNavigateToSchedule,
        onApplyRules,
        onManagePayees,
        onSplit,
        allowSplitTransaction,
        showSelection,
      ],
    );

    const saveScrollWidth = useCallback((parent: number, child: number) => {
      const width = parent > 0 && child > 0 && parent - child;
      setScrollWidth(!width ? 0 : width);
    }, []);

    return (
      <View style={{ flex: 1, ...style }}>
        <View
          innerRef={tableContainerRef}
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
          }}
        >
          <View
            style={{
              flex: 1,
              width: tableWidth,
              minWidth: containerWidth || tableWidth,
            }}
          >
            <TransactionHeader
              hasSelected={selectedItems.size > 0}
              showAccount={showAccount}
              showCategory={showCategory}
              showBalance={showBalances}
              showCleared={showCleared}
              scrollWidth={scrollWidth}
              showSelection={showSelection}
              onSort={onSort}
              ascDesc={ascDesc}
              field={sortField}
              columnWidths={columnWidths}
              getResizeHandleProps={getResizeHandleProps}
              onResetAllColumnWidths={resetAllColumnWidths}
              onResetColumnWidth={resetColumnWidth}
            />
            <Table
              ref={tableRef}
              items={tableItems}
              navigator={tableNavigator}
              contentHeader={renderTemporaryTransactionSection}
              renderItem={renderRow}
              renderEmpty={renderEmpty}
              loadMore={loadMoreTransactions}
              saveScrollWidth={saveScrollWidth}
              rowHeight={ROW_HEIGHT}
              style={{
                backgroundColor: theme.tableBackground,
              }}
            />
          </View>
        </View>
      </View>
    );
  },
);

TransactionTable.displayName = 'TransactionTable';
