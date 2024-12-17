import { useDispatch, useSelector, useStore } from 'react-redux';

import {
  type AppStore,
  type AppDispatch,
  type RootState,
} from 'loot-core/client/store';

export const useAppStore = useStore.withTypes<AppStore>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
