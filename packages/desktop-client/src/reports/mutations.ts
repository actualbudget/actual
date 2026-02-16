import { useTranslation } from 'react-i18next';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { sendCatch } from 'loot-core/platform/client/connection';
import type { send } from 'loot-core/platform/client/connection';
import { logger } from 'loot-core/platform/server/log';
import type { CustomReportEntity } from 'loot-core/types/models';

import { reportQueries } from '.';

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
    queryKey: queryKey ?? reportQueries.lists(),
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

type CreateReportMutationPayload = {
  report: CustomReportEntity;
};

export function useCreateReportMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ report }: CreateReportMutationPayload) => {
      return await sendThrow('report/create', report);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      logger.error('Error creating report:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error creating the report. Please try again.'),
        error,
      );
    },
  });
}

type UpdateReportPayload = {
  report: CustomReportEntity;
};

export function useUpdateReportMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ report }: UpdateReportPayload) => {
      return await sendThrow('report/update', report);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      logger.error('Error updating report:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error updating the report. Please try again.'),
        error,
      );
    },
  });
}

type DeleteReportPayload = {
  id: CustomReportEntity['id'];
};

export function useDeleteReportMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id }: DeleteReportPayload) => {
      return await sendThrow('report/delete', id);
    },
    onSuccess: () => invalidateQueries(queryClient),
    onError: error => {
      logger.error('Error deleting report:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error deleting the report. Please try again.'),
        error,
      );
    },
  });
}
