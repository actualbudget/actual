import React, {
  createContext,
  useMemo,
  useEffect,
  useContext,
  useReducer,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';

type SplitMode = 'collapse' | 'expand';

type SplitsStateContext = {
  state: {
    mode: SplitMode;
    ids: Set<string>;
    transitionId: string | null;
  };
};

const SplitsExpandedContext = createContext<SplitsStateContext>(null);

export function useSplitsExpanded() {
  const data = useContext(SplitsExpandedContext);

  return useMemo(
    () => ({
      ...data,
      expanded: (id: string) =>
        data.state.mode === 'collapse'
          ? !data.state.ids.has(id)
          : data.state.ids.has(id),
    }),
    [data],
  );
}

type ToggleSplitAction = {
  type: 'toggle-split';
  id: string;
};

type OpenSplitAction = {
  type: 'open-split';
  id: string;
};

type ClospSplitsAction = {
  type: 'close-splits';
  ids: string[];
};

type SetModeAction = {
  type: 'set-mode';
  mode: SplitMode;
};

type SwitchModeAction = {
  type: 'switch-mode';
  id: string;
};

type FinishSwitchModeAction = {
  type: 'finish-switch-mode';
};

type Actions =
  | ToggleSplitAction
  | OpenSplitAction
  | ClospSplitsAction
  | SetModeAction
  | SwitchModeAction
  | FinishSwitchModeAction;

export function SplitsExpandedProvider({ children, initialMode = 'expand' }) {
  const cachedState = useSelector(state => state.app.lastSplitState);
  const reduxDispatch = useDispatch();

  const [state, dispatch] = useReducer(
    (state, action: Actions) => {
      switch (action.type) {
        case 'toggle-split': {
          const ids = new Set([...state.ids]);
          const { id } = action;
          if (ids.has(id)) {
            ids.delete(id);
          } else {
            ids.add(id);
          }
          return { ...state, ids };
        }
        case 'open-split': {
          const ids = new Set([...state.ids]);
          const { id } = action;
          if (state.mode === 'collapse') {
            ids.delete(id);
          } else {
            ids.add(id);
          }
          return { ...state, ids };
        }
        case 'close-splits': {
          const ids = new Set([...state.ids]);
          action.ids.forEach(id => {
            if (state.mode === 'collapse') {
              ids.add(id);
            } else {
              ids.delete(id);
            }
          });
          return { ...state, ids };
        }
        case 'set-mode': {
          return {
            ...state,
            mode: action.mode,
            ids: new Set(),
            transitionId: null,
          };
        }
        case 'switch-mode':
          if (state.transitionId != null) {
            // You can only transition once at a time
            return state;
          }

          return {
            ...state,
            mode: state.mode === 'expand' ? 'collapse' : 'expand',
            transitionId: action.id,
            ids: new Set(),
          };
        case 'finish-switch-mode':
          return { ...state, transitionId: null };
      }
    },
    cachedState.current || { ids: new Set(), mode: initialMode },
  );

  useEffect(() => {
    if (state.transitionId != null) {
      // This timeout allows animations to finish
      setTimeout(() => {
        dispatch({ type: 'finish-switch-mode' });
      }, 250);
    }
  }, [state.transitionId]);

  useEffect(() => {
    // In a finished state, cache the state
    if (state.transitionId == null) {
      reduxDispatch({ type: 'SET_LAST_SPLIT_STATE', splitState: state });
    }
  }, [reduxDispatch, state]);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <SplitsExpandedContext.Provider value={value}>
      {children}
    </SplitsExpandedContext.Provider>
  );
}
