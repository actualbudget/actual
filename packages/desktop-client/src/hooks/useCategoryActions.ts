import { useTranslation } from 'react-i18next';

import { send } from 'loot-core/platform/client/fetch';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { useCategories } from './useCategories';
import { useNavigate } from './useNavigate';

import {
  createCategory,
  createCategoryGroup,
  deleteCategory,
  deleteCategoryGroup,
  moveCategory,
  moveCategoryGroup,
  updateCategory,
  updateCategoryGroup,
} from '@desktop-client/budget/budgetSlice';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

export function useCategoryActions() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { grouped: categoryGroups } = useCategories();

  const categoryNameAlreadyExistsNotification = (
    name: CategoryEntity['name'],
  ) => {
    dispatch(
      addNotification({
        notification: {
          type: 'error',
          message: t(
            'Category “{{name}}” already exists in group (it may be hidden)',
            { name },
          ),
        },
      }),
    );
  };

  const onSaveCategory = async (category: CategoryEntity) => {
    const { grouped: categoryGroups = [] } = await send('get-categories');

    const group = categoryGroups.find(g => g.id === category.group);
    if (!group) {
      return;
    }

    const groupCategories = group.categories ?? [];

    const exists =
      groupCategories
        .filter(c => c.name.toUpperCase() === category.name.toUpperCase())
        .filter(c => (category.id === 'new' ? true : c.id !== category.id))
        .length > 0;

    if (exists) {
      categoryNameAlreadyExistsNotification(category.name);
      return;
    }

    if (category.id === 'new') {
      dispatch(
        createCategory({
          name: category.name,
          groupId: category.group,
          isIncome: !!category.is_income,
          isHidden: !!category.hidden,
        }),
      );
    } else {
      dispatch(updateCategory({ category }));
    }
  };

  const onDeleteCategory = async (id: CategoryEntity['id']) => {
    const mustTransfer = await send('must-category-transfer', { id });

    if (mustTransfer) {
      dispatch(
        pushModal({
          modal: {
            name: 'confirm-category-delete',
            options: {
              category: id,
              onDelete: transferCategory => {
                if (id !== transferCategory) {
                  dispatch(
                    deleteCategory({ id, transferId: transferCategory }),
                  );
                }
              },
            },
          },
        }),
      );
    } else {
      dispatch(deleteCategory({ id }));
    }
  };

  const onSaveGroup = (group: CategoryGroupEntity) => {
    if (group.id === 'new') {
      dispatch(createCategoryGroup({ name: group.name }));
    } else {
      dispatch(updateCategoryGroup({ group }));
    }
  };

  const onDeleteGroup = async (id: CategoryGroupEntity['id']) => {
    const group = categoryGroups.find(g => g.id === id);
    if (!group) {
      return;
    }

    const groupCategories = group.categories ?? [];

    let mustTransfer = false;
    for (const category of groupCategories) {
      if (await send('must-category-transfer', { id: category.id })) {
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
              onDelete: transferCategory => {
                dispatch(
                  deleteCategoryGroup({ id, transferId: transferCategory }),
                );
              },
            },
          },
        }),
      );
    } else {
      dispatch(deleteCategoryGroup({ id }));
    }
  };

  const onShowActivity = (categoryId: CategoryEntity['id'], month: string) => {
    const filterConditions = [
      { field: 'category', op: 'is', value: categoryId, type: 'id' },
      {
        field: 'date',
        op: 'is',
        value: month,
        options: { month: true },
        type: 'date',
      },
    ];
    navigate('/accounts', {
      state: {
        goBack: true,
        filterConditions,
        categoryId,
      },
    });
  };

  const onReorderCategory = async (sortInfo: {
    id: CategoryEntity['id'];
    groupId?: CategoryGroupEntity['id'];
    targetId: CategoryEntity['id'] | null;
  }) => {
    const { grouped: categoryGroups = [], list: categories = [] } =
      await send('get-categories');

    const moveCandidate = categories.find(c => c.id === sortInfo.id);
    const group = categoryGroups.find(g => g.id === sortInfo.groupId);

    if (!moveCandidate || !group) {
      return;
    }

    const groupCategories = group.categories ?? [];

    const exists =
      groupCategories
        .filter(c => c.name.toUpperCase() === moveCandidate.name.toUpperCase())
        .filter(c => c.id !== moveCandidate.id).length > 0;

    if (exists) {
      categoryNameAlreadyExistsNotification(moveCandidate.name);
      return;
    }

    dispatch(
      moveCategory({
        id: moveCandidate.id,
        groupId: group.id,
        targetId: sortInfo.targetId,
      }),
    );
  };

  const onReorderGroup = async (sortInfo: {
    id: CategoryGroupEntity['id'];
    targetId: CategoryGroupEntity['id'] | null;
  }) => {
    dispatch(
      moveCategoryGroup({ id: sortInfo.id, targetId: sortInfo.targetId }),
    );
  };

  return {
    onSaveCategory,
    onDeleteCategory,
    onSaveGroup,
    onDeleteGroup,
    onShowActivity,
    onReorderCategory,
    onReorderGroup,
  };
}
