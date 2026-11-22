import { useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';

type EditSessionState = 'active' | 'committed' | 'canceled';

export type UseCellEditorOptions<T> = {
  committedValue: T;
  isEditing?: boolean;
  // isEdited tells whether the user changed the value in this session, so
  // callers can keep a value whose edit text is rounded (hidden decimals).
  onUpdate?: (value: T, isEdited: boolean) => void;
  onExit?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  onBlur?: (e: FocusEvent) => void;
};

export function useCellEditor<T>({
  committedValue,
  isEditing = true,
  onUpdate,
  onExit,
  onKeyDown: userOnKeyDown,
  onBlur: userOnBlur,
}: UseCellEditorOptions<T>) {
  const [value, setValue] = useState<T>(committedValue);
  const [prevCommittedValue, setPrevCommittedValue] =
    useState<T>(committedValue);
  const [wasEditing, setWasEditing] = useState(isEditing);
  const sessionState = useRef<EditSessionState>('active');
  const valueRef = useRef<T>(committedValue);
  valueRef.current = value;
  const isEdited = useRef(false);

  const isStartingEdit = isEditing && !wasEditing;
  if (wasEditing !== isEditing) {
    setWasEditing(isEditing);
  }
  if (prevCommittedValue !== committedValue || isStartingEdit) {
    setValue(committedValue);
    setPrevCommittedValue(committedValue);
    valueRef.current = committedValue;
    isEdited.current = false;
  }
  // Cells stay mounted between edits. Only entering edit mode starts a
  // fresh session; receiving a saved value must not enable another blur save.
  if (isStartingEdit) {
    sessionState.current = 'active';
  }

  function setDraft(next: T | ((prev: T) => T)) {
    sessionState.current = 'active';
    isEdited.current = true;
    setValue(prev => {
      const resolved =
        typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
      valueRef.current = resolved;
      return resolved;
    });
  }

  // Only an active draft is reverted. After a commit that stays in the cell
  // (picking with the mouse, Enter in the date picker) Escape must still
  // leave the cell, keeping the committed value.
  function cancelEdit() {
    if (sessionState.current === 'active') {
      sessionState.current = 'canceled';
      setValue(committedValue);
      valueRef.current = committedValue;
      isEdited.current = false;
    }
    onExit?.();
  }

  function commitEdit(newValue?: T) {
    if (sessionState.current !== 'active') {
      return;
    }
    sessionState.current = 'committed';
    const val = newValue !== undefined ? newValue : valueRef.current;
    setValue(val);
    valueRef.current = val;
    onUpdate?.(val, isEdited.current);
  }

  function onKeyDown(e: KeyboardEvent) {
    userOnKeyDown?.(e);
    if (e.defaultPrevented || e.isPropagationStopped()) {
      return;
    }

    if (e.key === 'Escape') {
      cancelEdit();
      if (onExit) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }

  function onBlur(e: FocusEvent) {
    if (sessionState.current === 'canceled') {
      return;
    }
    if (sessionState.current === 'active') {
      sessionState.current = 'committed';
      onUpdate?.(valueRef.current, isEdited.current);
    }
    userOnBlur?.(e);
  }

  return {
    value,
    setValue: setDraft,
    onKeyDown,
    onBlur,
    cancelEdit,
    commitEdit,
    sessionState,
  };
}

// Lets a cell's editor (e.g. DateSelect) drive the cell's edit session
export type CellEditSession<T> = {
  onUpdateDraft?: (value: T) => void;
  onCommit: (value: T) => void;
  onCancel: () => void;
};
