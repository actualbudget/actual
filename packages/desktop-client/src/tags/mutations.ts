import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import type { TagEntity } from '@actual-app/core/types/models';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import type { AppDispatch } from '#redux/store';

import { tagQueries } from './queries';

function invalidateQueries(queryClient: QueryClient, queryKey?: QueryKey) {
  void queryClient.invalidateQueries({
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

function useOnError(verb: string) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return (error: Error) => {
    console.error(`Error ${verb} tag:`, error);
    dispatchErrorNotification(
      dispatch,
      t(`There was an error ${verb} the tag. Please try again.`),
      error,
    );
  };
}

type CreateTagPayload = {
  tag: Omit<TagEntity, 'id'>;
};

export function useCreateTagMutation() {
  const queryClient = useQueryClient();
  const onError = useOnError('creating');

  return useMutation({
    mutationFn: async ({ tag }: CreateTagPayload) => {
      return await send('tags-create', tag);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError,
  });
}

type UpdateTagPayload = {
  tag: TagEntity;
};

export function useUpdateTagMutation() {
  const queryClient = useQueryClient();
  const onError = useOnError('updating');

  return useMutation({
    mutationFn: async ({ tag }: UpdateTagPayload) => {
      return await send('tags-update', tag);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError,
  });
}

type DeleteTagPayload = {
  id: TagEntity['id'];
};

export function useDeleteTagMutation() {
  const queryClient = useQueryClient();
  const onError = useOnError('deleting');

  return useMutation({
    mutationFn: async ({ id }: DeleteTagPayload) => {
      return await send('tags-delete', { id });
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError,
  });
}

type DeleteTagsPayload = {
  ids: Array<TagEntity['id']>;
};

export function useDeleteTagsMutation() {
  const queryClient = useQueryClient();
  const onError = useOnError('deleting');

  return useMutation({
    mutationFn: async ({ ids }: DeleteTagsPayload) => {
      return await send('tags-delete-all', ids);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError,
  });
}

type HideTagsPayload = {
  ids: Array<TagEntity['id']>;
};

export function useHideTagsMutation() {
  const queryClient = useQueryClient();
  const onError = useOnError('hiding');

  return useMutation({
    mutationFn: async ({ ids }: HideTagsPayload) => {
      return await send('tags-hide-all', ids);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError,
  });
}

type UnhideTagsPayload = {
  ids: Array<TagEntity['id']>;
};

export function useUnhideTagsMutation() {
  const queryClient = useQueryClient();
  const onError = useOnError('unhiding');

  return useMutation({
    mutationFn: async ({ ids }: UnhideTagsPayload) => {
      return await send('tags-unhide-all', ids);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError,
  });
}

export function useDiscoverTagsMutation() {
  const queryClient = useQueryClient();
  const onError = useOnError('discovering');

  return useMutation({
    mutationFn: async () => {
      return await send('tags-discover');
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError,
  });
}
