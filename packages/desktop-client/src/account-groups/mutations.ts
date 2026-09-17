import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import type { AccountGroupEntity } from '@actual-app/core/types/models';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { accountQueries } from '#accounts';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import type { AppDispatch } from '#redux/store';

import { accountGroupQueries } from './queries';

function invalidateQueries(queryClient: QueryClient, queryKey?: QueryKey) {
  void queryClient.invalidateQueries({
    queryKey: queryKey ?? accountGroupQueries.lists(),
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

type CreateAccountGroupPayload = {
  name: AccountGroupEntity['name'];
};

export function useCreateAccountGroupMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ name }: CreateAccountGroupPayload) => {
      return await send('account-group-create', { name });
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error creating account group:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error creating the account group. Please try again.'),
        error,
      );
    },
  });
}

type UpdateAccountGroupPayload = {
  id: AccountGroupEntity['id'];
  name: AccountGroupEntity['name'];
};

export function useUpdateAccountGroupMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, name }: UpdateAccountGroupPayload) => {
      return await send('account-group-update', { id, name });
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error updating account group:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error updating the account group. Please try again.'),
        error,
      );
    },
  });
}

type DeleteAccountGroupPayload = {
  id: AccountGroupEntity['id'];
};

export function useDeleteAccountGroupMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id }: DeleteAccountGroupPayload) => {
      return await send('account-group-delete', { id });
    },
    onSuccess: () => {
      invalidateQueries(queryClient);
      invalidateQueries(queryClient, accountQueries.lists());
    },
    onError: error => {
      console.error('Error deleting account group:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error deleting the account group. Please try again.'),
        error,
      );
    },
  });
}

type MoveAccountGroupPayload = {
  id: AccountGroupEntity['id'];
  targetId: AccountGroupEntity['id'] | null;
};

export function useMoveAccountGroupMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, targetId }: MoveAccountGroupPayload) => {
      return await send('account-group-move', { id, targetId });
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error moving account group:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error moving the account group. Please try again.'),
        error,
      );
    },
  });
}
