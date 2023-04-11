export type UndoState = {
  id?: string;
  url: unknown;
  openModal: unknown;
  selectedItems: unknown;
};

export function setUndoState(
  name: keyof Omit<UndoState, 'id'>,
  value: unknown,
): void;
export type SetUndoState = typeof setUndoState;

export function getUndoState(name: keyof UndoState): unknown;
export type GetUndoState = typeof getUndoState;

export function getTaggedState(id: string): UndoState | undefined;
export type GetTaggedState = typeof getTaggedState;

export function snapshot(): string;
export type Snapshot = typeof snapshot;

export function gc(id: string): void;
export type Gc = typeof gc;
