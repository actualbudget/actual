import React, {
  createContext,
  useMemo,
  useEffect,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
  useRef,
} from 'react';

import {
  type SplitMode,
  type SplitState,
} from 'loot-core/client/state-types/app';

type ToggleSplitAction = {
  type: 'toggle-split';
  id: string;
};

type OpenSplitAction = {
  type: 'open-split';
  id: string;
};

type CloseSplitsAction = {
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
  | CloseSplitsAction
  | SetModeAction
  | SwitchModeAction
  | FinishSwitchModeAction;

type SplitsStateContext = {
  state: SplitState;
  dispatch: Dispatch<Actions>;
};

const SplitsExpandedContext = createContext<SplitsStateContext>({
  state: {
    mode: 'collapse',
    ids: [],
    transitionId: null,
  },
  dispatch: () => {
    throw new Error('Unitialised context method called: dispatch');
  },
});

export function useSplitsExpanded() {
  const data = useContext(SplitsExpandedContext);

  return useMemo(
    () => ({
      ...data,
      isExpanded: (id: string) => {
        const idSet = new Set(data.state.ids);
        return data.state.mode === 'collapse' ? !idSet.has(id) : idSet.has(id);
      },
    }),
    [data],
  );
}

type SplitsExpandedProviderProps = {
  children?: ReactNode;
  initialMode: SplitMode;
};

export function SplitsExpandedProvider({
  children,
  initialMode = 'expand',
}: SplitsExpandedProviderProps) {
  const previousState = useRef(null);

  const [state, dispatch] = useReducer(
    (state: SplitState, action: Actions): SplitState => {
      switch (action.type) {
        case 'toggle-split': {
          const ids = new Set([...state.ids]);
          const { id } = action;
          if (ids.has(id)) {
            ids.delete(id);
          } else {
            ids.add(id);
          }
          return { ...state, ids: Array.from(ids) };
        }
        case 'open-split': {
          const ids = new Set([...state.ids]);
          const { id } = action;
          if (state.mode === 'collapse') {
            ids.delete(id);
          } else {
            ids.add(id);
          }
          return { ...state, ids: Array.from(ids) };
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
          return { ...state, ids: Array.from(ids) };
        }
        case 'set-mode': {
          return {
            ...state,
            mode: action.mode,
            ids: [],
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
            ids: [],
          };
        case 'finish-switch-mode':
          return { ...state, transitionId: null };
      }
    },
    previousState.current || {
      ids: [],
      mode: initialMode,
      transitionId: null,
    },
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
      previousState.current = state;
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <SplitsExpandedContext.Provider value={value}>
      {children}
    </SplitsExpandedContext.Provider>
  );
}
