import { useTranslation } from 'react-i18next';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { send } from 'loot-core/platform/client/fetch';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { categoryQueries } from '@desktop-client/budget';
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

type UpdateCategoryPayload = {
  category: CategoryEntity;
};

type DeleteCategoryPayload = {
  id: CategoryEntity['id'];
  transferId?: CategoryEntity['id'] | null;
};

type MoveCategoryPayload = {
  id: CategoryEntity['id'];
  groupId: CategoryGroupEntity['id'];
  targetId: CategoryEntity['id'] | null;
};

type CreateCategoryGroupPayload = {
  name: CategoryGroupEntity['name'];
};

type UpdateCategoryGroupPayload = {
  group: CategoryGroupEntity;
};

type MoveCategoryGroupPayload = {
  id: CategoryGroupEntity['id'];
  targetId: CategoryGroupEntity['id'] | null;
};

type DeleteCategoryGroupPayload = {
  id: CategoryGroupEntity['id'];
  transferId?: CategoryGroupEntity['id'] | null;
};

export function useCategoryMutations() {
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

  const createCategory = useMutation({
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

  const updateCategory = useMutation({
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

  const deleteCategory = useMutation({
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

  const moveCategory = useMutation({
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

  const createCategoryGroup = useMutation({
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

  const updateCategoryGroup = useMutation({
    mutationFn: async ({ group }: UpdateCategoryGroupPayload) => {
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

  const deleteCategoryGroup = useMutation({
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

  const moveCategoryGroup = useMutation({
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

  return {
    createCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    createCategoryGroup,
    updateCategoryGroup,
    deleteCategoryGroup,
    moveCategoryGroup,
  };
}
