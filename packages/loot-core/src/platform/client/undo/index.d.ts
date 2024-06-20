import { type ModalType } from '../../client/state-types/modals';

export type UndoState = {
  id?: string;
  url: unknown;
  openModal: ModalType;
  selectedItems: {
    name: string;
    items: Set<string>;
  } | null;
};

export function setUndoState<K extends keyof Omit<UndoState, 'id'>>(
  name: K,
  value: UndoState[K],
): void;
export type SetUndoState = typeof setUndoState;

export function getUndoState<K extends keyof UndoState>(name: K): UndoState[K];
export type GetUndoState = typeof getUndoState;

export function getTaggedState(id: string): UndoState | undefined;
export type GetTaggedState = typeof getTaggedState;

export function snapshot(): string;
export type Snapshot = typeof snapshot;

export function gc(id: string): void;
export type Gc = typeof gc;
