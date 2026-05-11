import type { TransactionEntity } from '@actual-app/core/types/models';

import type { TableAction, TransactionTableState } from './types';

export function createInitialState(): TransactionTableState {
  return {
    editingId: null,
    editingField: null,
    expandedRowIds: new Set(),
    rowHeights: new Map(),
    dragState: null,
  };
}

export function tableReducer(
  state: TransactionTableState,
  action: TableAction,
): TransactionTableState {
  switch (action.type) {
    case 'START_EDIT':
      return {
        ...state,
        editingId: action.id,
        editingField: action.field,
      };

    case 'END_EDIT':
      return {
        ...state,
        editingId: null,
        editingField: null,
      };

    case 'TOGGLE_ROW_EXPANSION': {
      const newExpandedRowIds = new Set(state.expandedRowIds);
      if (newExpandedRowIds.has(action.id)) {
        newExpandedRowIds.delete(action.id);
      } else {
        newExpandedRowIds.add(action.id);
      }
      return {
        ...state,
        expandedRowIds: newExpandedRowIds,
      };
    }

    case 'EXPAND_ROW': {
      const newExpandedRowIds = new Set(state.expandedRowIds);
      newExpandedRowIds.add(action.id);
      return {
        ...state,
        expandedRowIds: newExpandedRowIds,
      };
    }

    case 'COLLAPSE_ROW': {
      const newExpandedRowIds = new Set(state.expandedRowIds);
      newExpandedRowIds.delete(action.id);
      return {
        ...state,
        expandedRowIds: newExpandedRowIds,
      };
    }

    case 'SET_ROW_HEIGHT': {
      const newRowHeights = new Map(state.rowHeights);
      newRowHeights.set(action.id, action.height);
      return {
        ...state,
        rowHeights: newRowHeights,
      };
    }

    case 'START_DRAG':
      return {
        ...state,
        dragState: {
          draggedId: action.id,
          draggedDate: action.date,
          draggedParentId: action.parentId,
        },
      };

    case 'END_DRAG':
      return {
        ...state,
        dragState: null,
      };

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}

export function isTransactionEditing(
  state: TransactionTableState,
  id: TransactionEntity['id'],
  field?: string,
): boolean {
  if (field) {
    return state.editingId === id && state.editingField === field;
  }
  return state.editingId === id;
}

export function isRowExpanded(
  state: TransactionTableState,
  id: TransactionEntity['id'],
): boolean {
  return state.expandedRowIds.has(id);
}

export function getRowHeight(
  state: TransactionTableState,
  id: TransactionEntity['id'],
  defaultHeight: number = 32,
): number {
  if (!state.expandedRowIds.has(id)) {
    return defaultHeight;
  }
  return state.rowHeights.get(id) || defaultHeight;
}

export function getVisibleTransactions(
  transactions: readonly TransactionEntity[],
  isSplitExpanded: (id: string) => boolean,
): TransactionEntity[] {
  return transactions.filter(t => {
    if (t.parent_id) {
      return isSplitExpanded(t.parent_id);
    }
    return true;
  });
}
