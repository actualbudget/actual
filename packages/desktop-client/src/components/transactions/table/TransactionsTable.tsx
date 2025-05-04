import React, {
  forwardRef,
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  type ForwardedRef,
  type ReactNode,
  type RefObject,
  createRef,
  type ComponentProps,
  type KeyboardEvent,
} from 'react';

import { type CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { addNotification } from 'loot-core/client/notifications/notificationsSlice';
import {
  getAccountsById,
  getPayeesById,
} from 'loot-core/client/queries/queriesSlice';
import {
  splitTransaction,
  updateTransaction,
  deleteTransaction,
  addSplitTransaction,
  groupTransaction,
  ungroupTransactions,
  isTemporaryId,
  isPreviewId,
} from 'loot-core/shared/transactions';
import {
  type AccountEntity,
  type CategoryEntity,
  type CategoryGroupEntity,
  type PayeeEntity,
  type RuleEntity,
  type ScheduleEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useMergedRefs } from '../../../hooks/useMergedRefs';
import { usePrevious } from '../../../hooks/usePrevious';
import { useSelectedItems } from '../../../hooks/useSelected';
import {
  type SplitsExpandedContextValue,
  useSplitsExpanded,
} from '../../../hooks/useSplitsExpanded';
import { useDispatch } from '../../../redux';
import { Table, type TableNavigator, useTableNavigator } from '../../table';

import { NewTransaction } from './transaction/NewTransaction';
import { Transaction } from './transaction/Transaction';
import { TransactionError } from './transaction/TransactionError';
import { TransactionHeader } from './TransactionHeader';
import { isLastChild, makeTemporaryTransactions } from './utils';

export type TransactionTableProps = {
  transactions: readonly TransactionEntity[];
  loadMoreTransactions: () => void;
  accounts: AccountEntity[];
  categoryGroups: CategoryGroupEntity[];
  payees: PayeeEntity[];
  balances: Record<TransactionEntity['id'], { balance: number }> | null;
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
  dateFormat?: string;
  hideFraction?: boolean;
  renderEmpty?: ReactNode | (() => ReactNode);
  onSave: (transaction: TransactionEntity) => void;
  onApplyRules: (
    transaction: TransactionEntity,
    field: keyof TransactionEntity,
  ) => Promise<TransactionEntity>;
  onSplit: (id: TransactionEntity['id']) => TransactionEntity['id'];
  onAddSplit: (id: TransactionEntity['id']) => TransactionEntity['id'];
  onCloseAddTransaction: () => void;
  onAdd: (transactions: TransactionEntity[]) => void;
  //onManagePayees={onManagePayees}
  onCreatePayee: (name: string) => void;
  style?: CSSProperties;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
  onNotesTagClick: (tag: string) => void;
  onSort: (field: string, ascDesc: 'asc' | 'desc') => void;
  sortField?: string;
  ascDesc?: 'asc' | 'desc';
  onBatchDelete: (ids: TransactionEntity['id'][]) => void;
  onBatchDuplicate: (ids: TransactionEntity['id'][]) => void;
  onBatchLinkSchedule: (ids: TransactionEntity['id'][]) => void;
  onBatchUnlinkSchedule: (ids: TransactionEntity['id'][]) => void;
  onCreateRule: (ids: RuleEntity['id'][]) => void;
  onScheduleAction: (
    name: 'skip' | 'post-transaction' | 'complete',
    ids: TransactionEntity['id'][],
  ) => void;
  onMakeAsNonSplitTransactions: (ids: string[]) => void;
  showSelection: boolean;
  allowSplitTransaction?: boolean;
  onManagePayees: (id?: PayeeEntity['id']) => void;
};

type TableState = {
  newTransactions: TransactionEntity[];
  newNavigator: TableNavigator<TransactionEntity>;
  tableNavigator: TableNavigator<TransactionEntity>;
  transactions: readonly TransactionEntity[];
};

export const TransactionTable = forwardRef(
  (props: TransactionTableProps, ref: ForwardedRef<unknown>) => {
    const dispatch = useDispatch();
    // TODO: fix this
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [newTransactions, setNewTransactions] = useState<any[]>([]);
    const [prevIsAdding, setPrevIsAdding] = useState(false);
    const splitsExpanded = useSplitsExpanded();
    const splitsExpandedDispatch = splitsExpanded.dispatch;
    const prevSplitsExpanded = useRef<SplitsExpandedContextValue | null>(null);

    // TODO: set table ref type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableRef = useRef<any>(null);
    const listContainerRef = useRef<HTMLDivElement>(null);
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
          tableRef.current.anchor();
          tableRef.current.setRowAnimation(false);
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
        {} as {
          [parentId: string]: TransactionEntity[];
        },
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
      if (tableRef.current.isAnchored()) {
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
    const latestState = useRef<TableState>({
      newTransactions: newTransactions ?? [],
      newNavigator,
      tableNavigator,
      transactions: [],
    });
    const savePending = useRef<boolean>(false);
    const afterSaveFunc = useRef<(() => void) | null>(null);
    const [_, forceRerender] = useState({});
    const selectedItems = useSelectedItems();

    latestState.current = {
      newTransactions,
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

    if (shouldAdd.current) {
      if (newTransactions?.[0] && newTransactions[0].account === null) {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: 'Account is a required field',
            },
          }),
        );
        newNavigator.onEdit('temp', 'account');
      } else {
        const transactions = latestState.current.newTransactions;
        const lastDate =
          transactions && transactions.length > 0 ? transactions[0].date : null;
        setNewTransactions(
          makeTemporaryTransactions(
            props.currentAccountId,
            props.currentCategoryId,
            lastDate,
          ),
        );
        newNavigator.onEdit('temp', 'date');
        props.onAdd(transactions ?? []);
      }
      shouldAdd.current = false;
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

      if (item && isPreviewId(item.id)) {
        fields = ['select'];
      }
      if (item && isTemporaryId(item.id)) {
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
        if (e.metaKey) {
          e.stopPropagation();
          onAddTemporary();
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

    const {
      onSave: onSaveProp,
      onApplyRules: onApplyRulesProp,
      onBatchDelete,
      onBatchDuplicate,
      onBatchLinkSchedule,
      onBatchUnlinkSchedule,
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
          if (onApplyRulesProp && updatedFieldName) {
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

    const onDelete = useCallback(
      (id: TransactionEntity['id']) => {
        const temporary = isTemporaryId(id);

        if (temporary) {
          const newTrans = latestState.current.newTransactions;

          if (id === newTrans[0].id) {
            // You can never delete the parent new transaction
            return;
          }

          setNewTransactions(deleteTransaction(newTrans, id).data);
        } else {
          onBatchDelete([id]);
        }
      },
      [onBatchDelete],
    );

    const onDuplicate = useCallback(
      (id: TransactionEntity['id']) => {
        onBatchDuplicate([id]);
      },
      [onBatchDuplicate],
    );

    const onLinkSchedule = useCallback(
      (id: TransactionEntity['id']) => {
        onBatchLinkSchedule([id]);
      },
      [onBatchLinkSchedule],
    );
    const onUnlinkSchedule = useCallback(
      (id: TransactionEntity['id']) => {
        onBatchUnlinkSchedule([id]);
      },
      [onBatchUnlinkSchedule],
    );
    const onCreateRule = useCallback(
      (id: TransactionEntity['id']) => {
        onCreateRuleProp([id]);
      },
      [onCreateRuleProp],
    );
    const onScheduleAction = useCallback(
      (
        action: 'skip' | 'post-transaction' | 'complete',
        id: TransactionEntity['id'],
      ) => {
        onScheduleActionProp(action, [id]);
      },
      [onScheduleActionProp],
    );
    const onMakeAsNonSplitTransactions = useCallback(
      (id: TransactionEntity['id']) => {
        onMakeAsNonSplitTransactionsProp([id]);
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
          if (!trans) {
            return;
          }
          const newId = onSplitProp(id);

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
        if (!transaction) {
          return;
        }

        const parentTransaction = transaction.is_parent
          ? transaction
          : targetTransactions.find(t => t.id === transaction.parent_id);

        const siblingTransactions = targetTransactions.filter(
          t =>
            t.parent_id ===
            (transaction.is_parent ? transaction.id : transaction.parent_id),
        );

        const emptyTransactions = siblingTransactions.filter(
          t => t.amount === 0,
        );

        const remainingAmount =
          (parentTransaction?.amount ?? 0) -
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
          // @ts-ignore null for some reason? Won't touch while copying stuff over
          newNavigator.onEdit(null);
        } else {
          // @ts-ignore null for some reason? Won't touch while copying stuff over
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

    return (
      <TransactionTableInner
        // @ts-ignore TODO: refs are hard
        tableRef={mergedRef}
        // @ts-ignore TODO: refs are hard
        listContainerRef={listContainerRef}
        {...props}
        onSort={props.onSort}
        transactions={transactionsWithExpandedSplits}
        transactionMap={transactionMap}
        transactionsByParent={transactionsByParent}
        transferAccountsByTransaction={transferAccountsByTransaction}
        selectedItems={selectedItems}
        isExpanded={splitsExpanded.isExpanded}
        onSave={onSave}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onLinkSchedule={onLinkSchedule}
        onUnlinkSchedule={onUnlinkSchedule}
        onCreateRule={onCreateRule}
        onScheduleAction={onScheduleAction}
        onMakeAsNonSplitTransactions={onMakeAsNonSplitTransactions}
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
        showSelection={props.showSelection}
        allowSplitTransaction={props.allowSplitTransaction}
        onManagePayees={props.onManagePayees}
      />
    );
  },
);

TransactionTable.displayName = 'TransactionTable';

type TransactionTableInnerProps = {
  // TODO: remove any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tableRef: RefObject<any>;
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
  balances: {
    [id: TransactionEntity['id']]: {
      id: TransactionEntity['id'];
      balance: number;
    };
  };
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
  dateFormat: string;
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
  onCreatePayee: (name: string) => Promise<string>;
  style?: CSSProperties;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
  onNotesTagClick: (tag: string) => void;
  //onSort={onSort}
  sortField: string;
  ascDesc: 'asc' | 'desc';
  onCreateRule: (id: RuleEntity['id']) => void;
  onScheduleAction: (
    name: 'skip' | 'post-transaction' | 'complete',
    id: TransactionEntity['id'],
  ) => void;
  onMakeAsNonSplitTransactions: (id: string) => void;
  showSelection: boolean;
  allowSplitTransaction?: boolean;

  onDelete: (id: TransactionEntity['id']) => void;
  onDuplicate: (id: TransactionEntity['id']) => void;
  onLinkSchedule: (id: TransactionEntity['id']) => void;
  onUnlinkSchedule: (id: TransactionEntity['id']) => void;
  onCheckNewEnter: (e: KeyboardEvent) => void;
  onCheckEnter: (e: KeyboardEvent) => void;
  onAddTemporary: (id?: TransactionEntity['id']) => void;
  onDistributeRemainder: (id: TransactionEntity['id']) => void;
  onToggleSplit: (id: TransactionEntity['id']) => void;
  onManagePayees: (id?: PayeeEntity['id']) => void;

  onSort: (field: string, ascDesc: 'asc' | 'desc') => void;
};

function TransactionTableInner({
  tableNavigator,
  tableRef,
  listContainerRef,
  dateFormat = 'MM/dd/yyyy',
  newNavigator,
  renderEmpty,
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

  const renderRow: ComponentProps<
    typeof Table<TransactionEntity>
  >['renderItem'] = ({ item, index, editing }) => {
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
    const isChildDeposit = parent && parent.amount > 0;
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
      (trans.is_parent ? trans.id : trans.parent_id) as string
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
        showZeroInDeposit={isChildDeposit || false}
        balance={balances?.[trans.id]?.balance}
        focusedField={editing ? tableNavigator.focusedField : undefined}
        accounts={accounts}
        categoryGroups={categoryGroups}
        payees={payees}
        dateFormat={dateFormat}
        hideFraction={hideFraction}
        onEdit={tableNavigator.onEdit}
        onSave={props.onSave}
        onDelete={props.onDelete}
        onDuplicate={props.onDuplicate}
        onLinkSchedule={props.onLinkSchedule}
        onUnlinkSchedule={props.onUnlinkSchedule}
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
          hasSplitError ? (
            <TransactionError
              error={error}
              isDeposit={!!isChildDeposit}
              onAddSplit={() => props.onAddSplit(trans.id)}
              onDistributeRemainder={() =>
                props.onDistributeRemainder(trans.id)
              }
              canDistributeRemainder={emptyChildTransactions.length > 0}
            />
          ) : undefined
        }
        listContainerRef={listContainerRef}
        showSelection={showSelection}
        allowSplitTransaction={allowSplitTransaction}
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
                  ? (props.balances?.[props.transactions[0]?.id]?.balance ?? 0)
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
          items={transactionsToRender}
          renderItem={renderRow}
          renderEmpty={renderEmpty}
          loadMore={props.loadMoreTransactions}
          isSelected={id => props.selectedItems.has(id)}
          onKeyDown={(e: KeyboardEvent<Element>) => props.onCheckEnter(e)}
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
