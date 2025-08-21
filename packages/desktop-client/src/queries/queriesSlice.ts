// @ts-strict-ignore
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { send } from 'loot-core/platform/client/fetch';
import { type TransactionEntity } from 'loot-core/types/models';

import { markUpdatedAccounts } from '@desktop-client/accounts/accountsSlice';
import { resetApp } from '@desktop-client/app/appSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';

const sliceName = 'queries';

type QueriesState = {
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
  lastTransaction: TransactionEntity | null;
};

const initialState: QueriesState = {
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

const queriesSlice = createSlice({
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

// Transaction actions

type ImportPreviewTransactionsPayload = {
  accountId: string;
  transactions: TransactionEntity[];
};

export const importPreviewTransactions = createAppAsyncThunk(
  `${sliceName}/importPreviewTransactions`,
  async (
    { accountId, transactions }: ImportPreviewTransactionsPayload,
    { dispatch },
  ) => {
    const { errors = [], updatedPreview } = await send('transactions-import', {
      accountId,
      transactions,
      isPreview: true,
    });

    errors.forEach(error => {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: error.message,
          },
        }),
      );
    });

    return updatedPreview;
  },
);

type ImportTransactionsPayload = {
  accountId: string;
  transactions: TransactionEntity[];
  reconcile: boolean;
};

export const importTransactions = createAppAsyncThunk(
  `${sliceName}/importTransactions`,
  async (
    { accountId, transactions, reconcile }: ImportTransactionsPayload,
    { dispatch },
  ) => {
    if (!reconcile) {
      await send('api/transactions-add', {
        accountId,
        transactions,
      });

      return true;
    }

    const {
      errors = [],
      added,
      updated,
    } = await send('transactions-import', {
      accountId,
      transactions,
      isPreview: false,
    });

    errors.forEach(error => {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: error.message,
          },
        }),
      );
    });

    const { setNewTransactions } = queriesSlice.actions;

    dispatch(
      setNewTransactions({
        newTransactions: added,
        matchedTransactions: updated,
      }),
    );

    dispatch(
      markUpdatedAccounts({
        ids: added.length > 0 ? [accountId] : [],
      }),
    );

    return added.length > 0 || updated.length > 0;
  },
);

// Slice exports

export const { name, reducer, getInitialState } = queriesSlice;
export const actions = {
  ...queriesSlice.actions,
  importPreviewTransactions,
  importTransactions,
};

export const { setNewTransactions, updateNewTransactions, setLastTransaction } =
  queriesSlice.actions;
