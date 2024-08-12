// @ts-strict-ignore
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type ReactElement,
  type MouseEvent,
} from 'react';
import { useSelector } from 'react-redux';

import { type State } from 'loot-core/src/client/state-types';
import { listen } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';
import { type UndoState } from 'loot-core/src/server/undo';
import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';

type Range<T> = { start: T; end: T | null };
type Item = { id: string };

function iterateRange(range: Range<number>, func: (i: number) => void): void {
  const from = Math.min(range.start, range.end);
  const to = Math.max(range.start, range.end);

  for (let i = from; i <= to; i++) {
    func(i);
  }
}

type SelectedState = {
  selectedRange: Range<string> | null;
  selectedItems: Set<string>;
};

type WithOptionalMouseEvent = {
  event?: MouseEvent;
};
type SelectAction = {
  type: 'select';
  id: string;
} & WithOptionalMouseEvent;
type SelectNoneAction = {
  type: 'select-none';
} & WithOptionalMouseEvent;
type SelectAllAction = {
  type: 'select-all';
  ids?: string[];
} & WithOptionalMouseEvent;

type Actions = SelectAction | SelectNoneAction | SelectAllAction;

export function useSelected<T extends Item>(
  name: string,
  items: T[],
  initialSelectedIds: string[],
  selectAllFilter?: (item: T) => boolean,
) {
  const [state, dispatch] = useReducer(
    (state: SelectedState, action: Actions) => {
      switch (action.type) {
        case 'select': {
          const { selectedRange } = state;
          const selectedItems = new Set(state.selectedItems);
          const { id, event } = action;

          if (event.shiftKey && selectedRange) {
            const idx = items.findIndex(p => p.id === id);
            const startIdx = items.findIndex(p => p.id === selectedRange.start);
            const endIdx = items.findIndex(p => p.id === selectedRange.end);
            let range: Range<number>;
            let deleteUntil: Range<number>;

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
                end: items[range.end].id,
              },
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
              selectedRange: range,
            };
          }
        }

        case 'select-none':
          return { ...state, selectedItems: new Set<string>() };

        case 'select-all':
          let selectedItems: string[] = [];
          if (action.ids && items && selectAllFilter) {
            const idsToInclude = new Set(
              items.filter(selectAllFilter).map(item => item.id),
            );
            selectedItems = action.ids.filter(id => idsToInclude.has(id));
          } else if (items && selectAllFilter) {
            selectedItems = items.filter(selectAllFilter).map(item => item.id);
          } else {
            selectedItems = action.ids || items.map(item => item.id);
          }
          return {
            ...state,
            selectedItems: new Set(selectedItems),
            selectedRange:
              action.ids && action.ids.length === 1
                ? { start: action.ids[0], end: null }
                : null,
          };

        default:
          throw new Error('Unexpected action: ' + JSON.stringify(action));
      }
    },
    null,
    () => ({
      selectedItems: new Set<string>(initialSelectedIds || []),
      selectedRange:
        initialSelectedIds && initialSelectedIds.length === 1
          ? { start: initialSelectedIds[0], end: null }
          : null,
    }),
  );

  const prevItems = useRef(items);
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

      const ids = new Set(items.map(item => item.id));
      const isSame =
        prevItems.current.length === items.length &&
        prevItems.current.every(item => ids.has(item.id));

      if (!isSame) {
        const selected = [...state.selectedItems];
        const filtered = selected.filter(id => ids.has(id));

        // If the selected items has changed, update the selection
        if (selected.length !== filtered.length) {
          dispatch({ type: 'select-all', ids: filtered });
        }
      }
    }

    prevItems.current = items;
  }, [items, state.selectedItems]);

  useEffect(() => {
    const prevState = undo.getUndoState('selectedItems');
    undo.setUndoState('selectedItems', { name, items: state.selectedItems });
    return () => undo.setUndoState('selectedItems', prevState);
  }, [state.selectedItems]);

  const lastUndoState = useSelector((state: State) => state.app.lastUndoState);

  useEffect(() => {
    function onUndo({ messages, undoTag }: UndoState) {
      const tagged = undo.getTaggedState(undoTag);

      const deletedIds = new Set(
        messages
          .filter(msg => msg.column === 'tombstone' && msg.value === 1)
          .map(msg => msg.row),
      );

      if (tagged?.selectedItems?.name === name) {
        dispatch({
          type: 'select-all',
          // Coerce the Set into an array
          ids: [...tagged.selectedItems.items].filter(
            id => !deletedIds.has(id),
          ),
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
    dispatch,
  };
}

const SelectedDispatch = createContext<(action: Actions) => void>(null);
const SelectedItems = createContext<Set<string>>(null);

export function useSelectedDispatch() {
  return useContext(SelectedDispatch);
}

export function useSelectedItems() {
  return useContext(SelectedItems);
}

type SelectedProviderProps<T extends Item> = {
  instance: ReturnType<typeof useSelected<T>>;
  fetchAllIds?: () => Promise<string[]>;
  children: ReactElement;
};

export function SelectedProvider<T extends Item>({
  instance,
  fetchAllIds,
  children,
}: SelectedProviderProps<T>) {
  const latestItems = useRef(null);

  useEffect(() => {
    latestItems.current = instance.items;
  }, [instance.items]);

  const dispatch = useCallback(
    async (action: Actions) => {
      if (!action.event && isNonProductionEnvironment()) {
        throw new Error('SelectedDispatch actions must have an event');
      }
      if (action.type === 'select-all') {
        if (latestItems.current && latestItems.current.size > 0) {
          return instance.dispatch({
            type: 'select-none',
            event: action.event,
          });
        } else {
          if (fetchAllIds) {
            return instance.dispatch({
              type: 'select-all',
              ids: await fetchAllIds(),
              event: action.event,
            });
          }
          return instance.dispatch({ type: 'select-all', event: action.event });
        }
      }
      return instance.dispatch(action);
    },
    [instance.dispatch, fetchAllIds],
  );

  return (
    <SelectedItems.Provider value={instance.items}>
      <SelectedDispatch.Provider value={dispatch}>
        {children}
      </SelectedDispatch.Provider>
    </SelectedItems.Provider>
  );
}

type SelectedProviderWithItemsProps<T extends Item> = {
  name: string;
  items: T[];
  initialSelectedIds: string[];
  fetchAllIds: () => Promise<string[]>;
  registerDispatch?: (dispatch: Dispatch<Actions>) => void;
  selectAllFilter?: (item: T) => boolean;
  children: ReactElement;
};

// This can be helpful in class components if you cannot use the
// custom hook
export function SelectedProviderWithItems<T extends Item>({
  name,
  items,
  initialSelectedIds,
  fetchAllIds,
  registerDispatch,
  selectAllFilter,
  children,
}: SelectedProviderWithItemsProps<T>) {
  const selected = useSelected<T>(
    name,
    items,
    initialSelectedIds,
    selectAllFilter,
  );

  useEffect(() => {
    registerDispatch?.(selected.dispatch);
  }, [registerDispatch]);

  return (
    <SelectedProvider<T> instance={selected} fetchAllIds={fetchAllIds}>
      {children}
    </SelectedProvider>
  );
}
