import { useTranslation } from 'react-i18next';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { send } from 'loot-core/platform/client/connection';
import type { TagEntity } from 'loot-core/types/models';

import { tagQueries } from './queries';

import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';
import type { AppDispatch } from '@desktop-client/redux/store';

function invalidateQueries(queryClient: QueryClient, queryKey?: QueryKey) {
  queryClient.invalidateQueries({
    queryKey: queryKey ?? tagQueries.lists(),
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

type CreateTagPayload = {
  tag: Omit<TagEntity, 'id'>;
};

export function useCreateTagMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ tag }: CreateTagPayload) => {
      return await send('tags-create', tag);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error creating tag:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error creating the tag. Please try again.'),
        error,
      );
    },
  });
}

type UpdateTagPayload = {
  tag: TagEntity;
};

export function useUpdateTagMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ tag }: UpdateTagPayload) => {
      return await send('tags-update', tag);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error updating tag:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error updating the tag. Please try again.'),
        error,
      );
    },
  });
}

type DeleteTagPayload = {
  id: TagEntity['id'];
};

export function useDeleteTagMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id }: DeleteTagPayload) => {
      return await send('tags-delete', { id });
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error deleting tag:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error deleting the tag. Please try again.'),
        error,
      );
    },
  });
}

type DeleteTagsPayload = {
  ids: Array<TagEntity['id']>;
};

export function useDeleteTagsMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ ids }: DeleteTagsPayload) => {
      return await send('tags-delete-all', ids);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error deleting tags:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error deleting the tags. Please try again.'),
        error,
      );
    },
  });
}

export function useDiscoverTagsMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      return await send('tags-discover');
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      console.error('Error discovering tags:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error discovering the tags. Please try again.'),
        error,
      );
    },
  });
}
