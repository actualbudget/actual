import { useTranslation } from 'react-i18next';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { send } from 'loot-core/platform/client/connection';
import type { PayeeEntity } from 'loot-core/types/models';

import { payeeQueries } from './queries';

import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';
import type { AppDispatch } from '@desktop-client/redux/store';

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
