import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import memoizeOne from 'memoize-one';

import { groupById } from 'loot-core/shared/util';
import type { AccountEntity } from 'loot-core/types/models';

import { resetApp } from '@desktop-client/app/appSlice';

const sliceName = 'account';

type AccountState = {
  failedAccounts: {
    [key: AccountEntity['id']]: { type: string; code: string };
  };
  accountsSyncing: Array<AccountEntity['id']>;
  updatedAccounts: Array<AccountEntity['id']>;
};

const initialState: AccountState = {
  failedAccounts: {},
  accountsSyncing: [],
  updatedAccounts: [],
};

type SetAccountsSyncingPayload = {
  ids: Array<AccountEntity['id']>;
};

type MarkAccountFailedPayload = {
  id: AccountEntity['id'];
  errorType: string;
  errorCode: string;
};

type MarkAccountSuccessPayload = {
  id: AccountEntity['id'];
};

type MarkUpdatedAccountsPayload = {
  ids: AccountState['updatedAccounts'];
};

type MarkAccountReadPayload = {
  id: AccountEntity['id'];
};

const accountsSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    setAccountsSyncing(
      state,
      action: PayloadAction<SetAccountsSyncingPayload>,
    ) {
      state.accountsSyncing = action.payload.ids;
    },
    markAccountFailed(state, action: PayloadAction<MarkAccountFailedPayload>) {
      state.failedAccounts[action.payload.id] = {
        type: action.payload.errorType,
        code: action.payload.errorCode,
      };
    },
    markAccountSuccess(
      state,
      action: PayloadAction<MarkAccountSuccessPayload>,
    ) {
      delete state.failedAccounts[action.payload.id];
    },
    markUpdatedAccounts(
      state,
      action: PayloadAction<MarkUpdatedAccountsPayload>,
    ) {
      state.updatedAccounts = action.payload.ids
        ? [...state.updatedAccounts, ...action.payload.ids]
        : state.updatedAccounts;
    },
    markAccountRead(state, action: PayloadAction<MarkAccountReadPayload>) {
      state.updatedAccounts = state.updatedAccounts.filter(
        id => id !== action.payload.id,
      );
    },
  },
  extraReducers: builder => {
    builder.addCase(resetApp, () => initialState);
  },
});

export const getAccountsById = memoizeOne(
  (accounts: AccountEntity[] | null | undefined) => groupById(accounts),
);

export const { name, reducer, getInitialState } = accountsSlice;
export const actions = {
  ...accountsSlice.actions,
};

export const {
  markAccountRead,
  markAccountFailed,
  markAccountSuccess,
  markUpdatedAccounts,
  setAccountsSyncing,
} = accountsSlice.actions;
