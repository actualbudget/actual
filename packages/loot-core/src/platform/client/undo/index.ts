import { v4 as uuidv4 } from 'uuid';

import type { UndoState as ServerUndoState } from '#server/undo';

// Minimal structural shape of desktop-client's Modal union. loot-core can't
// import the full type from @actual-app/web; the undo system only stores the
// modal and reads `name`. `options` is kept loose so the real Modal assigns.
type Modal = { name: string; options?: unknown };

type UndoState = {
  url: string | null;
  openModal: Modal | null;
  selectedItems: {
    name: string;
    items: Set<string>;
  } | null;
  undoEvent: ServerUndoState | null;
};

type UndoStateWithId = UndoState & {
  id?: string;
};

// List of recently used states. We don't use a true MRU structure
// because our needs are simple and we also do some custom reordering.
const HISTORY_SIZE = 40;
let UNDO_STATE_MRU: UndoStateWithId[] = [];

const currentUndoState: UndoStateWithId = {
  url: null,
  openModal: null,
  selectedItems: null,
  undoEvent: null,
};

export const setUndoState = <K extends keyof Omit<UndoState, 'id'>>(
  name: K,
  value: UndoState[K],
) => {
  currentUndoState[name] = value;
  currentUndoState.id = uuidv4();
};

export const getUndoState = <K extends keyof UndoState>(name: K) => {
  return currentUndoState[name];
};

export const getTaggedState = (id: string) => {
  return UNDO_STATE_MRU.find(state => state.id === id);
};

export const snapshot = () => {
  const tagged = { ...currentUndoState, id: uuidv4() };
  UNDO_STATE_MRU.unshift(tagged);
  UNDO_STATE_MRU = UNDO_STATE_MRU.slice(0, HISTORY_SIZE);
  return tagged.id;
};

export const gc = (id: string) => {
  UNDO_STATE_MRU = UNDO_STATE_MRU.filter(state => state.id !== id);
};
