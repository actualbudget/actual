import { useTranslation } from 'react-i18next';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { send } from 'loot-core/platform/client/fetch';
import { type IntegerAmount } from 'loot-core/shared/util';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { categoryQueries } from '.';

import {
  addGenericErrorNotification,
  addNotification,
} from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

type CreateCategoryPayload = {
  name: CategoryEntity['name'];
  groupId: CategoryGroupEntity['id'];
  isIncome: boolean;
  isHidden: boolean;
};

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const invalidateCategoryLists = () => {
    queryClient.invalidateQueries({
      queryKey: categoryQueries.lists(),
    });
  };

  const dispatchErrorNotification = (message: string) => {
    dispatch(
      addNotification({
        notification: {
          id: uuidv4(),
          type: 'error',
          message,
        },
      }),
    );
  };

  return useMutation({
    mutationFn: async ({
      name,
      groupId,
      isIncome,
      isHidden,
    }: CreateCategoryPayload) => {
      const id = await send('category-create', {
        name,
        groupId,
        isIncome,
        hidden: isHidden,
      });
      return id;
    },
    onSuccess: invalidateCategoryLists,
    onError: error => {
      console.error('Error creating category:', error);
      dispatchErrorNotification(
        t('There was an error creating the category. Please try again.'),
      );
      throw error;
    },
  });
}

type UpdateCategoryPayload = {
  category: CategoryEntity;
};

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const invalidateCategoryLists = () => {
    queryClient.invalidateQueries({
      queryKey: categoryQueries.lists(),
    });
  };

  const dispatchErrorNotification = (message: string) => {
    dispatch(
      addNotification({
        notification: {
          id: uuidv4(),
          type: 'error',
          message,
        },
      }),
    );
  };

  return useMutation({
    mutationFn: async ({ category }: UpdateCategoryPayload) => {
      await send('category-update', category);
    },
    onSuccess: invalidateCategoryLists,
    onError: error => {
      console.error('Error updating category:', error);
      dispatchErrorNotification(
        t('There was an error updating the category. Please try again.'),
      );
      throw error;
    },
  });
}

type DeleteCategoryPayload = {
  id: CategoryEntity['id'];
  transferId?: CategoryEntity['id'] | null;
};

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const invalidateCategoryLists = () => {
    queryClient.invalidateQueries({
      queryKey: categoryQueries.lists(),
    });
  };

  const dispatchErrorNotification = (message: string) => {
    dispatch(
      addNotification({
        notification: {
          id: uuidv4(),
          type: 'error',
          message,
        },
      }),
    );
  };

  return useMutation({
    mutationFn: async ({ id, transferId }: DeleteCategoryPayload) => {
      const { error } = await send('category-delete', { id, transferId });
      if (error) {
        throw new Error(error, { cause: error });
      }
    },
    onSuccess: invalidateCategoryLists,
    onError: error => {
      console.error('Error deleting category:', error);

      if (error) {
        switch (error.cause) {
          case 'category-type':
            dispatchErrorNotification(
              t(
                'A category must be transferred to another of the same type (expense or income)',
              ),
            );
            break;
          default:
            dispatch(addGenericErrorNotification());
        }
      }

      throw error;
    },
  });
}

type MoveCategoryPayload = {
  id: CategoryEntity['id'];
  groupId: CategoryGroupEntity['id'];
  targetId: CategoryEntity['id'] | null;
};

export function useMoveCategoryMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const invalidateCategoryLists = () => {
    queryClient.invalidateQueries({
      queryKey: categoryQueries.lists(),
    });
  };

  const dispatchErrorNotification = (message: string) => {
    dispatch(
      addNotification({
        notification: {
          id: uuidv4(),
          type: 'error',
          message,
        },
      }),
    );
  };

  return useMutation({
    mutationFn: async ({ id, groupId, targetId }: MoveCategoryPayload) => {
      await send('category-move', { id, groupId, targetId });
    },
    onSuccess: invalidateCategoryLists,
    onError: error => {
      console.error('Error moving category:', error);
      dispatchErrorNotification(
        t('There was an error moving the category. Please try again.'),
      );
      throw error;
    },
  });
}

type CreateCategoryGroupPayload = {
  name: CategoryGroupEntity['name'];
};

export function useCreateCategoryGroupMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const invalidateCategoryLists = () => {
    queryClient.invalidateQueries({
      queryKey: categoryQueries.lists(),
    });
  };

  const dispatchErrorNotification = (message: string) => {
    dispatch(
      addNotification({
        notification: {
          id: uuidv4(),
          type: 'error',
          message,
        },
      }),
    );
  };

  return useMutation({
    mutationFn: async ({ name }: CreateCategoryGroupPayload) => {
      const id = await send('category-group-create', { name });
      return id;
    },
    onSuccess: invalidateCategoryLists,
    onError: error => {
      console.error('Error creating category group:', error);
      dispatchErrorNotification(
        t('There was an error creating the category group. Please try again.'),
      );
      throw error;
    },
  });
}

type UpdateCategoryGroupPayload = {
  group: CategoryGroupEntity;
};

export function useUpdateCategoryGroupMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const invalidateCategoryLists = () => {
    queryClient.invalidateQueries({
      queryKey: categoryQueries.lists(),
    });
  };

  const dispatchErrorNotification = (message: string) => {
    dispatch(
      addNotification({
        notification: {
          id: uuidv4(),
          type: 'error',
          message,
        },
      }),
    );
  };

  return useMutation({
    mutationFn: async ({ group }: UpdateCategoryGroupPayload) => {
      const { grouped: categoryGroups } = queryClient.getQueryData(
        categoryQueries.list().queryKey,
      );
      if (
        categoryGroups.find(
          g =>
            g.id !== group.id &&
            g.name.toUpperCase() === group.name.toUpperCase(),
        )
      ) {
        dispatchErrorNotification(
          t('A category group with this name already exists.'),
        );
        return;
      }

      // Strip off the categories field if it exist. It's not a real db
      // field but groups have this extra field in the client most of the time
      const { categories: _, ...groupNoCategories } = group;
      await send('category-group-update', groupNoCategories);
    },
    onSuccess: invalidateCategoryLists,
    onError: error => {
      console.error('Error updating category group:', error);
      dispatchErrorNotification(
        t('There was an error updating the category group. Please try again.'),
      );
      throw error;
    },
  });
}

export function useDeleteCategoryGroupMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const invalidateCategoryLists = () => {
    queryClient.invalidateQueries({
      queryKey: categoryQueries.lists(),
    });
  };

  const dispatchErrorNotification = (message: string) => {
    dispatch(
      addNotification({
        notification: {
          id: uuidv4(),
          type: 'error',
          message,
        },
      }),
    );
  };

  type DeleteCategoryGroupPayload = {
    id: CategoryGroupEntity['id'];
    transferId?: CategoryGroupEntity['id'] | null;
  };

  return useMutation({
    mutationFn: async ({ id, transferId }: DeleteCategoryGroupPayload) => {
      await send('category-group-delete', { id, transferId });
    },
    onSuccess: invalidateCategoryLists,
    onError: error => {
      console.error('Error deleting category group:', error);
      dispatchErrorNotification(
        t('There was an error deleting the category group. Please try again.'),
      );
      throw error;
    },
  });
}

type MoveCategoryGroupPayload = {
  id: CategoryGroupEntity['id'];
  targetId: CategoryGroupEntity['id'] | null;
};

export function useMoveCategoryGroupMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const invalidateCategoryLists = () => {
    queryClient.invalidateQueries({
      queryKey: categoryQueries.lists(),
    });
  };

  const dispatchErrorNotification = (message: string) => {
    dispatch(
      addNotification({
        notification: {
          id: uuidv4(),
          type: 'error',
          message,
        },
      }),
    );
  };

  return useMutation({
    mutationFn: async ({ id, targetId }: MoveCategoryGroupPayload) => {
      await send('category-group-move', { id, targetId });
    },
    onSuccess: invalidateCategoryLists,
    onError: error => {
      console.error('Error moving category group:', error);
      dispatchErrorNotification(
        t('There was an error moving the category group. Please try again.'),
      );
      throw error;
    },
  });
}

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
      args?: never;
    }
  | {
      type: 'set-zero';
      month: string;
      args?: never;
    }
  | {
      type: 'set-3-avg';
      month: string;
      args?: never;
    }
  | {
      type: 'set-6-avg';
      month: string;
      args?: never;
    }
  | {
      type: 'set-12-avg';
      month: string;
      args?: never;
    }
  | {
      type: 'check-templates';
      month?: never;
      args?: never;
    }
  | {
      type: 'apply-goal-template';
      month: string;
      args?: never;
    }
  | {
      type: 'overwrite-goal-template';
      month: string;
      args?: never;
    }
  | {
      type: 'cleanup-goal-template';
      month: string;
      args?: never;
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
      args?: never;
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
      args?: never;
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

export function useBudgetActions() {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ month, type, args }: ApplyBudgetActionPayload) => {
      switch (type) {
        case 'budget-amount':
          await send('budget/budget-amount', {
            month,
            category: args.category,
            amount: args.amount,
          });
          return null;
        case 'copy-last':
          await send('budget/copy-previous-month', { month });
          return null;
        case 'set-zero':
          await send('budget/set-zero', { month });
          return null;
        case 'set-3-avg':
          await send('budget/set-3month-avg', { month });
          return null;
        case 'set-6-avg':
          await send('budget/set-6month-avg', { month });
          return null;
        case 'set-12-avg':
          await send('budget/set-12month-avg', { month });
          return null;
        case 'check-templates':
          return await send('budget/check-templates');
        case 'apply-goal-template':
          return await send('budget/apply-goal-template', { month });
        case 'overwrite-goal-template':
          return await send('budget/overwrite-goal-template', { month });
        case 'apply-single-category-template':
          return await send('budget/apply-single-template', {
            month,
            category: args.category,
          });
        case 'cleanup-goal-template':
          return await send('budget/cleanup-goal-template', { month });
        case 'hold':
          await send('budget/hold-for-next-month', {
            month,
            amount: args.amount,
          });
          return null;
        case 'reset-hold':
          await send('budget/reset-hold', { month });
          return null;
        case 'cover-overspending':
          await send('budget/cover-overspending', {
            month,
            to: args.to,
            from: args.from,
            amount: args.amount,
            currencyCode: args.currencyCode,
          });
          return null;
        case 'transfer-available':
          await send('budget/transfer-available', {
            month,
            amount: args.amount,
            category: args.category,
          });
          return null;
        case 'cover-overbudgeted':
          await send('budget/cover-overbudgeted', {
            month,
            category: args.category,
            amount: args.amount,
            currencyCode: args.currencyCode,
          });
          return null;
        case 'transfer-category':
          await send('budget/transfer-category', {
            month,
            amount: args.amount,
            from: args.from,
            to: args.to,
            currencyCode: args.currencyCode,
          });
          return null;
        case 'carryover': {
          await send('budget/set-carryover', {
            startMonth: month,
            category: args.category,
            flag: args.flag,
          });
          return null;
        }
        case 'reset-income-carryover':
          await send('budget/reset-income-carryover', { month });
          return null;
        case 'apply-multiple-templates':
          return await send('budget/apply-multiple-templates', {
            month,
            categoryIds: args.categories,
          });
        case 'set-single-3-avg':
          await send('budget/set-n-month-avg', {
            month,
            N: 3,
            category: args.category,
          });
          return null;
        case 'set-single-6-avg':
          await send('budget/set-n-month-avg', {
            month,
            N: 6,
            category: args.category,
          });
          return null;
        case 'set-single-12-avg':
          await send('budget/set-n-month-avg', {
            month,
            N: 12,
            category: args.category,
          });
          return null;
        case 'copy-single-last':
          await send('budget/copy-single-month', {
            month,
            category: args.category,
          });
          return null;
        default:
          throw new Error(`Unknown budget action type: ${type}`);
      }
    },
    onSuccess: notification => {
      if (notification) {
        dispatch(
          addNotification({
            notification,
          }),
        );
      }
    },
    onError: error => {
      console.error('Error applying budget action:', error);
      dispatch(
        addNotification({
          notification: {
            id: uuidv4(),
            type: 'error',
            message: t(
              'There was an error applying the budget action. Please try again.',
            ),
          },
        }),
      );
      throw error;
    },
  });
}
