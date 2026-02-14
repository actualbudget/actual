import { useTranslation } from 'react-i18next';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { v4 as uuidv4 } from 'uuid';

import { sendCatch } from 'loot-core/platform/client/connection';
import type { send } from 'loot-core/platform/client/connection';
import type { IntegerAmount } from 'loot-core/shared/util';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from 'loot-core/types/models';

import { categoryQueries } from './queries';

import { pushModal } from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';
import type { AppDispatch } from '@desktop-client/redux/store';

const sendThrow: typeof send = async (name, args) => {
  const { error, data } = await sendCatch(name, args);
  if (error) {
    throw error;
  }
  return data;
};

function invalidateQueries(queryClient: QueryClient, queryKey?: QueryKey) {
  queryClient.invalidateQueries({
    queryKey: queryKey ?? categoryQueries.lists(),
  });
}

function dispatchErrorNotification(
  dispatch: AppDispatch,
  message: string,
  error?: Error,
) {
  dispatch(
    addNotification({
      notification: {
        id: uuidv4(),
        type: 'error',
        message,
        pre: error ? error.message : undefined,
      },
    }),
  );
}

function dispatchCategoryNameAlreadyExistsNotification(
  dispatch: AppDispatch,
  t: TFunction,
  name: CategoryEntity['name'],
) {
  dispatch(
    addNotification({
      notification: {
        type: 'error',
        message: t(
          'Category "{{name}}" already exists in group (it may be hidden)',
          { name },
        ),
      },
    }),
  );
}

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

  return useMutation({
    mutationFn: async ({
      name,
      groupId,
      isIncome,
      isHidden,
    }: CreateCategoryPayload) => {
      const id = await sendThrow('category-create', {
        name,
        groupId,
        isIncome,
        hidden: isHidden,
      });
      return id;
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error creating category:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error creating the category. Please try again.'),
        error,
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

  return useMutation({
    mutationFn: async ({ category }: UpdateCategoryPayload) => {
      await sendThrow('category-update', category);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error updating category:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error updating the category. Please try again.'),
        error,
      );
      throw error;
    },
  });
}

type SaveCategoryPayload = {
  category: CategoryEntity;
};

export function useSaveCategoryMutation() {
  const createCategory = useCreateCategoryMutation();
  const updateCategory = useUpdateCategoryMutation();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ category }: SaveCategoryPayload) => {
      const { grouped: categoryGroups = [] } =
        await queryClient.ensureQueryData(categoryQueries.list());

      const group = categoryGroups.find(g => g.id === category.group);
      const categoriesInGroup = group?.categories ?? [];
      const exists = categoriesInGroup.some(
        c =>
          c.id !== category.id &&
          c.name.toUpperCase() === category.name.toUpperCase(),
      );

      if (exists) {
        dispatchCategoryNameAlreadyExistsNotification(
          dispatch,
          t,
          category.name,
        );
        return;
      }

      if (category.id === 'new') {
        await createCategory.mutateAsync({
          name: category.name,
          groupId: category.group,
          isIncome: !!category.is_income,
          isHidden: !!category.hidden,
        });
      } else {
        await updateCategory.mutateAsync({ category });
      }
    },
  });
}

type DeleteCategoryPayload = {
  id: CategoryEntity['id'];
};

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const deleteCategory = async ({
    id,
    transferId,
  }: {
    id: CategoryEntity['id'];
    transferId?: CategoryEntity['id'];
  }) => {
    await sendThrow('category-delete', { id, transferId });
  };

  return useMutation({
    mutationFn: async ({ id }: DeleteCategoryPayload) => {
      const mustTransfer = await sendThrow('must-category-transfer', { id });

      if (mustTransfer) {
        dispatch(
          pushModal({
            modal: {
              name: 'confirm-category-delete',
              options: {
                category: id,
                onDelete: async transferCategory => {
                  if (id !== transferCategory) {
                    await deleteCategory({ id, transferId: transferCategory });
                  }
                },
              },
            },
          }),
        );
      } else {
        await deleteCategory({ id });
      }
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error deleting category:', error);

      if (error) {
        switch (error.cause) {
          case 'category-type':
            dispatchErrorNotification(
              dispatch,
              t(
                'A category must be transferred to another of the same type (expense or income)',
              ),
              error,
            );
            break;
          default:
            dispatchErrorNotification(
              dispatch,
              t('There was an error deleting the category. Please try again.'),
              error,
            );
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

  return useMutation({
    mutationFn: async ({ id, groupId, targetId }: MoveCategoryPayload) => {
      await sendThrow('category-move', { id, groupId, targetId });
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error moving category:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error moving the category. Please try again.'),
        error,
      );
      throw error;
    },
  });
}

type ReoderCategoryPayload = {
  id: CategoryEntity['id'];
  groupId: CategoryGroupEntity['id'];
  targetId: CategoryEntity['id'] | null;
};

export function useReorderCategoryMutation() {
  const moveCategory = useMoveCategoryMutation();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, groupId, targetId }: ReoderCategoryPayload) => {
      const { grouped: categoryGroups = [], list: categories = [] } =
        await queryClient.ensureQueryData(categoryQueries.list());

      const moveCandidate = categories.filter(c => c.id === id)[0];
      const group = categoryGroups.find(g => g.id === groupId);
      const categoriesInGroup = group?.categories ?? [];
      const exists = categoriesInGroup.some(
        c =>
          c.id !== moveCandidate.id &&
          c.name.toUpperCase() === moveCandidate.name.toUpperCase(),
      );

      if (exists) {
        dispatchCategoryNameAlreadyExistsNotification(
          dispatch,
          t,
          moveCandidate.name,
        );
        return;
      }

      await moveCategory.mutateAsync({ id, groupId, targetId });
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

  return useMutation({
    mutationFn: async ({ name }: CreateCategoryGroupPayload) => {
      const id = await sendThrow('category-group-create', { name });
      return id;
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error creating category group:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error creating the category group. Please try again.'),
        error,
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
  return useMutation({
    mutationFn: async ({ group }: UpdateCategoryGroupPayload) => {
      const { grouped: categoryGroups } = await queryClient.ensureQueryData(
        categoryQueries.list(),
      );

      const exists = categoryGroups.some(
        g =>
          g.id !== group.id &&
          g.name.toUpperCase() === group.name.toUpperCase(),
      );

      if (exists) {
        dispatchErrorNotification(
          dispatch,
          t('A category group with name "{{name}}" already exists.', {
            name: group.name,
          }),
        );
        return;
      }

      // Strip off the categories field if it exist. It's not a real db
      // field but groups have this extra field in the client most of the time
      const { categories: _, ...groupNoCategories } = group;
      await sendThrow('category-group-update', groupNoCategories);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error updating category group:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error updating the category group. Please try again.'),
        error,
      );
      throw error;
    },
  });
}

type SaveCategoryGroupPayload = {
  group: CategoryGroupEntity;
};

export function useSaveCategoryGroupMutation() {
  const createCategoryGroup = useCreateCategoryGroupMutation();
  const updateCategoryGroup = useUpdateCategoryGroupMutation();

  return useMutation({
    mutationFn: async ({ group }: SaveCategoryGroupPayload) => {
      if (group.id === 'new') {
        await createCategoryGroup.mutateAsync({ name: group.name });
      } else {
        await updateCategoryGroup.mutateAsync({ group });
      }
    },
  });
}

type DeleteCategoryGroupPayload = {
  id: CategoryGroupEntity['id'];
};

export function useDeleteCategoryGroupMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id }: DeleteCategoryGroupPayload) => {
      const { grouped: categoryGroups } = await queryClient.ensureQueryData(
        categoryQueries.list(),
      );
      const group = categoryGroups.find(g => g.id === id);

      if (!group) {
        return;
      }

      const categories = group.categories ?? [];

      let mustTransfer = false;
      for (const category of categories) {
        if (await sendThrow('must-category-transfer', { id: category.id })) {
          mustTransfer = true;
          break;
        }
      }

      if (mustTransfer) {
        dispatch(
          pushModal({
            modal: {
              name: 'confirm-category-delete',
              options: {
                group: id,
                onDelete: async transferCategory => {
                  await sendThrow('category-group-delete', {
                    id,
                    transferId: transferCategory,
                  });
                },
              },
            },
          }),
        );
      } else {
        await sendThrow('category-group-delete', { id });
      }
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error deleting category group:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error deleting the category group. Please try again.'),
        error,
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

  return useMutation({
    mutationFn: async ({ id, targetId }: MoveCategoryGroupPayload) => {
      await sendThrow('category-group-move', { id, targetId });
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error moving category group:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error moving the category group. Please try again.'),
        error,
      );
      throw error;
    },
  });
}

type ReorderCategoryGroupPayload = {
  id: CategoryGroupEntity['id'];
  targetId: CategoryGroupEntity['id'] | null;
};

export function useReorderCategoryGroupMutation() {
  const moveCategoryGroup = useMoveCategoryGroupMutation();

  return useMutation({
    mutationFn: async (sortInfo: ReorderCategoryGroupPayload) => {
      await moveCategoryGroup.mutateAsync({
        id: sortInfo.id,
        targetId: sortInfo.targetId,
      });
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
          await sendThrow('budget/budget-amount', {
            month,
            category: args.category,
            amount: args.amount,
          });
          return null;
        case 'copy-last':
          await sendThrow('budget/copy-previous-month', { month });
          return null;
        case 'set-zero':
          await sendThrow('budget/set-zero', { month });
          return null;
        case 'set-3-avg':
          await sendThrow('budget/set-3month-avg', { month });
          return null;
        case 'set-6-avg':
          await sendThrow('budget/set-6month-avg', { month });
          return null;
        case 'set-12-avg':
          await sendThrow('budget/set-12month-avg', { month });
          return null;
        case 'check-templates':
          return await sendThrow('budget/check-templates');
        case 'apply-goal-template':
          return await sendThrow('budget/apply-goal-template', { month });
        case 'overwrite-goal-template':
          return await sendThrow('budget/overwrite-goal-template', { month });
        case 'apply-single-category-template':
          return await sendThrow('budget/apply-single-template', {
            month,
            category: args.category,
          });
        case 'cleanup-goal-template':
          return await sendThrow('budget/cleanup-goal-template', { month });
        case 'hold':
          await sendThrow('budget/hold-for-next-month', {
            month,
            amount: args.amount,
          });
          return null;
        case 'reset-hold':
          await sendThrow('budget/reset-hold', { month });
          return null;
        case 'cover-overspending':
          await sendThrow('budget/cover-overspending', {
            month,
            to: args.to,
            from: args.from,
            amount: args.amount,
            currencyCode: args.currencyCode,
          });
          return null;
        case 'transfer-available':
          await sendThrow('budget/transfer-available', {
            month,
            amount: args.amount,
            category: args.category,
          });
          return null;
        case 'cover-overbudgeted':
          await sendThrow('budget/cover-overbudgeted', {
            month,
            category: args.category,
            amount: args.amount,
            currencyCode: args.currencyCode,
          });
          return null;
        case 'transfer-category':
          await sendThrow('budget/transfer-category', {
            month,
            amount: args.amount,
            from: args.from,
            to: args.to,
            currencyCode: args.currencyCode,
          });
          return null;
        case 'carryover': {
          await sendThrow('budget/set-carryover', {
            startMonth: month,
            category: args.category,
            flag: args.flag,
          });
          return null;
        }
        case 'reset-income-carryover':
          await sendThrow('budget/reset-income-carryover', { month });
          return null;
        case 'apply-multiple-templates':
          return await sendThrow('budget/apply-multiple-templates', {
            month,
            categoryIds: args.categories,
          });
        case 'set-single-3-avg':
          await sendThrow('budget/set-n-month-avg', {
            month,
            N: 3,
            category: args.category,
          });
          return null;
        case 'set-single-6-avg':
          await sendThrow('budget/set-n-month-avg', {
            month,
            N: 6,
            category: args.category,
          });
          return null;
        case 'set-single-12-avg':
          await sendThrow('budget/set-n-month-avg', {
            month,
            N: 12,
            category: args.category,
          });
          return null;
        case 'copy-single-last':
          await sendThrow('budget/copy-single-month', {
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
      dispatchErrorNotification(
        dispatch,
        t('There was an error applying the budget action. Please try again.'),
        error,
      );
      throw error;
    },
  });
}
