import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react';

type SplitMode = 'collapse' | 'expand';
type SplitState = {
  ids: Set<string>;
  mode: SplitMode;
  transitionId: string | null;
};

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
    ids: new Set<string>(),
    transitionId: null,
  },
  dispatch: () => {
    throw new Error('Unitialised context method called: dispatch');
  },
});

export type SplitsExpandedContextValue = {
  isExpanded: (id: string) => boolean;
} & SplitsStateContext;

export function useSplitsExpanded() {
  const data = useContext(SplitsExpandedContext);

  return useMemo(
    (): SplitsExpandedContextValue => ({
      ...data,
      isExpanded: (id: string) => {
        return data.state.mode === 'collapse'
          ? !data.state.ids.has(id)
          : data.state.ids.has(id);
      },
    }),
    [data],
  );
}

type SplitsExpandedProviderProps = {
  children?: ReactNode;
  initialMode?: SplitMode;
};

export function SplitsExpandedProvider({
  children,
  initialMode = 'expand',
}: SplitsExpandedProviderProps) {
  const previousState = useRef<SplitState | null>(null);

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
            ids: new Set<string>(),
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
            ids: new Set<string>(),
          };
        case 'finish-switch-mode':
          return { ...state, transitionId: null };
        default:
          throw new Error('Unrecognized action');
      }
    },
    previousState.current || {
      ids: new Set<string>(),
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
