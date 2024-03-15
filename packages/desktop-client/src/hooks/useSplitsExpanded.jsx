import React, {
  createContext,
  useMemo,
  useEffect,
  useContext,
  useReducer,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';

const SplitsExpandedContext = createContext(null);

export function useSplitsExpanded() {
  const data = useContext(SplitsExpandedContext);

  return useMemo(
    () => ({
      ...data,
      expanded: id =>
        data.state.mode === 'collapse'
          ? !data.state.ids.has(id)
          : data.state.ids.has(id),
    }),
    [data],
  );
}

export function SplitsExpandedProvider({ children, initialMode = 'expand' }) {
  const cachedState = useSelector(state => state.app.lastSplitState);
  const reduxDispatch = useDispatch();

  const [state, dispatch] = useReducer(
    (state, action) => {
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
        default:
          throw new Error('Unknown action type: ' + action.type);
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
