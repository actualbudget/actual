import type { TransactionEntity } from 'loot-core/types/models';

import type { TableAction, TransactionTableState } from './types';

export function createInitialState(): TransactionTableState {
  return {
    editingId: null,
    editingField: null,
    expandedSplitIds: new Set(),
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

    case 'TOGGLE_SPLIT': {
      const newExpandedIds = new Set(state.expandedSplitIds);
      if (newExpandedIds.has(action.id)) {
        newExpandedIds.delete(action.id);
      } else {
        newExpandedIds.add(action.id);
      }
      return {
        ...state,
        expandedSplitIds: newExpandedIds,
      };
    }

    case 'EXPAND_SPLIT': {
      const newExpandedIds = new Set(state.expandedSplitIds);
      newExpandedIds.add(action.id);
      return {
        ...state,
        expandedSplitIds: newExpandedIds,
      };
    }

    case 'COLLAPSE_SPLIT': {
      const newExpandedIds = new Set(state.expandedSplitIds);
      newExpandedIds.delete(action.id);
      return {
        ...state,
        expandedSplitIds: newExpandedIds,
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

export function isTransactionExpanded(
  state: TransactionTableState,
  id: TransactionEntity['id'],
): boolean {
  return state.expandedSplitIds.has(id);
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

export function getVisibleTransactions(
  transactions: readonly TransactionEntity[],
  state: TransactionTableState,
): TransactionEntity[] {
  return transactions.filter(t => {
    if (t.parent_id) {
      return state.expandedSplitIds.has(t.parent_id);
    }
    return true;
  });
}
