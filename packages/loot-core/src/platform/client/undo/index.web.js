import * as uuid from '../../uuid';

// List of recently used states. We don't use a true MRU structure
// because our needs are simple and we also do some custom reordering.
let HISTORY_SIZE = 40;
let UNDO_STATE_MRU = [];

let currentUndoState = {
  url: null,
  openModal: null,
  selectedItems: null,
};

export const setUndoState = function (name, value) {
  currentUndoState[name] = value;
  currentUndoState.id = uuid.v4Sync();
};

export const getUndoState = function (name) {
  return currentUndoState[name];
};

export const getTaggedState = function (id) {
  return UNDO_STATE_MRU.find(state => state.id === id);
};

export const snapshot = function () {
  let tagged = { ...currentUndoState, id: uuid.v4Sync() };
  UNDO_STATE_MRU.unshift(tagged);
  UNDO_STATE_MRU = UNDO_STATE_MRU.slice(0, HISTORY_SIZE);
  return tagged.id;
};

export const gc = function (id) {
  UNDO_STATE_MRU = UNDO_STATE_MRU.filter(state => state.id !== id);
};
