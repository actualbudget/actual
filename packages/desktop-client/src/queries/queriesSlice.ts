// @ts-strict-ignore
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { t } from 'i18next';
import memoizeOne from 'memoize-one';

import { send } from 'loot-core/platform/client/fetch';
import { groupById } from 'loot-core/shared/util';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
  type TransactionEntity,
  type AccountEntity,
  type PayeeEntity,
  type Tag,
} from 'loot-core/types/models';

import { resetApp } from '@desktop-client/app/appSlice';
import {
  addGenericErrorNotification,
  addNotification,
} from '@desktop-client/notifications/notificationsSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';

const sliceName = 'queries';

type CategoryViews = {
  grouped: CategoryGroupEntity[];
  list: CategoryEntity[];
};

type QueriesState = {
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
  lastTransaction: TransactionEntity | null;
  updatedAccounts: Array<AccountEntity['id']>;
  accounts: AccountEntity[];
  isAccountsLoading: boolean;
  isAccountsLoaded: boolean;
  isAccountsDirty: boolean;
  categories: CategoryViews;
  isCategoriesLoading: boolean;
  isCategoriesLoaded: boolean;
  isCategoriesDirty: boolean;
  commonPayees: PayeeEntity[];
  isCommonPayeesLoading: boolean;
  isCommonPayeesLoaded: boolean;
  isCommonPayeesDirty: boolean;
  payees: PayeeEntity[];
  isPayeesLoading: boolean;
  isPayeesLoaded: boolean;
  isPayeesDirty: boolean;
  tags: Tag[];
  isTagsLoading: boolean;
  isTagsLoaded: boolean;
  isTagsDirty: boolean;
};

const initialState: QueriesState = {
  newTransactions: [],
  matchedTransactions: [],
  lastTransaction: null,
  updatedAccounts: [],
  accounts: [],
  isAccountsLoading: false,
  isAccountsLoaded: false,
  isAccountsDirty: false,
  categories: {
    grouped: [],
    list: [],
  },
  isCategoriesLoading: false,
  isCategoriesLoaded: false,
  isCategoriesDirty: false,
  commonPayees: [],
  isCommonPayeesLoading: false,
  isCommonPayeesLoaded: false,
  isCommonPayeesDirty: false,
  payees: [],
  isPayeesLoading: false,
  isPayeesLoaded: false,
  isPayeesDirty: false,
  tags: [],
  isTagsLoading: false,
  isTagsLoaded: false,
  isTagsDirty: false,
};

type SetNewTransactionsPayload = {
  newTransactions: QueriesState['newTransactions'];
  matchedTransactions: QueriesState['matchedTransactions'];
  updatedAccounts: QueriesState['updatedAccounts'];
};

type UpdateNewTransactionsPayload = {
  id: TransactionEntity['id'];
};

type SetLastTransactionPayload = {
  transaction: TransactionEntity;
};

type MarkAccountReadPayload = {
  id: AccountEntity['id'];
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

      state.updatedAccounts = action.payload.updatedAccounts
        ? [...state.updatedAccounts, ...action.payload.updatedAccounts]
        : state.updatedAccounts;
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
    markAccountRead(state, action: PayloadAction<MarkAccountReadPayload>) {
      state.updatedAccounts = state.updatedAccounts.filter(
        id => id !== action.payload.id,
      );
    },
    markAccountsDirty(state) {
      _markAccountsDirty(state);
    },
    markCategoriesDirty(state) {
      _markCategoriesDirty(state);
    },
    markPayeesDirty(state) {
      _markPayeesDirty(state);
    },
    markTagsDirty(state) {
      _markTagsDirty(state);
    },
  },
  extraReducers: builder => {
    // Accounts

    builder.addCase(createAccount.fulfilled, _markAccountsDirty);
    builder.addCase(updateAccount.fulfilled, _markAccountsDirty);
    builder.addCase(closeAccount.fulfilled, _markAccountsDirty);
    builder.addCase(reopenAccount.fulfilled, _markAccountsDirty);

    builder.addCase(reloadAccounts.fulfilled, (state, action) => {
      _loadAccounts(state, action.payload);
    });

    builder.addCase(reloadAccounts.rejected, state => {
      state.isAccountsLoading = false;
    });

    builder.addCase(reloadAccounts.pending, state => {
      state.isAccountsLoading = true;
    });

    builder.addCase(getAccounts.fulfilled, (state, action) => {
      _loadAccounts(state, action.payload);
    });

    builder.addCase(getAccounts.rejected, state => {
      state.isAccountsLoading = false;
    });

    builder.addCase(getAccounts.pending, state => {
      state.isAccountsLoading = true;
    });

    // Categories

    builder.addCase(createCategoryGroup.fulfilled, _markCategoriesDirty);
    builder.addCase(updateCategoryGroup.fulfilled, _markCategoriesDirty);
    builder.addCase(deleteCategoryGroup.fulfilled, _markCategoriesDirty);
    builder.addCase(createCategory.fulfilled, _markCategoriesDirty);
    builder.addCase(updateCategory.fulfilled, _markCategoriesDirty);
    builder.addCase(deleteCategory.fulfilled, _markCategoriesDirty);
    builder.addCase(moveCategoryGroup.fulfilled, _markCategoriesDirty);
    builder.addCase(moveCategory.fulfilled, _markCategoriesDirty);

    builder.addCase(reloadCategories.fulfilled, (state, action) => {
      _loadCategories(state, action.payload);
    });

    builder.addCase(reloadCategories.rejected, state => {
      state.isCategoriesLoading = false;
    });

    builder.addCase(reloadCategories.pending, state => {
      state.isCategoriesLoading = true;
    });

    builder.addCase(getCategories.fulfilled, (state, action) => {
      _loadCategories(state, action.payload);
    });

    builder.addCase(getCategories.rejected, state => {
      state.isCategoriesLoading = false;
    });

    builder.addCase(getCategories.pending, state => {
      state.isCategoriesLoading = true;
    });

    // Payees

    builder.addCase(createPayee.fulfilled, _markPayeesDirty);

    builder.addCase(reloadCommonPayees.fulfilled, (state, action) => {
      _loadCommonPayees(state, action.payload);
    });

    builder.addCase(reloadCommonPayees.rejected, state => {
      state.isCommonPayeesLoading = false;
    });

    builder.addCase(reloadCommonPayees.pending, state => {
      state.isCommonPayeesLoading = true;
    });

    builder.addCase(getCommonPayees.fulfilled, (state, action) => {
      _loadCommonPayees(state, action.payload);
    });

    builder.addCase(getCommonPayees.rejected, state => {
      state.isCommonPayeesLoading = false;
    });

    builder.addCase(getCommonPayees.pending, state => {
      state.isCommonPayeesLoading = true;
    });

    builder.addCase(reloadPayees.fulfilled, (state, action) => {
      _loadPayees(state, action.payload);
    });

    builder.addCase(reloadPayees.rejected, state => {
      state.isPayeesLoading = false;
    });

    builder.addCase(reloadPayees.pending, state => {
      state.isPayeesLoading = true;
    });

    builder.addCase(getPayees.fulfilled, (state, action) => {
      _loadPayees(state, action.payload);
    });

    builder.addCase(getPayees.rejected, state => {
      state.isPayeesLoading = false;
    });

    builder.addCase(getPayees.pending, state => {
      state.isPayeesLoading = true;
    });

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

// Account actions

type CreateAccountPayload = {
  name: AccountEntity['name'];
  balance: AccountEntity['balance_current'];
  offBudget: boolean;
};

export const createAccount = createAppAsyncThunk(
  `${sliceName}/createAccount`,
  async ({ name, balance, offBudget }: CreateAccountPayload) => {
    const id: AccountEntity['id'] = await send('account-create', {
      name,
      balance,
      offBudget,
    });
    return id;
  },
);

type CloseAccountPayload = {
  id: AccountEntity['id'];
  transferAccountId?: AccountEntity['id'];
  categoryId?: CategoryEntity['id'];
  forced?: boolean;
};

export const closeAccount = createAppAsyncThunk(
  `${sliceName}/closeAccount`,
  async ({
    id,
    transferAccountId,
    categoryId,
    forced,
  }: CloseAccountPayload) => {
    await send('account-close', {
      id,
      transferAccountId: transferAccountId || null,
      categoryId: categoryId || null,
      forced,
    });
  },
);

type ReopenAccountPayload = {
  id: AccountEntity['id'];
};

export const reopenAccount = createAppAsyncThunk(
  `${sliceName}/reopenAccount`,
  async ({ id }: ReopenAccountPayload) => {
    await send('account-reopen', { id });
  },
);

type UpdateAccountPayload = {
  account: AccountEntity;
};

export const updateAccount = createAppAsyncThunk(
  `${sliceName}/updateAccount`,
  async ({ account }: UpdateAccountPayload) => {
    await send('account-update', account);
    return account;
  },
);

export const getAccounts = createAppAsyncThunk(
  `${sliceName}/getAccounts`,
  async () => {
    // TODO: Force cast to AccountEntity.
    // Server is currently returning the DB model it should return the entity model instead.
    const accounts = (await send('accounts-get')) as AccountEntity[];
    return accounts;
  },
  {
    condition: (_, { getState }) => {
      const { queries } = getState();
      return (
        !queries.isAccountsLoading &&
        (queries.isAccountsDirty || !queries.isAccountsLoaded)
      );
    },
  },
);

export const reloadAccounts = createAppAsyncThunk(
  `${sliceName}/reloadAccounts`,
  async () => {
    // TODO: Force cast to AccountEntity.
    // Server is currently returning the DB model it should return the entity model instead.
    const accounts = (await send('accounts-get')) as AccountEntity[];
    return accounts;
  },
);

// Category actions

type CreateCategoryGroupPayload = {
  name: CategoryGroupEntity['name'];
};

export const createCategoryGroup = createAppAsyncThunk(
  `${sliceName}/createCategoryGroup`,
  async ({ name }: CreateCategoryGroupPayload) => {
    const id = await send('category-group-create', { name });
    return id;
  },
);

type UpdateCategoryGroupPayload = {
  group: CategoryGroupEntity;
};

export const updateCategoryGroup = createAppAsyncThunk(
  `${sliceName}/updateCategoryGroup`,
  async ({ group }: UpdateCategoryGroupPayload) => {
    // Strip off the categories field if it exist. It's not a real db
    // field but groups have this extra field in the client most of the time
    const { categories: _, ...groupNoCategories } = group;
    await send('category-group-update', groupNoCategories);
  },
);

type DeleteCategoryGroupPayload = {
  id: CategoryGroupEntity['id'];
  transferId?: CategoryGroupEntity['id'];
};

export const deleteCategoryGroup = createAppAsyncThunk(
  `${sliceName}/deleteCategoryGroup`,
  async ({ id, transferId }: DeleteCategoryGroupPayload) => {
    await send('category-group-delete', { id, transferId });
  },
);

type CreateCategoryPayload = {
  name: CategoryEntity['name'];
  groupId: CategoryGroupEntity['id'];
  isIncome: boolean;
  isHidden: boolean;
};
export const createCategory = createAppAsyncThunk(
  `${sliceName}/createCategory`,
  async ({ name, groupId, isIncome, isHidden }: CreateCategoryPayload) => {
    const id = await send('category-create', {
      name,
      groupId,
      isIncome,
      hidden: isHidden,
    });
    return id;
  },
);

type UpdateCategoryPayload = {
  category: CategoryEntity;
};

export const updateCategory = createAppAsyncThunk(
  `${sliceName}/updateCategory`,
  async ({ category }: UpdateCategoryPayload) => {
    await send('category-update', category);
  },
);

type DeleteCategoryPayload = {
  id: CategoryEntity['id'];
  transferId?: CategoryEntity['id'];
};

export const deleteCategory = createAppAsyncThunk(
  `${sliceName}/deleteCategory`,
  async ({ id, transferId }: DeleteCategoryPayload, { dispatch }) => {
    const { error } = await send('category-delete', { id, transferId });

    if (error) {
      switch (error) {
        case 'category-type':
          dispatch(
            addNotification({
              notification: {
                id: `${sliceName}/deleteCategory/transfer`,
                type: 'error',
                message: t(
                  'A category must be transferred to another of the same type (expense or income)',
                ),
              },
            }),
          );
          break;
        default:
          dispatch(addGenericErrorNotification());
      }

      throw new Error(error);
    }
  },
);

type MoveCategoryPayload = {
  id: CategoryEntity['id'];
  groupId: CategoryGroupEntity['id'];
  targetId: CategoryEntity['id'] | null;
};

export const moveCategory = createAppAsyncThunk(
  `${sliceName}/moveCategory`,
  async ({ id, groupId, targetId }: MoveCategoryPayload) => {
    await send('category-move', { id, groupId, targetId });
  },
);

type MoveCategoryGroupPayload = {
  id: CategoryGroupEntity['id'];
  targetId: CategoryGroupEntity['id'] | null;
};

export const moveCategoryGroup = createAppAsyncThunk(
  `${sliceName}/moveCategoryGroup`,
  async ({ id, targetId }: MoveCategoryGroupPayload) => {
    await send('category-group-move', { id, targetId });
  },
);

export const getCategories = createAppAsyncThunk(
  `${sliceName}/getCategories`,
  async () => {
    const categories: CategoryViews = await send('get-categories');
    return categories;
  },
  {
    condition: (_, { getState }) => {
      const { queries } = getState();
      return (
        !queries.isCategoriesLoading &&
        (queries.isCategoriesDirty || !queries.isCategoriesLoaded)
      );
    },
  },
);

export const reloadCategories = createAppAsyncThunk(
  `${sliceName}/reloadCategories`,
  async () => {
    const categories: CategoryViews = await send('get-categories');
    return categories;
  },
);

// Payee actions

type CreatePayeePayload = {
  name: PayeeEntity['name'];
};

export const createPayee = createAppAsyncThunk(
  `${sliceName}/createPayee`,
  async ({ name }: CreatePayeePayload) => {
    const id: PayeeEntity['id'] = await send('payee-create', {
      name: name.trim(),
    });
    return id;
  },
);

export const getCommonPayees = createAppAsyncThunk(
  `${sliceName}/getCommonPayees`,
  async () => {
    const payees: PayeeEntity[] = await send('common-payees-get');
    return payees;
  },
  {
    condition: (_, { getState }) => {
      const { queries } = getState();
      return (
        !queries.isCommonPayeesLoading &&
        (queries.isCommonPayeesDirty || !queries.isCommonPayeesLoaded)
      );
    },
  },
);

export const reloadCommonPayees = createAppAsyncThunk(
  `${sliceName}/reloadCommonPayees`,
  async () => {
    const payees: PayeeEntity[] = await send('common-payees-get');
    return payees;
  },
);

export const getPayees = createAppAsyncThunk(
  `${sliceName}/getPayees`,
  async () => {
    const payees: PayeeEntity[] = await send('payees-get');
    return payees;
  },
  {
    condition: (_, { getState }) => {
      const { queries } = getState();
      return (
        !queries.isPayeesLoading &&
        (queries.isPayeesDirty || !queries.isPayeesLoaded)
      );
    },
  },
);

export const reloadPayees = createAppAsyncThunk(
  `${sliceName}/reloadPayees`,
  async () => {
    const payees: PayeeEntity[] = await send('payees-get');
    return payees;
  },
);

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
        !queries.isTagsLoading &&
        (queries.isTagsDirty || !queries.isTagsLoaded)
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
    const id = await send('tags-find');
    return id;
  },
);

// Budget actions

type ApplyBudgetActionPayload =
  | {
      type: 'budget-amount';
      month: string;
      args: {
        category: CategoryEntity['id'];
        amount: number;
      };
    }
  | {
      type: 'copy-last';
      month: string;
      args: never;
    }
  | {
      type: 'set-zero';
      month: string;
      args: never;
    }
  | {
      type: 'set-3-avg';
      month: string;
      args: never;
    }
  | {
      type: 'set-6-avg';
      month: string;
      args: never;
    }
  | {
      type: 'set-12-avg';
      month: string;
      args: never;
    }
  | {
      type: 'check-templates';
      month: never;
      args: never;
    }
  | {
      type: 'apply-goal-template';
      month: string;
      args: never;
    }
  | {
      type: 'overwrite-goal-template';
      month: string;
      args: never;
    }
  | {
      type: 'cleanup-goal-template';
      month: string;
      args: never;
    }
  | {
      type: 'hold';
      month: string;
      args: {
        amount: number;
      };
    }
  | {
      type: 'reset-hold';
      month: string;
      args: never;
    }
  | {
      type: 'cover-overspending';
      month: string;
      args: {
        to: CategoryEntity['id'];
        from: CategoryEntity['id'];
      };
    }
  | {
      type: 'transfer-available';
      month: string;
      args: {
        amount: number;
        category: CategoryEntity['id'];
      };
    }
  | {
      type: 'cover-overbudgeted';
      month: string;
      args: {
        category: CategoryEntity['id'];
      };
    }
  | {
      type: 'transfer-category';
      month: string;
      args: {
        amount: number;
        from: CategoryEntity['id'];
        to: CategoryEntity['id'];
      };
    }
  | {
      type: 'carryover';
      month: string;
      args: {
        category: CategoryEntity['id'];
        flag: boolean;
      };
    }
  | {
      type: 'reset-income-carryover';
      month: string;
      args: never;
    }
  | {
      type: 'apply-single-category-template';
      month: string;
      args: {
        category: CategoryEntity['id'];
      };
    }
  | {
      type: 'apply-multiple-templates';
      month: string;
      args: {
        categories: Array<CategoryEntity['id']>;
      };
    }
  | {
      type: 'set-single-3-avg';
      month: string;
      args: {
        category: CategoryEntity['id'];
      };
    }
  | {
      type: 'set-single-6-avg';
      month: string;
      args: {
        category: CategoryEntity['id'];
      };
    }
  | {
      type: 'set-single-12-avg';
      month: string;
      args: {
        category: CategoryEntity['id'];
      };
    }
  | {
      type: 'copy-single-last';
      month: string;
      args: {
        category: CategoryEntity['id'];
      };
    };

export const applyBudgetAction = createAppAsyncThunk(
  `${sliceName}/applyBudgetAction`,
  async ({ month, type, args }: ApplyBudgetActionPayload, { dispatch }) => {
    switch (type) {
      case 'budget-amount':
        await send('budget/budget-amount', {
          month,
          category: args.category,
          amount: args.amount,
        });
        break;
      case 'copy-last':
        await send('budget/copy-previous-month', { month });
        break;
      case 'set-zero':
        await send('budget/set-zero', { month });
        break;
      case 'set-3-avg':
        await send('budget/set-3month-avg', { month });
        break;
      case 'set-6-avg':
        await send('budget/set-6month-avg', { month });
        break;
      case 'set-12-avg':
        await send('budget/set-12month-avg', { month });
        break;
      case 'check-templates':
        dispatch(
          addNotification({
            notification: await send('budget/check-templates'),
          }),
        );
        break;
      case 'apply-goal-template':
        dispatch(
          addNotification({
            notification: await send('budget/apply-goal-template', { month }),
          }),
        );
        break;
      case 'overwrite-goal-template':
        dispatch(
          addNotification({
            notification: await send('budget/overwrite-goal-template', {
              month,
            }),
          }),
        );
        break;
      case 'apply-single-category-template':
        dispatch(
          addNotification({
            notification: await send('budget/apply-single-template', {
              month,
              category: args.category,
            }),
          }),
        );
        break;
      case 'cleanup-goal-template':
        dispatch(
          addNotification({
            notification: await send('budget/cleanup-goal-template', { month }),
          }),
        );
        break;
      case 'hold':
        await send('budget/hold-for-next-month', {
          month,
          amount: args.amount,
        });
        break;
      case 'reset-hold':
        await send('budget/reset-hold', { month });
        break;
      case 'cover-overspending':
        await send('budget/cover-overspending', {
          month,
          to: args.to,
          from: args.from,
        });
        break;
      case 'transfer-available':
        await send('budget/transfer-available', {
          month,
          amount: args.amount,
          category: args.category,
        });
        break;
      case 'cover-overbudgeted':
        await send('budget/cover-overbudgeted', {
          month,
          category: args.category,
        });
        break;
      case 'transfer-category':
        await send('budget/transfer-category', {
          month,
          amount: args.amount,
          from: args.from,
          to: args.to,
        });
        break;
      case 'carryover': {
        await send('budget/set-carryover', {
          startMonth: month,
          category: args.category,
          flag: args.flag,
        });
        break;
      }
      case 'reset-income-carryover':
        await send('budget/reset-income-carryover', { month });
        break;
      case 'apply-multiple-templates':
        dispatch(
          addNotification({
            notification: await send('budget/apply-multiple-templates', {
              month,
              categoryIds: args.categories,
            }),
          }),
        );
        break;
      case 'set-single-3-avg':
        await send('budget/set-n-month-avg', {
          month,
          N: 3,
          category: args.category,
        });
        break;
      case 'set-single-6-avg':
        await send('budget/set-n-month-avg', {
          month,
          N: 6,
          category: args.category,
        });
        break;
      case 'set-single-12-avg':
        await send('budget/set-n-month-avg', {
          month,
          N: 12,
          category: args.category,
        });
        break;
      case 'copy-single-last':
        await send('budget/copy-single-month', {
          month,
          category: args.category,
        });
        break;
      default:
        console.log(`Invalid action type: ${type}`);
    }
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
        updatedAccounts: added.length > 0 ? [accountId] : [],
      }),
    );

    return added.length > 0 || updated.length > 0;
  },
);

// Helper functions

export const getActivePayees = memoizeOne(
  (payees: PayeeEntity[], accounts: AccountEntity[]) => {
    const accountsById = getAccountsById(accounts);

    return payees.filter(payee => {
      if (payee.transfer_acct) {
        const account = accountsById[payee.transfer_acct];
        return account != null && !account.closed;
      }
      return true;
    });
  },
);

export const getAccountsById = memoizeOne(
  (accounts: AccountEntity[] | null | undefined) => groupById(accounts),
);
export const getPayeesById = memoizeOne(
  (payees: PayeeEntity[] | null | undefined) => groupById(payees),
);
export const getCategoriesById = memoizeOne(
  (categoryGroups: CategoryGroupEntity[] | null | undefined) => {
    const res: { [id: CategoryGroupEntity['id']]: CategoryEntity } = {};
    categoryGroups?.forEach(group => {
      group.categories.forEach(cat => {
        res[cat.id] = cat;
      });
    });
    return res;
  },
);

// Slice exports

export const { name, reducer, getInitialState } = queriesSlice;
export const actions = {
  ...queriesSlice.actions,
  updateAccount,
  getAccounts,
  reloadAccounts,
  closeAccount,
  reopenAccount,
  getCategories,
  createPayee,
  getCommonPayees,
  getPayees,
  importPreviewTransactions,
  importTransactions,
  applyBudgetAction,
  createAccount,
  createCategoryGroup,
  updateCategoryGroup,
  deleteCategoryGroup,
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategory,
  moveCategoryGroup,
  getTags,
};

export const {
  markAccountRead,
  markAccountsDirty,
  markCategoriesDirty,
  markPayeesDirty,
  markTagsDirty,
  setLastTransaction,
  updateNewTransactions,
  setNewTransactions,
} = actions;

function _loadAccounts(
  state: QueriesState,
  accounts: QueriesState['accounts'],
) {
  state.accounts = accounts;
  state.isAccountsLoading = false;
  state.isAccountsLoaded = true;
  state.isAccountsDirty = false;
}

function _markAccountsDirty(state: QueriesState) {
  state.isAccountsDirty = true;
}

function _loadCategories(
  state: QueriesState,
  categories: QueriesState['categories'],
) {
  state.categories = categories;
  state.isCategoriesLoading = false;
  state.isCategoriesLoaded = true;
  state.isCategoriesDirty = false;
}

function _markCategoriesDirty(state: QueriesState) {
  state.isCategoriesDirty = true;
}

function _loadCommonPayees(
  state: QueriesState,
  commonPayees: QueriesState['commonPayees'],
) {
  state.commonPayees = commonPayees;
  state.isCommonPayeesLoading = false;
  state.isCommonPayeesLoaded = true;
  state.isCommonPayeesDirty = false;
}

function _loadPayees(state: QueriesState, payees: QueriesState['payees']) {
  state.payees = payees;
  state.isPayeesLoading = false;
  state.isPayeesLoaded = true;
  state.isPayeesDirty = false;
}

function _markPayeesDirty(state: QueriesState) {
  state.isCommonPayeesDirty = true;
  state.isPayeesDirty = true;
}

function _loadTags(state: QueriesState, tags: QueriesState['tags']) {
  state.tags = tags;
  state.isTagsLoading = false;
  state.isTagsLoaded = true;
  state.isTagsDirty = false;
}

function _markTagsDirty(state: QueriesState) {
  state.isTagsDirty = true;
}
