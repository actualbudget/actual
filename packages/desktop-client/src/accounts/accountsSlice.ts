import { memoizeOne } from '@actual-app/core/shared/memoize';
import { groupById } from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { resetApp } from '#app/appSlice';

const sliceName = 'account';

type AccountState = {
  failedAccounts: {
    [key: AccountEntity['id']]: FailedSync;
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

/** A missing exchange rate keeps the details needed to add one. */
export type FailedSync = {
  type: string;
  code: string;
  rate?: { currencyCode: string; dates: string[] };
};

type MarkAccountFailedPayload = {
  id: AccountEntity['id'];
  errorType: string;
  errorCode: string;
  rate?: FailedSync['rate'];
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
        ...(action.payload.rate && { rate: action.payload.rate }),
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
