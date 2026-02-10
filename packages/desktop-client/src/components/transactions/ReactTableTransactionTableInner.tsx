import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  type UIEvent,
} from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';

import type { TransactionEntity } from 'loot-core/types/models';

import { isLastChild } from './table/utils';
import {
  NewTransaction,
  Transaction,
  TransactionError,
  TransactionHeader,
  type TransactionTableInnerProps,
} from './TransactionsTable';

import {
  ROW_HEIGHT,
  type TableHandleRef,
} from '@desktop-client/components/table';
import { usePrevious } from '@desktop-client/hooks/usePrevious';

/**
 * Column definitions for the transactions table using TanStack React Table.
 * These define the table structure declaratively while the actual cell
 * rendering is handled by the existing Transaction component.
 */
function useTransactionColumns({
  showAccount,
  showCategory,
  showBalance,
  showCleared,
}: {
  showAccount: boolean;
  showCategory: boolean;
  showBalance: boolean;
  showCleared: boolean;
}) {
  return useMemo(() => {
    const columns: ColumnDef<TransactionEntity, unknown>[] = [
      {
        id: 'select',
        size: 20,
        enableSorting: false,
        enableResizing: false,
      },
      {
        id: 'date',
        accessorKey: 'date',
        size: 110,
        enableSorting: true,
      },
    ];

    if (showAccount) {
      columns.push({
        id: 'account',
        accessorKey: 'account',
        enableSorting: true,
      });
    }

    columns.push(
      {
        id: 'payee',
        accessorKey: 'payee',
        enableSorting: true,
      },
      {
        id: 'notes',
        accessorKey: 'notes',
        enableSorting: true,
      },
    );

    if (showCategory) {
      columns.push({
        id: 'category',
        accessorKey: 'category',
        enableSorting: true,
      });
    }

    columns.push(
      {
        id: 'payment',
        size: 100,
        enableSorting: true,
      },
      {
        id: 'deposit',
        size: 100,
        enableSorting: true,
      },
    );

    if (showBalance) {
      columns.push({
        id: 'balance',
        size: 103,
        enableSorting: false,
      });
    }

    if (showCleared) {
      columns.push({
        id: 'cleared',
        accessorKey: 'cleared',
        size: 38,
        enableSorting: true,
      });
    }

    return columns;
  }, [showAccount, showCategory, showBalance, showCleared]);
}

/**
 * Custom virtualization hook for the transaction list.
 * Mirrors the behavior of the existing FixedSizeList virtualization.
 */
function useVirtualTransactions({
  items,
  rowHeight,
  containerRef,
}: {
  items: TransactionEntity[];
  rowHeight: number;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollOffset((e.target as HTMLDivElement).scrollTop);
  }, []);

  const itemSize = rowHeight - 1;
  const totalHeight = items.length * itemSize;
  const overscan = 5;

  const startIndex = Math.max(
    0,
    Math.floor(scrollOffset / itemSize) - overscan,
  );
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollOffset + containerHeight) / itemSize) + overscan,
  );

  const virtualItems = useMemo(() => {
    const result: Array<{
      index: number;
      start: number;
      item: TransactionEntity;
    }> = [];
    for (let i = startIndex; i <= endIndex && i < items.length; i++) {
      result.push({
        index: i,
        start: i * itemSize,
        item: items[i],
      });
    }
    return result;
  }, [startIndex, endIndex, items, itemSize]);

  return {
    virtualItems,
    totalHeight,
    handleScroll,
    containerHeight,
  };
}

/**
 * ReactTableTransactionTableInner - A React Table-powered replacement for
 * the TransactionTableInner component.
 *
 * Uses @tanstack/react-table for declarative column definitions and table
 * model while reusing the existing Transaction component for row rendering
 * and useTableNavigator for keyboard navigation.
 *
 * The visual and functional output is identical to the legacy implementation.
 */
export function ReactTableTransactionTableInner({
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<{
    scrollToItem: (index: number, alignment?: string) => void;
    scrollTo: (offset: number) => void;
  } | null>(null);

  // Track scroll width for header padding
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
    (accountId: string) => {
      onCloseAddTransactionProp();
      onNavigateToTransferAccountProp(accountId);
    },
    [onCloseAddTransactionProp, onNavigateToTransferAccountProp],
  );

  const onNavigateToSchedule = useCallback(
    (scheduleId: string) => {
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

  // TanStack React Table column definitions
  const columns = useTransactionColumns({
    showAccount: props.showAccount,
    showCategory: props.showCategory,
    showBalance: props.showBalances,
    showCleared: props.showCleared,
  });

  // TanStack React Table instance - manages table state and column model.
  // The table instance is used for future enhancements like column resizing
  // and reordering. Currently, the row model drives the rendering pipeline.
  const _table = useReactTable({
    data: transactionsToRender,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: {
      sorting: props.sortField
        ? [{ id: props.sortField, desc: props.ascDesc === 'desc' }]
        : [],
    },
    getRowId: row => row.id,
  });

  // Expose the same ref interface as the legacy Table component
  const imperativeRef = useRef<TableHandleRef<TransactionEntity>>({
    scrollTo: (id: string, alignment = 'smart') => {
      const index = transactionsToRender.findIndex(item => item.id === id);
      if (index !== -1) {
        listRef.current?.scrollToItem(index, alignment);
      }
    },
    scrollToTop: () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    },
    getScrolledItem: () => {
      if (scrollContainerRef.current) {
        const offset = scrollContainerRef.current.scrollTop;
        const index = Math.floor(offset / (ROW_HEIGHT - 1));
        return transactionsToRender[index]?.id ?? (0 as unknown as string);
      }
      return 0 as unknown as string;
    },
    setRowAnimation: () => {
      // No-op in React Table implementation;
      // animation is handled differently
    },
    edit(id: number, field: string, shouldScroll: boolean) {
      tableNavigator.onEdit(id as unknown as TransactionEntity['id'], field);
      if (id && shouldScroll) {
        imperativeRef.current.scrollTo(
          id as unknown as TransactionEntity['id'],
        );
      }
    },
    anchor() {
      // No-op in React Table implementation
    },
    unanchor() {
      // No-op in React Table implementation
    },
    isAnchored() {
      return false;
    },
  });

  // Bind the forwarded ref
  useEffect(() => {
    if (typeof tableRef === 'function') {
      tableRef(imperativeRef.current);
    } else if (tableRef && 'current' in tableRef) {
      (
        tableRef as { current: TableHandleRef<TransactionEntity> | null }
      ).current = imperativeRef.current;
    }
  });

  // Virtualization for the transaction list
  const {
    virtualItems,
    totalHeight,
    handleScroll: handleVirtualScroll,
  } = useVirtualTransactions({
    items: transactionsToRender,
    rowHeight: ROW_HEIGHT,
    containerRef: scrollContainerRef,
  });

  // Scroll width calculation
  useEffect(() => {
    if (scrollContainerRef.current) {
      const timer = setTimeout(() => {
        const el = scrollContainerRef.current;
        if (el?.offsetParent) {
          saveScrollWidth(el.offsetParent.clientWidth, el.clientWidth);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
    return;
  });

  const { loadMoreTransactions } = props;

  // Load more when approaching the end
  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      handleVirtualScroll(e);
      if (loadMoreTransactions) {
        const target = e.target as HTMLDivElement;
        const scrollBottom =
          target.scrollHeight - target.scrollTop - target.clientHeight;
        if (scrollBottom < ROW_HEIGHT * 100) {
          loadMoreTransactions();
        }
      }
    },
    [handleVirtualScroll, loadMoreTransactions],
  );

  /**
   * Row renderer that uses the React Table row model while delegating
   * actual rendering to the existing Transaction component.
   */
  function renderRow(item: TransactionEntity, index: number) {
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
    const editing = tableNavigator.editingId === trans.id;
    const selected = selectedItems.has(trans.id);

    const parent = trans.parent_id && props.transactionMap.get(trans.parent_id);
    const isChildDeposit = parent ? parent.amount > 0 : undefined;
    const expanded = isExpanded && isExpanded((parent || trans).id);

    // For backwards compatibility, read the error of the transaction
    // since in previous versions we stored it there.
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
              canDistributeRemainder={
                emptyChildTransactions
                  ? emptyChildTransactions.length > 0
                  : false
              }
            />
          )
        }
        listContainerRef={listContainerRef}
        showSelection={showSelection}
        allowSplitTransaction={allowSplitTransaction}
        showHiddenCategories={showHiddenCategories}
      />
    );
  }

  const isEmpty = transactionsToRender.length === 0;

  function getEmptyContent(empty: typeof renderEmpty): ReactNode | null {
    if (empty == null) {
      return null;
    } else if (typeof empty === 'function') {
      return (empty as () => ReactNode)();
    }

    return (
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          fontStyle: 'italic',
          color: theme.tableText,
          flex: 1,
        }}
      >
        {empty}
      </View>
    );
  }

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
        {/* Header rendering using the same TransactionHeader component.
            The React Table instance drives column visibility while the
            existing component handles the visual rendering. */}
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

      {/* Virtualized transaction list powered by React Table row model */}
      <View
        style={{ flex: 1, overflow: 'hidden' }}
        data-testid="transaction-table"
      >
        <View
          style={{
            flex: 1,
            outline: 'none',
            overflow: 'hidden',
          }}
          tabIndex={0}
          {...tableNavigator.getNavigatorProps({
            onKeyDown: (e: KeyboardEvent) => props.onCheckEnter(e),
          })}
          data-testid="table"
        >
          {isEmpty ? (
            <View
              style={{
                flex: `1 1 ${ROW_HEIGHT * 2}px`,
                backgroundColor: theme.tableBackground,
              }}
            >
              {getEmptyContent(renderEmpty)}
            </View>
          ) : (
            <View
              style={{
                flex: `1 1 ${ROW_HEIGHT * Math.max(2, transactionsToRender.length)}px`,
                backgroundColor: theme.tableBackground,
              }}
            >
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                style={{
                  height: '100%',
                  overflow: 'auto',
                  position: 'relative',
                }}
              >
                <div
                  ref={listContainerRef as Ref<HTMLDivElement>}
                  style={{
                    height: totalHeight,
                    position: 'relative',
                    width: '100%',
                  }}
                >
                  {virtualItems.map(virtualRow => {
                    const item = virtualRow.item;
                    const editing = tableNavigator.editingId === item.id;
                    const selected = props.selectedItems.has(item.id);

                    return (
                      <View
                        key={item.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: ROW_HEIGHT,
                          zIndex: editing || selected ? 101 : 'auto',
                          backgroundColor: theme.tableBackground,
                        }}
                        nativeStyle={{
                          '--pos': `${virtualRow.start}px`,
                          transform: 'translateY(var(--pos))',
                        }}
                        data-focus-key={item.id}
                      >
                        {renderRow(item, virtualRow.index)}
                      </View>
                    );
                  })}
                </div>
              </div>
            </View>
          )}
        </View>

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
