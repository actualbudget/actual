import {
  useDispatch as useReduxDispatch,
  useSelector as useReduxSelector,
} from 'react-redux';

import { type AppDispatch, type RootState } from 'loot-core/client/store';

export const useDispatch = useReduxDispatch.withTypes<AppDispatch>();
export const useSelector = useReduxSelector.withTypes<RootState>();
