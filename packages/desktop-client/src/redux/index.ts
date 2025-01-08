import { useDispatch, useSelector } from 'react-redux';

import { type AppDispatch, type RootState } from 'loot-core/client/store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
