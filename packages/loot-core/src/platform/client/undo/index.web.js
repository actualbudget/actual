const uuid = require('../../uuid');

// List of recently used states. We don't use a true MRU structure
// because our needs are simple and we also do some custom reordering.
let HISTORY_SIZE = 40;
let UNDO_STATE_MRU = [];

let currentUndoState = {
  url: null,
  openModal: null,
  selectedItems: null
};

function setUndoState(name, value) {
  currentUndoState[name] = value;
  currentUndoState.id = uuid.v4Sync();
}

function getUndoState(name) {
  return currentUndoState[name];
}

function getTaggedState(id) {
  return UNDO_STATE_MRU.find(state => state.id === id);
}

function snapshot() {
  let tagged = { ...currentUndoState, id: uuid.v4Sync() };
  UNDO_STATE_MRU.unshift(tagged);
  UNDO_STATE_MRU = UNDO_STATE_MRU.slice(0, HISTORY_SIZE);
  return tagged.id;
}

function gc(id) {
  UNDO_STATE_MRU = UNDO_STATE_MRU.filter(state => state.id !== id);
}

module.exports = { setUndoState, getUndoState, getTaggedState, snapshot, gc };
