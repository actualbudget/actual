import type { KeyboardEvent } from 'react';

import type { TransactionEntity } from 'loot-core/types/models';

type NavigationContext = {
  currentId: TransactionEntity['id'] | null;
  currentField: string | null;
  transactions: readonly TransactionEntity[];
  isEditing: boolean;
  visibleTransactions: readonly TransactionEntity[];
};

type NavigationActions = {
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onEndEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
};

const FIELD_ORDER = [
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

export function getFieldIndex(field: string): number {
  const index = FIELD_ORDER.indexOf(field);
  return index === -1 ? 0 : index;
}

export function getNextField(currentField: string, showAccount: boolean): string {
  const currentIndex = getFieldIndex(currentField);
  let nextIndex = currentIndex + 1;

  if (!showAccount && FIELD_ORDER[nextIndex] === 'account') {
    nextIndex++;
  }

  if (nextIndex >= FIELD_ORDER.length) {
    return FIELD_ORDER[showAccount ? 1 : 2]; // Skip select, optionally skip account
  }

  return FIELD_ORDER[nextIndex];
}

export function getPreviousField(currentField: string, showAccount: boolean): string {
  const currentIndex = getFieldIndex(currentField);
  let prevIndex = currentIndex - 1;

  if (!showAccount && FIELD_ORDER[prevIndex] === 'account') {
    prevIndex--;
  }

  if (prevIndex < (showAccount ? 1 : 2)) {
    return FIELD_ORDER[FIELD_ORDER.length - 1]; // Go to last field
  }

  return FIELD_ORDER[prevIndex];
}

export function getNextTransaction(
  currentId: TransactionEntity['id'] | null,
  visibleTransactions: readonly TransactionEntity[],
): TransactionEntity | null {
  if (!currentId) {
    return visibleTransactions[0] || null;
  }

  const currentIndex = visibleTransactions.findIndex(t => t.id === currentId);
  if (currentIndex === -1 || currentIndex === visibleTransactions.length - 1) {
    return null;
  }

  return visibleTransactions[currentIndex + 1];
}

export function getPreviousTransaction(
  currentId: TransactionEntity['id'] | null,
  visibleTransactions: readonly TransactionEntity[],
): TransactionEntity | null {
  if (!currentId) {
    return null;
  }

  const currentIndex = visibleTransactions.findIndex(t => t.id === currentId);
  if (currentIndex <= 0) {
    return null;
  }

  return visibleTransactions[currentIndex - 1];
}

export function handleKeyboardNavigation(
  event: KeyboardEvent,
  context: NavigationContext,
  actions: NavigationActions,
  options: { showAccount: boolean },
): boolean {
  const { currentId, currentField, isEditing } = context;

  if (!currentId || !currentField) {
    return false;
  }

  switch (event.key) {
    case 'Enter':
      if (isEditing) {
        actions.onSave();
      } else {
        actions.onEdit(currentId, currentField);
      }
      event.preventDefault();
      return true;

    case 'Escape':
      if (isEditing) {
        actions.onCancel();
        event.preventDefault();
        return true;
      }
      return false;

    case 'Tab': {
      const nextField = event.shiftKey
        ? getPreviousField(currentField, options.showAccount)
        : getNextField(currentField, options.showAccount);

      if (isEditing) {
        actions.onSave();
      }

      actions.onEdit(currentId, nextField);
      event.preventDefault();
      return true;
    }

    case 'ArrowUp': {
      if (isEditing && (currentField === 'notes' || currentField === 'category')) {
        return false;
      }

      const prevTransaction = getPreviousTransaction(
        currentId,
        context.visibleTransactions,
      );

      if (prevTransaction) {
        if (isEditing) {
          actions.onSave();
        }
        actions.onEdit(prevTransaction.id, currentField);
      }

      event.preventDefault();
      return true;
    }

    case 'ArrowDown': {
      if (isEditing && (currentField === 'notes' || currentField === 'category')) {
        return false;
      }

      const nextTransaction = getNextTransaction(
        currentId,
        context.visibleTransactions,
      );

      if (nextTransaction) {
        if (isEditing) {
          actions.onSave();
        }
        actions.onEdit(nextTransaction.id, currentField);
      }

      event.preventDefault();
      return true;
    }

    case 'ArrowLeft': {
      if (isEditing) {
        return false;
      }

      const prevField = getPreviousField(currentField, options.showAccount);
      actions.onEdit(currentId, prevField);
      event.preventDefault();
      return true;
    }

    case 'ArrowRight': {
      if (isEditing) {
        return false;
      }

      const nextField = getNextField(currentField, options.showAccount);
      actions.onEdit(currentId, nextField);
      event.preventDefault();
      return true;
    }

    default:
      return false;
  }
}
