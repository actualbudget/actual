import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { TransactionEntity } from 'loot-core/types/models';

import { resetApp } from '@desktop-client/app/appSlice';

const sliceName = 'transactions';

type TransactionsState = {
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
  lastTransaction: TransactionEntity | null;
};

const initialState: TransactionsState = {
  newTransactions: [],
  matchedTransactions: [],
  lastTransaction: null,
};

type SetNewTransactionsPayload = {
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
};

type UpdateNewTransactionsPayload = {
  id: TransactionEntity['id'];
};

type SetLastTransactionPayload = {
  transaction: TransactionEntity;
};

const transactionsSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    setNewTransactions(
      state,
      action: PayloadAction<SetNewTransactionsPayload>,
    ) {
      state.newTransactions = action.payload.newTransactions
        ? [...state.newTransactions, ...action.payload.newTransactions]
        : state.newTransactions;

      state.matchedTransactions = action.payload.matchedTransactions
        ? [...state.matchedTransactions, ...action.payload.matchedTransactions]
        : state.matchedTransactions;
    },
    updateNewTransactions(
      state,
      action: PayloadAction<UpdateNewTransactionsPayload>,
    ) {
      state.newTransactions = state.newTransactions.filter(
        id => id !== action.payload.id,
      );
      state.matchedTransactions = state.matchedTransactions.filter(
        id => id !== action.payload.id,
      );
    },
    setLastTransaction(
      state,
      action: PayloadAction<SetLastTransactionPayload>,
    ) {
      state.lastTransaction = action.payload.transaction;
    },
  },
  extraReducers: builder => {
    builder.addCase(resetApp, () => initialState);
  },
});

export const { name, reducer, getInitialState } = transactionsSlice;
export const actions = {
  ...transactionsSlice.actions,
};

export const { setNewTransactions, updateNewTransactions, setLastTransaction } =
  transactionsSlice.actions;
