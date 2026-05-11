import type { CSSProperties, ReactNode } from 'react';

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

import type { DropPosition } from '#hooks/useDragDrop';

export type TransactionColumnId =
  | 'date'
  | 'account'
  | 'payee'
  | 'notes'
  | 'category'
  | 'payment'
  | 'deposit'
  | 'balance';

export type TransactionColumnWidths = Record<
  TransactionColumnId,
  number | 'flex'
>;

export type VisibleTransactionColumn = {
  id: TransactionColumnId;
  defaultWidth: number | 'flex';
  minWidth: number;
};

export type TransactionTableVariantKey = string;

export type TransactionTableState = {
  editingId: TransactionEntity['id'] | null;
  editingField: string | null;
  expandedRowIds: Set<TransactionEntity['id']>;
  rowHeights: Map<TransactionEntity['id'], number>;
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
  | { type: 'TOGGLE_ROW_EXPANSION'; id: TransactionEntity['id'] }
  | { type: 'EXPAND_ROW'; id: TransactionEntity['id'] }
  | { type: 'COLLAPSE_ROW'; id: TransactionEntity['id'] }
  | { type: 'SET_ROW_HEIGHT'; id: TransactionEntity['id']; height: number }
  | {
      type: 'START_DRAG';
      id: TransactionEntity['id'];
      date: string;
      parentId: TransactionEntity['parent_id'] | null;
    }
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

export type TransactionRowProps = {
  transaction: TransactionEntity;
  focusedField?: string | null;
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
  isSplitExpanded: boolean;
  rowHeight?: number;
  dateFormat: string;
  columnWidths: TransactionColumnWidths;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onSave: (transaction: TransactionEntity) => void;
  onToggleSplit: (id: TransactionEntity['id']) => void;
  onToggleRowExpansion: (id: TransactionEntity['id']) => void;
  onSetRowHeight: (id: TransactionEntity['id'], height: number) => void;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
  onApplyRules: (
    transaction: TransactionEntity,
    field: string | null,
  ) => Promise<TransactionEntity>;
  onManagePayees: (id?: PayeeEntity['id']) => void;
  onSplit: (id: TransactionEntity['id']) => TransactionEntity['id'];
  allowSplitTransaction?: boolean;
  showSelection: boolean;
};

export type TransactionRowContentProps = {
  transaction: TransactionEntity;
  focusedField?: string | null;
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
  dateFormat: string;
  isPreview: boolean;
  isSplitExpanded: boolean;
  account: AccountEntity | null | undefined;
  payee: PayeeEntity | null | undefined;
  category: CategoryEntity | null | undefined;
  transferAccount: AccountEntity | null | undefined;
  schedule: ScheduleEntity | null | undefined;
  notesValue?: string;
  previewStatus?: string | null;
  columnWidths: TransactionColumnWidths;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onUpdate: (field: string, value: unknown) => Promise<void>;
  onSelect: () => void;
  onToggleSplit: (id: TransactionEntity['id']) => void;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
  onManagePayees: (id?: PayeeEntity['id']) => void;
  onSplit: (id: TransactionEntity['id']) => TransactionEntity['id'];
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
  categoryGroups: CategoryGroupEntity[];
  onSave: (
    parent: TransactionEntity,
    children: TransactionEntity[],
  ) => Promise<void>;
  onClose: () => void;
};
