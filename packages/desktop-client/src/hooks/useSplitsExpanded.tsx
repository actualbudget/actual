import React, {
  createContext,
  useMemo,
  useEffect,
  useContext,
  useReducer,
  type ReactNode,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { type SplitState } from 'loot-core/client/state-types/app';

type SplitsExpandedState = SplitState & {
  transitionId?: string;
};

type SplitsExpandedAction =
  | {
      type: 'toggle-split';
      id: string;
    }
  | {
      type: 'open-split';
      id: string;
    }
  | {
      type: 'close-splits';
      ids: string[];
    }
  | {
      type: 'set-mode';
      mode: 'expand' | 'collapse';
    }
  | {
      type: 'switch-mode';
      id: string;
    }
  | {
      type: 'finish-switch-mode';
    };

type SplitsExpandedContextValue = {
  state: SplitsExpandedState;
  dispatch: (action: SplitsExpandedAction) => void;
};
const SplitsExpandedContext = createContext<
  SplitsExpandedContextValue | undefined
>(undefined);

type UseSplitsExpandedResult = SplitsExpandedContextValue & {
  isExpanded: (id: string) => boolean;
};

export function useSplitsExpanded(): UseSplitsExpandedResult {
  const data = useContext(SplitsExpandedContext);

  if (!data) {
    throw new Error(
      'useSplitsExpanded must be used within a SplitsExpandedProvider',
    );
  }

  return useMemo(
    () => ({
      ...data,
      isExpanded: id =>
        data.state.mode === 'collapse'
          ? !data.state.ids.has(id)
          : data.state.ids.has(id),
    }),
    [data],
  );
}

function splitsExpandedReducer(
  state: SplitsExpandedState,
  action: SplitsExpandedAction,
): SplitsExpandedState {
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
        transitionId: undefined,
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
      return { ...state, transitionId: undefined };
    default:
      throw new Error(`Unknown action: ${JSON.stringify(action)}`);
  }
}

type SplitsExpandedProviderProps = {
  children: ReactNode;
  initialMode?: 'expand' | 'collapse';
};

export function SplitsExpandedProvider({
  children,
  initialMode = 'expand',
}: SplitsExpandedProviderProps) {
  const cachedState = useSelector(state => state.app.lastSplitState);
  const reduxDispatch = useDispatch();

  const [state, dispatch] = useReducer<typeof splitsExpandedReducer>(
    splitsExpandedReducer,
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
