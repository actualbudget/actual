// @ts-strict-ignore
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { t } from 'i18next';
import memoizeOne from 'memoize-one';

import { send } from 'loot-core/platform/client/fetch';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
  type TransactionEntity,
  type Tag,
} from 'loot-core/types/models';

import { markUpdatedAccounts } from '@desktop-client/accounts/accountsSlice';
import { resetApp } from '@desktop-client/app/appSlice';
import {
  addGenericErrorNotification,
  addNotification,
} from '@desktop-client/notifications/notificationsSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';

const sliceName = 'queries';

type QueriesState = {
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
  lastTransaction: TransactionEntity | null;
  tags: Tag[];
  isTagsLoading: boolean;
  isTagsLoaded: boolean;
  isTagsDirty: boolean;
};

const initialState: QueriesState = {
  newTransactions: [],
  matchedTransactions: [],
  lastTransaction: null,
  tags: [],
  isTagsLoading: false,
  isTagsLoaded: false,
  isTagsDirty: false,
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
    markTagsDirty(state) {
      _markTagsDirty(state);
    },
  },
  extraReducers: builder => {
    // App

    builder.addCase(resetApp, () => initialState);

    // Tags

    builder.addCase(createTag.fulfilled, _markTagsDirty);
    builder.addCase(deleteTag.fulfilled, _markTagsDirty);
    builder.addCase(deleteAllTags.fulfilled, _markTagsDirty);
    builder.addCase(updateTag.fulfilled, _markTagsDirty);

    builder.addCase(reloadTags.fulfilled, (state, action) => {
      _loadTags(state, action.payload);
    });

    builder.addCase(reloadTags.rejected, state => {
      state.isTagsLoading = false;
    });

    builder.addCase(reloadTags.pending, state => {
      state.isTagsLoading = true;
    });

    builder.addCase(getTags.fulfilled, (state, action) => {
      _loadTags(state, action.payload);
    });

    builder.addCase(getTags.rejected, state => {
      state.isTagsLoading = false;
    });

    builder.addCase(getTags.pending, state => {
      state.isTagsLoading = true;
    });

    builder.addCase(findTags.fulfilled, (state, action) => {
      _loadTags(state, action.payload);
    });

    builder.addCase(findTags.rejected, state => {
      state.isTagsLoading = false;
    });

    builder.addCase(findTags.pending, state => {
      state.isTagsLoading = true;
    });
  },
});

export const getTags = createAppAsyncThunk(
  `${sliceName}/getTags`,
  async () => {
    const tags: Tag[] = await send('tags-get');
    return tags;
  },
  {
    condition: (_, { getState }) => {
      const { queries } = getState();
      return (
        !queries.isTagsLoading && (queries.isTagsDirty || !queries.isTagsLoaded)
      );
    },
  },
);

export const reloadTags = createAppAsyncThunk(
  `${sliceName}/reloadTags`,
  async () => {
    const tags: Tag[] = await send('tags-get');
    return tags;
  },
);

export const createTag = createAppAsyncThunk(
  `${sliceName}/createTag`,
  async ({ tag, color, description }: Omit<Tag, 'id'>) => {
    const id = await send('tags-create', { tag, color, description });
    return id;
  },
);

export const deleteTag = createAppAsyncThunk(
  `${sliceName}/deleteTag`,
  async (tag: Tag) => {
    const id = await send('tags-delete', tag);
    return id;
  },
);

export const deleteAllTags = createAppAsyncThunk(
  `${sliceName}/deleteAllTags`,
  async (ids: Array<Tag['id']>) => {
    const id = await send('tags-delete-all', ids);
    return id;
  },
);

export const updateTag = createAppAsyncThunk(
  `${sliceName}/updateTag`,
  async (tag: Tag) => {
    const id = await send('tags-update', tag);
    return id;
  },
);

export const findTags = createAppAsyncThunk(
  `${sliceName}/findTags`,
  async () => {
    const tags: Tag[] = await send('tags-find');
    return tags;
  },
);

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
  getTags,
  createTag,
  updateTag,
  deleteTag,
  deleteAllTags,
  findTags,
};

export const {
  setNewTransactions,
  updateNewTransactions,
  setLastTransaction,
  markTagsDirty,
} = queriesSlice.actions;

function _loadTags(state: QueriesState, tags: QueriesState['tags']) {
  state.tags = tags;
  state.isTagsLoading = false;
  state.isTagsLoaded = true;
  state.isTagsDirty = false;
}

function _markTagsDirty(state: QueriesState) {
  state.isTagsDirty = true;
}
