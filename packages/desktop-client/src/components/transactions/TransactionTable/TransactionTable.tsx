import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { ForwardedRef } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  createInitialState,
  tableReducer,
  getVisibleTransactions,
  getRowHeight,
  isRowExpanded,
  isTransactionEditing,
} from './TransactionTableState';
import { TransactionHeader } from './components/TransactionHeader';
import { TransactionRow } from './components/TransactionRow';
import type { TransactionTableProps } from './types';

import { Table } from '@desktop-client/components/table';
import type { TableHandleRef } from '@desktop-client/components/table';
import { useSelectedItems } from '@desktop-client/hooks/useSelected';
import { useSplitsExpanded } from '@desktop-client/hooks/useSplitsExpanded';
import type { TransactionEntity } from 'loot-core/types/models';

const ROW_HEIGHT = 32;

export const TransactionTable = forwardRef(
  (
    props: TransactionTableProps,
    ref: ForwardedRef<TableHandleRef<TransactionEntity>>,
  ) => {
    const {
      transactions,
      loadMoreTransactions,
      accounts,
      categoryGroups,
      payees,
      balances,
      showBalances,
      showReconciled,
      showCleared,
      showAccount,
      showCategory,
      currentAccountId,
      currentCategoryId,
      isAdding,
      isNew,
      isMatched,
      isFiltered,
      dateFormat = 'MM/dd/yyyy',
      hideFraction,
      renderEmpty,
      onSave,
      onApplyRules,
      onSplit,
      onAddSplit,
      onCloseAddTransaction,
      onAdd,
      onCreatePayee,
      style,
      onNavigateToTransferAccount,
      onNavigateToSchedule,
      onNotesTagClick,
      onSort,
      sortField,
      ascDesc,
      onReorder,
      onBatchDelete,
      onBatchDuplicate,
      onBatchLinkSchedule,
      onBatchUnlinkSchedule,
      onCreateRule,
      onScheduleAction,
      onMakeAsNonSplitTransactions,
      showSelection,
      allowSplitTransaction = true,
      onManagePayees,
    } = props;

    const [state, dispatch] = useReducer(tableReducer, createInitialState());
    const [scrollWidth, setScrollWidth] = useState(0);
    const tableRef = useRef<TableHandleRef<TransactionEntity>>(null);
    const selectedItems = useSelectedItems();
    const splitsExpanded = useSplitsExpanded();

    useImperativeHandle(ref, () => tableRef.current!);

    const visibleTransactions = useMemo(() => {
      return getVisibleTransactions(transactions, state);
    }, [transactions, state]);

    const handleEdit = useCallback(
      (id: TransactionEntity['id'], field: string) => {
        dispatch({ type: 'START_EDIT', id, field });
      },
      [],
    );

    const handleEndEdit = useCallback(() => {
      dispatch({ type: 'END_EDIT' });
    }, []);

    const handleToggleSplit = useCallback(
      (id: TransactionEntity['id']) => {
        dispatch({ type: 'TOGGLE_SPLIT', id });
      },
      [],
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

    const handleDelete = useCallback(
      (id: TransactionEntity['id']) => {
        onBatchDelete([id]);
      },
      [onBatchDelete],
    );

    // Note: Current Table component uses FixedSizeList, so all rows have same height
    // For variable heights, we'd need to implement VariableSizeList support
    // For now, expandable rows will have a fixed expanded height

    const renderRow = useCallback(
      ({ item, index }: { item: TransactionEntity; index: number }) => {
        const editing = isTransactionEditing(state, item.id);
        const selected = selectedItems.has(item.id);
        const balance = balances?.[item.id] ?? null;
        const rowHeight = getRowHeight(state, item.id, ROW_HEIGHT);
        const isExpanded = isRowExpanded(state, item.id);
        const isSplitExpanded = splitsExpanded.isExpanded(item.id);

        return (
          <TransactionRow
            transaction={item}
            index={index}
            editing={isTransactionEditing(state, item.id)}
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
            onEdit={handleEdit}
            onSave={onSave}
            onDelete={handleDelete}
            onToggleSplit={handleToggleSplit}
            onToggleRowExpansion={handleToggleRowExpansion}
            onSetRowHeight={handleSetRowHeight}
            onNavigateToTransferAccount={onNavigateToTransferAccount}
            onNavigateToSchedule={onNavigateToSchedule}
            onNotesTagClick={onNotesTagClick}
            onApplyRules={onApplyRules}
            onCreatePayee={onCreatePayee}
            onManagePayees={onManagePayees}
            allowSplitTransaction={allowSplitTransaction}
            showSelection={showSelection}
          />
        );
      },
      [
        selectedItems,
        balances,
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
        handleEdit,
        onSave,
        handleDelete,
        handleToggleSplit,
        handleToggleRowExpansion,
        handleSetRowHeight,
        onNavigateToTransferAccount,
        onNavigateToSchedule,
        onNotesTagClick,
        onApplyRules,
        onCreatePayee,
        onManagePayees,
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
        />
        <Table
          ref={tableRef}
          items={visibleTransactions}
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
    );
  },
);

TransactionTable.displayName = 'TransactionTable';
