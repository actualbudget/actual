/* oxlint-disable eslint/no-restricted-imports */
import {
  useDispatch as useReduxDispatch,
  useSelector as useReduxSelector,
  useStore as useReduxStore,
} from 'react-redux';

import { createAsyncThunk } from '@reduxjs/toolkit';

import type { AppDispatch, AppStore, ExtraArguments, RootState } from './store';

export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
  extra: ExtraArguments;
}>();

export const useStore = useReduxStore.withTypes<AppStore>();
export const useDispatch = useReduxDispatch.withTypes<AppDispatch>();
export const useSelector = useReduxSelector.withTypes<RootState>();
