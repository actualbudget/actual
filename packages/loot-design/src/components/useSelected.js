import React, {
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef
} from 'react';
import { useSelector } from 'react-redux';

import { listen } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';

import { hasModifierKey } from '../util/keys';

function iterateRange(range, func) {
  let from = Math.min(range.start, range.end);
  let to = Math.max(range.start, range.end);

  for (let i = from; i <= to; i++) {
    func(i);
  }
}

export default function useSelected(name, items, initialSelectedIds) {
  let [state, dispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'select': {
          let { selectedRange } = state;
          let selectedItems = new Set(state.selectedItems);
          let { id } = action;

          if (hasModifierKey('shift') && selectedRange) {
            let idx = items.findIndex(p => p.id === id);
            let startIdx = items.findIndex(p => p.id === selectedRange.start);
            let endIdx = items.findIndex(p => p.id === selectedRange.end);
            let range;
            let deleteUntil;

            if (endIdx === -1) {
              range = { start: startIdx, end: idx };
            } else if (endIdx < startIdx) {
              if (idx <= startIdx) {
                range = { start: startIdx, end: idx };

                if (idx > endIdx) {
                  deleteUntil = { start: idx - 1, end: endIdx };
                }
              } else {
                // Switching directions
                range = { start: endIdx, end: idx };
              }
            } else {
              if (idx >= startIdx) {
                range = { start: startIdx, end: idx };

                if (idx < endIdx) {
                  deleteUntil = { start: idx + 1, end: endIdx };
                }
              } else {
                // Switching directions
                range = { start: endIdx, end: idx };
              }
            }

            iterateRange(range, i => selectedItems.add(items[i].id));

            if (deleteUntil) {
              iterateRange(deleteUntil, i => selectedItems.delete(items[i].id));
            }

            return {
              ...state,
              selectedItems,
              selectedRange: {
                start: items[range.start].id,
                end: items[range.end].id
              }
            };
          } else {
            let range = null;
            if (!selectedItems.delete(id)) {
              selectedItems.add(id);
              range = { start: id, end: null };
            }

            return {
              ...state,
              selectedItems,
              selectedRange: range
            };
          }
        }

        case 'select-none':
          return { ...state, selectedItems: new Set() };

        case 'select-all':
          return {
            ...state,
            selectedItems: new Set(action.ids || items.map(item => item.id)),
            selectedRange:
              action.ids && action.ids.length === 1
                ? { start: action.ids[0], end: null }
                : null
          };

        default:
          throw new Error('Unexpected action: ' + action.type);
      }
    },
    null,
    () => ({
      selectedItems: new Set(initialSelectedIds || []),
      selectedRange:
        initialSelectedIds && initialSelectedIds.length === 1
          ? { start: initialSelectedIds[0], end: null }
          : null
    })
  );

  let prevItems = useRef(items);
  useEffect(() => {
    if (state.selectedItems.size > 0) {
      // We need to make sure there are no ids in the selection that
      // aren't valid anymore. This happens if the item has been
      // deleted or otherwise removed from the current view. We do
      // this by cross-referencing the current selection with the
      // available item ids
      //
      // This effect may run multiple times while items is updated, we
      // need to make sure that we don't remove selected ids until the
      // items array *actually* changes. A component may render with
      // new `items` arrays that are the same, just fresh instances, but
      // we need to wait until the actual array changes. This solves
      // the case where undo-ing adds back items, but we remove the
      // selected item too early (because the component rerenders
      // multiple times)

      let ids = new Set(items.map(item => item.id));
      let isSame =
        prevItems.current.length === items.length &&
        prevItems.current.every(item => ids.has(item.id));

      if (!isSame) {
        let selected = [...state.selectedItems];
        let filtered = selected.filter(id => ids.has(id));

        // If the selected items has changed, update the selection
        if (selected.length !== filtered.length) {
          dispatch({ type: 'select-all', ids: filtered });
        }
      }
    }

    prevItems.current = items;
  }, [items, state.selectedItems]);

  useEffect(() => {
    let prevState = undo.getUndoState('selectedItems');
    undo.setUndoState('selectedItems', { name, items: state.selectedItems });
    return () => undo.setUndoState('selectedItems', prevState);
  }, [state.selectedItems]);

  let lastUndoState = useSelector(state => state.app.lastUndoState);

  useEffect(() => {
    function onUndo({ messages, undoTag }) {
      let tagged = undo.getTaggedState(undoTag);

      let deletedIds = new Set(
        messages
          .filter(msg => msg.column === 'tombstone' && msg.value === 1)
          .map(msg => msg.row)
      );

      if (
        tagged &&
        tagged.selectedItems &&
        tagged.selectedItems.name === name
      ) {
        dispatch({
          type: 'select-all',
          // Coerce the Set into an array
          ids: [...tagged.selectedItems.items].filter(id => !deletedIds.has(id))
        });
      }
    }

    if (lastUndoState && lastUndoState.current) {
      onUndo(lastUndoState.current);
    }

    return listen('undo-event', onUndo);
  }, []);

  return {
    items: state.selectedItems,
    setItems: state.setSelectedItems,
    dispatch
  };
}

let SelectedDispatch = React.createContext(null);
let SelectedItems = React.createContext(null);

export function useSelectedDispatch() {
  return useContext(SelectedDispatch);
}

export function useSelectedItems() {
  return useContext(SelectedItems);
}

export function SelectedProvider({ instance, fetchAllIds, children }) {
  let latestItems = useRef(null);

  useEffect(() => {
    latestItems.current = instance.items;
  }, [instance.items]);

  let dispatch = useCallback(
    async action => {
      if (action.type === 'select-all') {
        if (latestItems.current && latestItems.current.size > 0) {
          return instance.dispatch({ type: 'select-none' });
        } else {
          if (fetchAllIds) {
            return instance.dispatch({
              type: 'select-all',
              ids: await fetchAllIds()
            });
          }
          return instance.dispatch({ type: 'select-all' });
        }
      }
      return instance.dispatch(action);
    },
    [instance.dispatch, fetchAllIds]
  );

  return (
    <SelectedItems.Provider value={instance.items}>
      <SelectedDispatch.Provider value={dispatch}>
        {children}
      </SelectedDispatch.Provider>
    </SelectedItems.Provider>
  );
}

// This can be helpful in class components if you cannot use the
// custom hook
export function SelectedProviderWithItems({
  name,
  items,
  initialSelectedIds,
  fetchAllIds,
  registerDispatch,
  children
}) {
  let selected = useSelected(name, items, initialSelectedIds);

  useEffect(() => {
    registerDispatch && registerDispatch(selected.dispatch);
  }, [registerDispatch]);

  return (
    <SelectedProvider
      instance={selected}
      fetchAllIds={fetchAllIds}
      children={children}
    />
  );
}
