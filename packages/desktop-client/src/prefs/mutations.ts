import { useTranslation } from 'react-i18next';

import {
  type QueryClient,
  type QueryKey,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { sendCatch, type send } from 'loot-core/platform/client/fetch';
import { logger } from 'loot-core/platform/server/log';
import {
  type GlobalPrefs,
  type MetadataPrefs,
  type SyncedPrefs,
} from 'loot-core/types/prefs';

import { prefQueries } from './queries';

import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';
import { type AppDispatch } from '@desktop-client/redux/store';

const sendThrow: typeof send = async (name, args) => {
  const { error, data } = await sendCatch(name, args);
  if (error) {
    throw error;
  }
  return data;
};

const invalidateQueries = (queryClient: QueryClient, queryKey?: QueryKey) => {
  queryClient.invalidateQueries({
    queryKey: queryKey ?? prefQueries.lists(),
  });
};

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

type SaveMetadataPrefsPayload = MetadataPrefs;

export function useSaveMetadataPrefsMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (metadataPrefs: SaveMetadataPrefsPayload) => {
      const existing = await queryClient.ensureQueryData(
        prefQueries.listMetadata(),
      );

      const prefsToSave: MetadataPrefs = {};
      let hasChanges = false;
      for (const [key, value] of Object.entries(metadataPrefs)) {
        if (!existing || existing[key] !== value) {
          prefsToSave[key] = value;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await sendThrow('save-prefs', prefsToSave);
      }

      return prefsToSave;
    },
    onSuccess: changedPrefs => {
      if (changedPrefs && Object.keys(changedPrefs).length > 0) {
        queryClient.setQueryData(
          prefQueries.listMetadata().queryKey,
          oldData => {
            return oldData
              ? {
                  ...oldData,
                  ...changedPrefs,
                }
              : oldData;
          },
        );

        // Invalidate individual pref caches in case any components are subscribed to those directly
        // const queryKeys = Object.keys(changedPrefs).map(
        //   prefName =>
        //     prefQueries.detailMetadata(prefName as keyof MetadataPrefs)
        //       .queryKey,
        // );
        // queryKeys.forEach(key => invalidateQueries(queryClient, key));
      }
    },
    onError: error => {
      logger.error('Error saving metadata preferences:', error);
      dispatchErrorNotification(
        dispatch,
        t(
          'There was an error saving the metadata preferences. Please try again.',
        ),
        error,
      );
      throw error;
    },
  });
}

type SaveGlobalPrefsPayload = GlobalPrefs;

export function useSaveGlobalPrefsMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (globalPrefs: SaveGlobalPrefsPayload) => {
      const existing = await queryClient.ensureQueryData(
        prefQueries.listGlobal(),
      );

      const prefsToSave: GlobalPrefs = {};
      let hasChanges = false;
      for (const [key, value] of Object.entries(globalPrefs)) {
        if (!existing || existing[key] !== value) {
          prefsToSave[key] = value;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await sendThrow('save-global-prefs', prefsToSave);
      }

      return prefsToSave;
    },
    onSuccess: changedPrefs => {
      if (changedPrefs && Object.keys(changedPrefs).length > 0) {
        queryClient.setQueryData(prefQueries.listGlobal().queryKey, oldData => {
          return oldData
            ? {
                ...oldData,
                ...changedPrefs,
              }
            : oldData;
        });

        // Invalidate individual pref caches in case any components are subscribed to those directly
        // const queryKeys = Object.keys(changedPrefs).map(
        //   prefName =>
        //     prefQueries.detailGlobal(prefName as keyof GlobalPrefs).queryKey,
        // );
        // queryKeys.forEach(key => invalidateQueries(queryClient, key));
      }
    },
    onError: error => {
      logger.error('Error saving global preferences:', error);
      dispatchErrorNotification(
        dispatch,
        t(
          'There was an error saving the global preferences. Please try again.',
        ),
        error,
      );
      throw error;
    },
  });
}

type SaveSyncedPrefsPayload = SyncedPrefs;

export function useSaveSyncedPrefsMutation() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (syncedPrefs: SaveSyncedPrefsPayload, { client }) => {
      const existing = await client.ensureQueryData(prefQueries.listSynced());

      const prefsToSave: SyncedPrefs = {};
      let hasChanges = false;
      for (const [key, value] of Object.entries(syncedPrefs)) {
        if (!existing || existing[key] !== value) {
          prefsToSave[key] = value;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await Promise.all(
          Object.entries(prefsToSave).map(([syncedPrefName, value]) =>
            sendThrow('preferences/save', {
              id: syncedPrefName as keyof SyncedPrefs,
              value,
            }),
          ),
        );
      }

      return prefsToSave;
    },
    onSuccess: changedPrefs => {
      if (changedPrefs && Object.keys(changedPrefs).length > 0) {
        queryClient.setQueryData(prefQueries.listSynced().queryKey, oldData => {
          return oldData
            ? {
                ...oldData,
                ...changedPrefs,
              }
            : oldData;
        });

        // Invalidate individual pref caches in case any components are subscribed to those directly
        // const queryKeys = Object.keys(changedPrefs).map(
        //   prefName =>
        //     prefQueries.detailSynced(prefName as keyof SyncedPrefs).queryKey,
        // );
        // queryKeys.forEach(key => invalidateQueries(queryClient, key));
      }
    },
    onError: error => {
      logger.error('Error saving synced preferences:', error);
      dispatchErrorNotification(
        dispatch,
        t(
          'There was an error saving the synced preferences. Please try again.',
        ),
        error,
      );
      throw error;
    },
  });
}

// type SaveServerPrefsPayload = ServerPrefs;

// export function useSaveServerPrefsMutation() {
//   const queryClient = useQueryClient();
//   const dispatch = useDispatch();
//   const { t } = useTranslation();

//   return useMutation({
//     mutationFn: async (serverPrefs: SaveServerPrefsPayload) => {
//       const result = await sendThrow('save-server-prefs', {
//         prefs: serverPrefs,
//       });
//       if (result && 'error' in result) {
//         return { error: result.error };
//       }
//     },
//     onSuccess: () => invalidateQueries(queryClient, prefQueries.listServer().queryKey),
//     onError: error => {
//       logger.error('Error saving server preferences:', error);
//       dispatchErrorNotification(
//         dispatch,
//         t(
//           'There was an error saving the server preferences. Please try again.',
//         ),
//         error,
//       );
//       throw error;
//     },
//   });
// }
