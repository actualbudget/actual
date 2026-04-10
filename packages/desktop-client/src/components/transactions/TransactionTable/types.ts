import type { CSSProperties } from 'react';

import type { IntegerAmount } from 'loot-core/shared/util';
import type {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  PayeeEntity,
  RuleEntity,
  ScheduleEntity,
  TransactionEntity,
} from 'loot-core/types/models';

import type { DropPosition } from '@desktop-client/hooks/useDragDrop';

export type TransactionTableState = {
  editingId: TransactionEntity['id'] | null;
  editingField: string | null;
  expandedSplitIds: Set<TransactionEntity['id']>;
  dragState: DragState | null;
};

export type DragState = {
  draggedId: TransactionEntity['id'];
  draggedDate: string;
  draggedParentId: TransactionEntity['parent_id'] | null;
};

export type TableAction =
  | { type: 'START_EDIT'; id: TransactionEntity['id']; field: string }
  | { type: 'END_EDIT' }
  | { type: 'TOGGLE_SPLIT'; id: TransactionEntity['id'] }
  | { type: 'EXPAND_SPLIT'; id: TransactionEntity['id'] }
  | { type: 'COLLAPSE_SPLIT'; id: TransactionEntity['id'] }
  | { type: 'START_DRAG'; id: TransactionEntity['id']; date: string; parentId: TransactionEntity['parent_id'] | null }
  | { type: 'END_DRAG' }
  | { type: 'RESET' };

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
  isFiltered?: boolean;
  dateFormat: string | undefined;
  hideFraction: boolean;
  renderEmpty: React.ReactNode | (() => React.ReactNode);
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

export type TransactionRowProps = {
  transaction: TransactionEntity;
  index: number;
  editing: boolean;
  selected: boolean;
  accounts: AccountEntity[];
  categoryGroups: CategoryGroupEntity[];
  payees: PayeeEntity[];
  showCleared: boolean;
  showAccount: boolean;
  showBalances: boolean;
  showCategory: boolean;
  balance: IntegerAmount | null;
  hideFraction: boolean;
  isNew: boolean;
  isMatched: boolean;
  isExpanded: boolean;
  dateFormat: string;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onSave: (transaction: TransactionEntity) => void;
  onDelete: (id: TransactionEntity['id']) => void;
  onToggleSplit: (id: TransactionEntity['id']) => void;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
  onNotesTagClick: (tag: string) => void;
  onApplyRules: (
    transaction: TransactionEntity,
    field: string | null,
  ) => Promise<TransactionEntity>;
  onCreatePayee: (name: string) => Promise<null | PayeeEntity['id']>;
  onManagePayees: (id?: PayeeEntity['id']) => void;
  allowSplitTransaction?: boolean;
  showSelection: boolean;
};

export type CellProps<T = unknown> = {
  id: TransactionEntity['id'];
  value: T;
  focused: boolean;
  exposed: boolean;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onUpdate: (field: string, value: T) => void;
  style?: CSSProperties;
};

export type SplitTransactionModalProps = {
  transaction: TransactionEntity;
  childTransactions: TransactionEntity[];
  accounts: AccountEntity[];
  categoryGroups: CategoryGroupEntity[];
  payees: PayeeEntity[];
  dateFormat: string;
  hideFraction: boolean;
  onSave: (
    parent: TransactionEntity,
    children: TransactionEntity[],
  ) => Promise<void>;
  onClose: () => void;
};
