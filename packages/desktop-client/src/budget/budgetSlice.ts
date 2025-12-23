import { createSlice } from '@reduxjs/toolkit';
import { t } from 'i18next';
import memoizeOne from 'memoize-one';

import { send } from 'loot-core/platform/client/fetch';
import { type IntegerAmount } from 'loot-core/shared/util';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { resetApp } from '@desktop-client/app/appSlice';
import {
  addGenericErrorNotification,
  addNotification,
} from '@desktop-client/notifications/notificationsSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';

const sliceName = 'budget';

type CategoryViews = {
  grouped: CategoryGroupEntity[];
  list: CategoryEntity[];
};

type BudgetState = {
  categories: CategoryViews;
  isCategoriesLoading: boolean;
  isCategoriesLoaded: boolean;
  isCategoriesDirty: boolean;
};

const initialState: BudgetState = {
  categories: {
    grouped: [],
    list: [],
  },
  isCategoriesLoading: false,
  isCategoriesLoaded: false,
  isCategoriesDirty: false,
};

const budgetSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    markCategoriesDirty(state) {
      _markCategoriesDirty(state);
    },
  },
  extraReducers: builder => {
    builder.addCase(resetApp, () => initialState);

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
  },
});

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
  transferId?: CategoryGroupEntity['id'] | null;
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
  transferId?: CategoryEntity['id'] | null;
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

function translateCategories(
  categories: CategoryEntity[] | undefined,
): CategoryEntity[] | undefined {
  return categories?.map(cat => ({
    ...cat,
    name:
      cat.name?.toLowerCase() === 'starting balances'
        ? t('Starting Balances')
        : cat.name,
  }));
}

export const getCategories = createAppAsyncThunk(
  `${sliceName}/getCategories`,
  async () => {
    const categories: CategoryViews = await send('get-categories');
    categories.list = translateCategories(categories.list) as CategoryEntity[];
    categories.grouped.forEach(group => {
      group.categories = translateCategories(
        group.categories,
      ) as CategoryEntity[];
    });
    return categories;
  },
  {
    condition: (_, { getState }) => {
      const { budget } = getState();
      return (
        !budget.isCategoriesLoading &&
        (budget.isCategoriesDirty || !budget.isCategoriesLoaded)
      );
    },
  },
);

export const reloadCategories = createAppAsyncThunk(
  `${sliceName}/reloadCategories`,
  async () => {
    const categories: CategoryViews = await send('get-categories');
    categories.list = translateCategories(categories.list) as CategoryEntity[];
    categories.grouped.forEach(group => {
      group.categories = translateCategories(
        group.categories,
      ) as CategoryEntity[];
    });
    return categories;
  },
);

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
        amount?: IntegerAmount;
        currencyCode: string;
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
        amount?: IntegerAmount;
        currencyCode: string;
      };
    }
  | {
      type: 'transfer-category';
      month: string;
      args: {
        amount: number;
        from: CategoryEntity['id'];
        to: CategoryEntity['id'];
        currencyCode: string;
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
          amount: args.amount,
          currencyCode: args.currencyCode,
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
          amount: args.amount,
          currencyCode: args.currencyCode,
        });
        break;
      case 'transfer-category':
        await send('budget/transfer-category', {
          month,
          amount: args.amount,
          from: args.from,
          to: args.to,
          currencyCode: args.currencyCode,
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

export const getCategoriesById = memoizeOne(
  (categoryGroups: CategoryGroupEntity[] | null | undefined) => {
    const res: { [id: CategoryEntity['id']]: CategoryEntity } = {};
    categoryGroups?.forEach(group => {
      group.categories?.forEach(cat => {
        res[cat.id] = cat;
      });
    });

    return res;
  },
);

export const { name, reducer, getInitialState } = budgetSlice;

export const actions = {
  ...budgetSlice.actions,
  applyBudgetAction,
  getCategories,
  reloadCategories,
  createCategoryGroup,
  updateCategoryGroup,
  deleteCategoryGroup,
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategory,
  moveCategoryGroup,
};

export const { markCategoriesDirty } = budgetSlice.actions;

function _loadCategories(
  state: BudgetState,
  categories: BudgetState['categories'],
) {
  state.categories = categories;
  categories.list = translateCategories(categories.list) as CategoryEntity[];
  categories.grouped.forEach(group => {
    group.categories = translateCategories(
      group.categories,
    ) as CategoryEntity[];
  });
  state.isCategoriesLoading = false;
  state.isCategoriesLoaded = true;
  state.isCategoriesDirty = false;
}

function _markCategoriesDirty(state: BudgetState) {
  state.isCategoriesDirty = true;
}
