import {
  useDispatch as useReduxDispatch,
  useSelector as useReduxSelector,
  useStore as useReduxStore,
} from 'react-redux';

import {
  type AppStore,
  type AppDispatch,
  type RootState,
} from 'loot-core/client/store';

export const useStore = useReduxStore.withTypes<AppStore>();
export const useDispatch = useReduxDispatch.withTypes<AppDispatch>();
export const useSelector = useReduxSelector.withTypes<RootState>();
