import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import type { PayeeEntity } from '@actual-app/core/types/models';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import type { AppDispatch } from '#redux/store';

import { locationService } from './location';
import { payeeQueries } from './queries';

function invalidateQueries(queryClient: QueryClient, queryKey?: QueryKey) {
  void queryClient.invalidateQueries({
    queryKey: queryKey ?? payeeQueries.lists(),
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

type CreatePayeePayload = {
  name: PayeeEntity['name'];
};

export function useDeletePayeeLocationMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (locationId: string) => {
      await locationService.deletePayeeLocation(locationId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: payeeQueries.listNearby().queryKey,
      });
    },
    onError: error => {
      console.error('Error deleting payee location:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error forgetting the location. Please try again.'),
        error,
      );
    },
  });
}

export function useSavePayeeLocationMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (payeeId: PayeeEntity['id']) => {
      const coords = await locationService.getCurrentPosition();
      await locationService.savePayeeLocation(payeeId, coords);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: payeeQueries.listNearby().queryKey,
      });
    },
    onError: error => {
      console.error('Error saving payee location:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error saving the location. Please try again.'),
        error,
      );
    },
  });
}

export function useCreatePayeeMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ name }: CreatePayeePayload) => {
      const id: PayeeEntity['id'] = await send('payee-create', {
        name: name.trim(),
      });
      return id;
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error creating payee:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error creating the payee. Please try again.'),
        error,
      );
    },
  });
}
