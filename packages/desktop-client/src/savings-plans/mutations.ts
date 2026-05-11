import { useTranslation } from 'react-i18next';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { send } from '@actual-app/core/platform/client/connection';
import type { SavingsPlanEntity } from '@actual-app/core/types/models';

import { savingsPlanQueries } from './queries';

import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

export function useCreateSavingsPlanMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (plan: Omit<SavingsPlanEntity, 'id'>) => {
      return await send('savings-plans-create', plan);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: savingsPlanQueries.lists(),
      });
    },
    onError: (error: Error) => {
      dispatch(
        addNotification({
          notification: {
            id: uuidv4(),
            type: 'error',
            message: t(
              'There was an error creating the savings plan. Please try again.',
            ),
            pre: error.message,
          },
        }),
      );
    },
  });
}

export function useUpdateSavingsPlanMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (
      plan: Partial<SavingsPlanEntity> & Pick<SavingsPlanEntity, 'id'>,
    ) => {
      return await send('savings-plans-update', plan);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: savingsPlanQueries.lists(),
      });
    },
    onError: (error: Error) => {
      dispatch(
        addNotification({
          notification: {
            id: uuidv4(),
            type: 'error',
            message: t(
              'There was an error updating the savings plan. Please try again.',
            ),
            pre: error.message,
          },
        }),
      );
    },
  });
}

export function useDeleteSavingsPlanMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: SavingsPlanEntity['id']) => {
      return await send('savings-plans-delete', { id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: savingsPlanQueries.lists(),
      });
    },
    onError: (error: Error) => {
      dispatch(
        addNotification({
          notification: {
            id: uuidv4(),
            type: 'error',
            message: t(
              'There was an error deleting the savings plan. Please try again.',
            ),
            pre: error.message,
          },
        }),
      );
    },
  });
}
