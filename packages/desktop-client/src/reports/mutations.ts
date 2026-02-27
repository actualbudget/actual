import { useTranslation } from 'react-i18next';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { sendCatch } from 'loot-core/platform/client/connection';
import type { send } from 'loot-core/platform/client/connection';
import type {
  CustomReportEntity,
  DashboardPageEntity,
  DashboardWidgetEntity,
} from 'loot-core/types/models';
import type {
  EverythingButIdOptional,
  WithOptional,
} from 'loot-core/types/util';

import { dashboardQueries, reportQueries } from './queries';

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

function invalidateReportQueries(
  queryClient: QueryClient,
  queryKey?: QueryKey,
) {
  void queryClient.invalidateQueries({
    queryKey: queryKey ?? reportQueries.lists(),
  });
}

function invalidateDashboardQueries(
  queryClient: QueryClient,
  queryKey?: QueryKey,
) {
  void queryClient.invalidateQueries({
    queryKey: queryKey ?? dashboardQueries.lists(),
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
    onSuccess: () => invalidateReportQueries(queryClient),
    onError: error => {
      console.error('Error updating report:', error);
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
    onSuccess: () => invalidateReportQueries(queryClient),
    onError: error => {
      console.error('Error deleting report:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error deleting the report. Please try again.'),
        error,
      );
    },
  });
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
    onSuccess: () => invalidateReportQueries(queryClient),
    onError: error => {
      console.error('Error creating report:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error creating the report. Please try again.'),
        error,
      );
    },
  });
}

type CreateDashboardPageMutationPayload = {
  name: DashboardPageEntity['name'];
};

export function useCreateDashboardPageMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ name }: CreateDashboardPageMutationPayload) => {
      return await sendThrow('dashboard-create', { name });
    },
    onSuccess: () => invalidateDashboardQueries(queryClient),
    onError: error => {
      console.error('Error creating dashboard page:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error creating the dashboard page. Please try again.'),
        error,
      );
    },
  });
}

type DeleteDashboardPageMutationPayload = {
  id: DashboardPageEntity['id'];
};

export function useDeleteDashboardPageMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id }: DeleteDashboardPageMutationPayload) => {
      return await sendThrow('dashboard-delete', id);
    },
    onSuccess: () => invalidateDashboardQueries(queryClient),
    onError: error => {
      console.error('Error deleting dashboard page:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error deleting the dashboard page. Please try again.'),
        error,
      );
    },
  });
}

type RenameDashboardPageMutationPayload = {
  id: DashboardPageEntity['id'];
  name: DashboardPageEntity['name'];
};

export function useRenameDashboardPageMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, name }: RenameDashboardPageMutationPayload) => {
      return await sendThrow('dashboard-rename', { id, name });
    },
    onSuccess: () => invalidateDashboardQueries(queryClient),
    onError: error => {
      console.error('Error renaming dashboard page:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error renaming the dashboard page. Please try again.'),
        error,
      );
    },
  });
}

type UpdateDashboardWidgetsMutationPayload = {
  widgets: EverythingButIdOptional<Omit<DashboardWidgetEntity, 'tombstone'>>[];
};

export function useUpdateDashboardWidgetsMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ widgets }: UpdateDashboardWidgetsMutationPayload) => {
      return await sendThrow('dashboard-update', widgets);
    },
    onSuccess: () => invalidateDashboardQueries(queryClient),
    onError: error => {
      console.error('Error updating dashboard widgets:', error);
      dispatchErrorNotification(
        dispatch,
        t(
          'There was an error updating the dashboard widgets. Please try again.',
        ),
        error,
      );
    },
  });
}

type UpdateDashboardWidgetMutationPayload = {
  widget: EverythingButIdOptional<Omit<DashboardWidgetEntity, 'tombstone'>>;
};

export function useUpdateDashboardWidgetMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ widget }: UpdateDashboardWidgetMutationPayload) => {
      return await sendThrow('dashboard-update-widget', widget);
    },
    onSuccess: () => invalidateDashboardQueries(queryClient),
    onError: error => {
      console.error('Error updating dashboard widget:', error);
      dispatchErrorNotification(
        dispatch,
        t(
          'There was an error updating the dashboard widget. Please try again.',
        ),
        error,
      );
    },
  });
}

type ResetDashboardPageMutationPayload = {
  id: DashboardPageEntity['id'];
};

export function useResetDashboardPageMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id }: ResetDashboardPageMutationPayload) => {
      return await sendThrow('dashboard-reset', id);
    },
    onSuccess: () => invalidateDashboardQueries(queryClient),
    onError: error => {
      console.error('Error resetting dashboard page:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error resetting the dashboard page. Please try again.'),
        error,
      );
    },
  });
}

type AddDashboardWidgetMutationPayload = {
  widget: WithOptional<
    Omit<DashboardWidgetEntity, 'id' | 'tombstone'>,
    'x' | 'y'
  >;
};

export function useAddDashboardWidgetMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ widget }: AddDashboardWidgetMutationPayload) => {
      return await sendThrow('dashboard-add-widget', widget);
    },
    onSuccess: () => invalidateDashboardQueries(queryClient),
    onError: error => {
      console.error('Error adding dashboard widget:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error adding the dashboard widget. Please try again.'),
        error,
      );
    },
  });
}

type RemoveDashboardWidgetMutationPayload = {
  id: DashboardWidgetEntity['id'];
};

export function useRemoveDashboardWidgetMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id }: RemoveDashboardWidgetMutationPayload) => {
      return await sendThrow('dashboard-remove-widget', id);
    },
    onSuccess: () => invalidateDashboardQueries(queryClient),
    onError: error => {
      console.error('Error removing dashboard widget:', error);
      dispatchErrorNotification(
        dispatch,
        t(
          'There was an error removing the dashboard widget. Please try again.',
        ),
        error,
      );
    },
  });
}

type CopyDashboardWidgetMutationPayload = {
  id: DashboardWidgetEntity['id'];
  targetDashboardPageId: DashboardPageEntity['id'];
};

export function useCopyDashboardWidgetMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      id,
      targetDashboardPageId,
    }: CopyDashboardWidgetMutationPayload) => {
      return await sendThrow('dashboard-copy-widget', {
        id,
        targetDashboardPageId,
      });
    },
    onSuccess: () => invalidateDashboardQueries(queryClient),
    onError: error => {
      console.error('Error copying dashboard widget:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error copying the dashboard widget. Please try again.'),
        error,
      );
    },
  });
}

type ImportDashboardPageMutationPayload = {
  filePath: string;
  dashboardPageId: DashboardPageEntity['id'];
};

export function useImportDashboardPageMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      filePath,
      dashboardPageId,
    }: ImportDashboardPageMutationPayload) => {
      return await sendThrow('dashboard-import', { filePath, dashboardPageId });
    },
    onSuccess: () => invalidateDashboardQueries(queryClient),
    onError: error => {
      console.error('Error importing dashboard page:', error);
      dispatchErrorNotification(
        dispatch,
        t('There was an error importing the dashboard page. Please try again.'),
        error,
      );
    },
  });
}
