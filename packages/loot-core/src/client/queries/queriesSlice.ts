// @ts-strict-ignore
import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { t } from 'i18next';
import memoizeOne from 'memoize-one';

import { send } from '../../platform/client/fetch';
import { groupById } from '../../shared/util';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
  type TransactionEntity,
  type AccountEntity,
  type PayeeEntity,
} from '../../types/models';
import { addGenericErrorNotification, addNotification } from '../actions';
import { type AppDispatch, type RootState } from '../store';

const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
}>();

type Categories = {
  grouped: CategoryGroupEntity[];
  list: CategoryEntity[];
};

type QueriesState = {
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
  lastTransaction: TransactionEntity | null;
  updatedAccounts: Array<AccountEntity['id']>;
  accounts: AccountEntity[];
  accountsLoaded: boolean;
  categories: Categories;
  categoriesLoaded: boolean;
  commonPayeesLoaded: boolean;
  commonPayees: PayeeEntity[];
  payees: PayeeEntity[];
  payeesLoaded: boolean;
};

const initialState: QueriesState = {
  newTransactions: [],
  matchedTransactions: [],
  lastTransaction: null,
  updatedAccounts: [],
  accounts: [],
  accountsLoaded: false,
  categories: {
    grouped: [],
    list: [],
  },
  categoriesLoaded: false,
  commonPayees: [],
  commonPayeesLoaded: false,
  payees: [],
  payeesLoaded: false,
};

type MarkAccountReadAction = PayloadAction<{
  accountId: AccountEntity['id'];
}>;

// Account actions

type CreateAccountArgs = {
  name: AccountEntity['name'];
  balance: AccountEntity['balance_current'];
  offBudget: boolean;
};

export const createAccount = createAppAsyncThunk(
  'queries/createAccount',
  async ({ name, balance, offBudget }: CreateAccountArgs, thunkApi) => {
    const id: AccountEntity['id'] = await send('account-create', {
      name,
      balance,
      offBudget,
    });
    await thunkApi.dispatch(getAccounts());
    await thunkApi.dispatch(getPayees());
    return id;
  },
);

type CloseAccountArgs = {
  accountId: AccountEntity['id'];
  transferAccountId?: AccountEntity['id'];
  categoryId?: CategoryEntity['id'];
  forced?: boolean;
};

export const closeAccount = createAppAsyncThunk(
  'queries/closeAccount',
  async (
    { accountId, transferAccountId, categoryId, forced }: CloseAccountArgs,
    thunkApi,
  ) => {
    await send('account-close', {
      id: accountId,
      transferAccountId: transferAccountId || null,
      categoryId: categoryId || null,
      forced,
    });
    thunkApi.dispatch(getAccounts());
  },
);

type ReopenAccountArgs = {
  accountId: AccountEntity['id'];
};

export const reopenAccount = createAppAsyncThunk(
  'queries/reopenAccount',
  async ({ accountId }: ReopenAccountArgs, thunkApi) => {
    await send('account-reopen', { id: accountId });
    thunkApi.dispatch(getAccounts());
  },
);

type UpdateAccountArgs = {
  account: AccountEntity;
};

export const updateAccount = createAppAsyncThunk(
  'queries/updateAccount',
  async ({ account }: UpdateAccountArgs) => {
    await send('account-update', account);
    return account;
  },
);

export const getAccounts = createAppAsyncThunk(
  'queries/getAccounts',
  async () => {
    const accounts: AccountEntity[] = await send('accounts-get');
    return accounts;
  },
);

// Category actions

type CreateGroupArgs = {
  name: CategoryGroupEntity['name'];
};

export const createGroup = createAppAsyncThunk(
  'queries/createGroup',
  async ({ name }: CreateGroupArgs, thunkApi) => {
    const id = await send('category-group-create', { name });
    thunkApi.dispatch(getCategories());
    return id;
  },
);

type UpdateGroupArgs = {
  group: CategoryGroupEntity;
};

export const updateGroup = createAppAsyncThunk(
  'queries/updateGroup',
  async ({ group }: UpdateGroupArgs, thunkApi) => {
    // Strip off the categories field if it exist. It's not a real db
    // field but groups have this extra field in the client most of the time
    const { categories: _, ...groupNoCategories } = group;
    await send('category-group-update', groupNoCategories);
    await thunkApi.dispatch(getCategories());
  },
);

type DeleteGroupArgs = {
  id: CategoryGroupEntity['id'];
  transferId?: CategoryGroupEntity['id'];
};

export const deleteGroup = createAppAsyncThunk(
  'queries/deleteGroup',
  async ({ id, transferId }: DeleteGroupArgs, thunkApi) => {
    await send('category-group-delete', { id, transferId });
    await thunkApi.dispatch(getCategories());
    // See `deleteCategory` for why we need this
    await thunkApi.dispatch(getPayees());
  },
);

type CreateCategoryArgs = {
  name: CategoryEntity['name'];
  groupId: CategoryGroupEntity['id'];
  isIncome: boolean;
  isHidden: boolean;
};
export const createCategory = createAppAsyncThunk(
  'queries/createCategory',
  async (
    { name, groupId, isIncome, isHidden }: CreateCategoryArgs,
    thunkApi,
  ) => {
    const id = await send('category-create', {
      name,
      groupId,
      isIncome,
      hidden: isHidden,
    });
    thunkApi.dispatch(getCategories());
    return id;
  },
);

type UpdateCategoryArgs = {
  category: CategoryEntity;
};

export const updateCategory = createAppAsyncThunk(
  'queries/updateCategory',
  async ({ category }: UpdateCategoryArgs, thunkApi) => {
    await send('category-update', category);
    thunkApi.dispatch(getCategories());
  },
);

type DeleteCategoryArgs = {
  id: CategoryEntity['id'];
  transferId?: CategoryEntity['id'];
};

export const deleteCategory = createAppAsyncThunk(
  'queries/deleteCategory',
  async ({ id, transferId }: DeleteCategoryArgs, thunkApi) => {
    const { error } = await send('category-delete', { id, transferId });

    if (error) {
      switch (error) {
        case 'category-type':
          thunkApi.dispatch(
            addNotification({
              type: 'error',
              message: t(
                'A category must be transferred to another of the same type (expense or income)',
              ),
            }),
          );
          break;
        default:
          thunkApi.dispatch(addGenericErrorNotification());
      }

      throw new Error(error);
    } else {
      thunkApi.dispatch(getCategories());
      // Also need to refresh payees because they might use one of the
      // deleted categories as the default category
      thunkApi.dispatch(getPayees());
    }
  },
);

type MoveCategoryArgs = {
  id: CategoryEntity['id'];
  groupId: CategoryGroupEntity['id'];
  targetId: CategoryEntity['id'];
};

export const moveCategory = createAppAsyncThunk(
  'queries/moveCategory',
  async ({ id, groupId, targetId }: MoveCategoryArgs, thunkApi) => {
    await send('category-move', { id, groupId, targetId });
    await thunkApi.dispatch(getCategories());
  },
);

type MoveCategoryGroupArgs = {
  id: CategoryGroupEntity['id'];
  targetId: CategoryGroupEntity['id'];
};

export const moveCategoryGroup = createAppAsyncThunk(
  'queries/moveCategoryGroup',
  async ({ id, targetId }: MoveCategoryGroupArgs, thunkApi) => {
    await send('category-group-move', { id, targetId });
    await thunkApi.dispatch(getCategories());
  },
);

export const getCategories = createAppAsyncThunk(
  'queries/getCategories',
  async () => {
    const categories: Categories = await send('get-categories');
    return categories;
  },
);

// Payee actions

type CreatePayeeArgs = {
  name: PayeeEntity['name'];
};

export const createPayee = createAppAsyncThunk(
  'queries/createPayee',
  async ({ name }: CreatePayeeArgs, thunkApi) => {
    const id: PayeeEntity['id'] = await send('payee-create', {
      name: name.trim(),
    });
    thunkApi.dispatch(getPayees());
    return id;
  },
);

export const initiallyLoadPayees = createAppAsyncThunk(
  'queries/initiallyLoadPayees',
  async (_, thunkApi) => {
    const queriesState = thunkApi.getState().queries;
    if (queriesState.payees.length === 0) {
      return thunkApi.dispatch(getPayees());
    }
  },
);

export const getCommonPayees = createAppAsyncThunk(
  'queries/getCommonPayees',
  async () => {
    const payees: PayeeEntity[] = await send('common-payees-get');
    return payees;
  },
);

export const getPayees = createAppAsyncThunk('queries/getPayees', async () => {
  const payees: PayeeEntity[] = await send('payees-get');
  return payees;
});

// Budget actions

type ApplyBudgetActionArgs =
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
  'queries/applyBudgetAction',
  async ({ month, type, args }: ApplyBudgetActionArgs, thunkApi) => {
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
        thunkApi.dispatch(
          addNotification(await send('budget/check-templates')),
        );
        break;
      case 'apply-goal-template':
        thunkApi.dispatch(
          addNotification(await send('budget/apply-goal-template', { month })),
        );
        break;
      case 'overwrite-goal-template':
        thunkApi.dispatch(
          addNotification(
            await send('budget/overwrite-goal-template', { month }),
          ),
        );
        break;
      case 'cleanup-goal-template':
        thunkApi.dispatch(
          addNotification(
            await send('budget/cleanup-goal-template', { month }),
          ),
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
      case 'apply-single-category-template':
        await send('budget/apply-single-template', {
          month,
          category: args.category,
        });
        break;
      case 'apply-multiple-templates':
        thunkApi.dispatch(
          addNotification(
            await send('budget/apply-multiple-templates', {
              month,
              categoryIds: args.categories,
            }),
          ),
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

type ImportPreviewTransactionsArgs = {
  id: string;
  transactions: TransactionEntity[];
};

export const importPreviewTransactions = createAppAsyncThunk(
  'queries/importPreviewTransactions',
  async ({ id, transactions }: ImportPreviewTransactionsArgs, thunkApi) => {
    const { errors = [], updatedPreview } = await send('transactions-import', {
      accountId: id,
      transactions,
      isPreview: true,
    });

    errors.forEach(error => {
      thunkApi.dispatch(
        addNotification({
          type: 'error',
          message: error.message,
        }),
      );
    });

    return updatedPreview;
  },
);

type ImportTransactionsArgs = {
  id: string;
  transactions: TransactionEntity[];
  reconcile: boolean;
};

export const importTransactions = createAppAsyncThunk(
  'queries/importTransactions',
  async ({ id, transactions, reconcile }: ImportTransactionsArgs, thunkApi) => {
    if (!reconcile) {
      await send('api/transactions-add', {
        accountId: id,
        transactions,
      });

      return true;
    }

    const {
      errors = [],
      added,
      updated,
    } = await send('transactions-import', {
      accountId: id,
      transactions,
      isPreview: false,
    });

    errors.forEach(error => {
      thunkApi.dispatch(
        addNotification({
          type: 'error',
          message: error.message,
        }),
      );
    });

    const { setNewTransactions } = queriesSlice.actions;

    thunkApi.dispatch(
      setNewTransactions({
        newTransactions: added,
        matchedTransactions: updated,
        updatedAccounts: added.length > 0 ? [id] : [],
      }),
    );

    return added.length > 0 || updated.length > 0;
  },
);

type SetNewTransactionsAction = PayloadAction<{
  newTransactions: QueriesState['newTransactions'];
  matchedTransactions: QueriesState['matchedTransactions'];
  updatedAccounts: QueriesState['updatedAccounts'];
}>;
type UpdateNewTransactionsAction = PayloadAction<{
  id: TransactionEntity['id'];
}>;
type SetLastTransactionAction = PayloadAction<{
  transaction: TransactionEntity;
}>;

const queriesSlice = createSlice({
  name: 'queries',
  initialState,
  reducers: {
    setNewTransactions(state, action: SetNewTransactionsAction) {
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
    updateNewTransactions(state, action: UpdateNewTransactionsAction) {
      state.newTransactions = state.newTransactions.filter(
        id => id !== action.payload.id,
      );
      state.matchedTransactions = state.matchedTransactions.filter(
        id => id !== action.payload.id,
      );
    },
    setLastTransaction(state, action: SetLastTransactionAction) {
      state.lastTransaction = action.payload.transaction;
    },
    markAccountRead(state, action: MarkAccountReadAction) {
      state.updatedAccounts = state.updatedAccounts.filter(
        id => id !== action.payload.accountId,
      );
    },
  },
  extraReducers: builder => {
    // Accounts
    builder.addCase(updateAccount.fulfilled, (state, action) => {
      const payloadAccount = action.payload;
      state.accounts = state.accounts.map(account => {
        if (account.id === payloadAccount.id) {
          return { ...account, ...payloadAccount };
        }
        return account;
      });
    });

    builder.addCase(getAccounts.fulfilled, (state, action) => {
      state.accounts = action.payload;
      state.accountsLoaded = true;
    });

    // Categories

    builder.addCase(getCategories.fulfilled, (state, action) => {
      state.categories = action.payload;
      state.categoriesLoaded = true;
    });

    // Payees

    builder.addCase(getCommonPayees.fulfilled, (state, action) => {
      state.commonPayees = action.payload;
      state.commonPayeesLoaded = true;
    });

    builder.addCase(getPayees.fulfilled, (state, action) => {
      state.payees = action.payload;
      state.payeesLoaded = true;
    });
  },
});

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

export const getAccountsById = memoizeOne((accounts: AccountEntity[]) =>
  groupById(accounts),
);
export const getPayeesById = memoizeOne((payees: PayeeEntity[]) =>
  groupById(payees),
);
export const getCategoriesById = memoizeOne(categoryGroups => {
  const res = {};
  categoryGroups.forEach(group => {
    group.categories.forEach(cat => {
      res[cat.id] = cat;
    });
  });
  return res;
});

// Slice exports

export const { name, reducer, getInitialState } = queriesSlice;
export const actions = {
  ...queriesSlice.actions,
  updateAccount,
  getAccounts,
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
  createGroup,
  updateGroup,
  deleteGroup,
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategory,
  moveCategoryGroup,
  initiallyLoadPayees,
};

export const {
  markAccountRead,
  setLastTransaction,
  updateNewTransactions,
  setNewTransactions,
} = actions;
