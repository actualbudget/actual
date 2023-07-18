import { useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';

// https://react-redux.js.org/api/hooks#recipe-useactions
// eslint-disable-next-line import/no-unused-modules
export function useActions() {
  const dispatch = useDispatch();
  return useMemo(() => {
    return bindActionCreators(actions, dispatch);
  }, [dispatch]);
}
