import { queryOptions } from '@tanstack/react-query';

import { sendCatch, type send } from 'loot-core/platform/client/fetch';
import { parseNumberFormat, setNumberFormat } from 'loot-core/shared/util';
import {
  type GlobalPrefs,
  type MetadataPrefs,
  type ServerPrefs,
  type SyncedPrefs,
} from 'loot-core/types/prefs';

import { setI18NextLanguage } from '@desktop-client/i18n';

const sendThrow: typeof send = async (name, args) => {
  const { error, data } = await sendCatch(name, args);
  if (error) {
    throw error;
  }
  return data;
};

export type AllPrefs = {
  local: MetadataPrefs;
  global: GlobalPrefs;
  synced: SyncedPrefs;
  server: ServerPrefs;
};

export const prefQueries = {
  all: () => ['prefs'],
  lists: () => [...prefQueries.all(), 'lists'],
  list: () =>
    queryOptions<AllPrefs>({
      queryKey: [...prefQueries.lists(), 'all'],
      queryFn: async ({ client }) => {
        const [localPrefs, globalPrefs, syncedPrefs] = await Promise.all([
          client.ensureQueryData(prefQueries.listMetadata()),
          client.ensureQueryData(prefQueries.listGlobal()),
          client.ensureQueryData(prefQueries.listSynced()),
        ]);

        // Certain loot-core utils depend on state outside of the React tree, update them
        setNumberFormat(
          parseNumberFormat({
            format: syncedPrefs.numberFormat,
            hideFraction: syncedPrefs.hideFraction,
          }),
        );

        // We need to load translations before the app renders
        setI18NextLanguage(globalPrefs.language ?? '');

        return {
          local: localPrefs,
          global: globalPrefs,
          synced: syncedPrefs,
          server: {}, // Server prefs are loaded separately
        };
      },
      placeholderData: {
        local: {},
        global: {},
        synced: {},
        server: {},
      },
      // Manually invalidated when preferences change
      staleTime: Infinity,
    }),
  listMetadata: () =>
    queryOptions<MetadataPrefs>({
      queryKey: [...prefQueries.lists(), 'metadata'],
      queryFn: async () => {
        return await sendThrow('load-prefs');
      },
      placeholderData: {},
      // Manually invalidated when local preferences change
      staleTime: Infinity,
    }),
  listGlobal: () =>
    queryOptions({
      queryKey: [...prefQueries.lists(), 'global'],
      queryFn: async () => {
        return await sendThrow('load-global-prefs');
      },
      placeholderData: {},
      // Manually invalidated when global preferences change
      staleTime: Infinity,
    }),
  listSynced: () =>
    queryOptions({
      queryKey: [...prefQueries.lists(), 'synced'],
      queryFn: async () => {
        return await sendThrow('preferences/get');
      },
      placeholderData: {},
      // Manually invalidated when synced preferences change
      staleTime: Infinity,
    }),
  listServer: () =>
    queryOptions({
      ...prefQueries.list(),
      select: data => data.server,
    }),
  // details: () => [...prefQueries.all(), 'details'],
  // detailMetadata: (prefName: keyof MetadataPrefs) =>
  //   queryOptions({
  //     queryKey: [...prefQueries.details(), 'metadata', prefName],
  //     queryFn: async ({ client }) => {
  //       const allMetadataPrefs = await client.ensureQueryData(
  //         prefQueries.listMetadata(),
  //       );
  //       return allMetadataPrefs?.[prefName];
  //     },
  //     enabled: !!prefName,
  //     staleTime: Infinity,
  //   }),
  // detailGlobal: (prefName: keyof GlobalPrefs) =>
  //   queryOptions({
  //     queryKey: [...prefQueries.details(), 'global', prefName],
  //     queryFn: async ({ client }) => {
  //       const allGlobalPrefs = await client.ensureQueryData(
  //         prefQueries.listGlobal(),
  //       );
  //       return allGlobalPrefs?.[prefName] ?? null;
  //     },
  //     enabled: !!prefName,
  //     staleTime: Infinity,
  //   }),
  // detailSynced: (prefName: keyof SyncedPrefs) =>
  //   queryOptions({
  //     queryKey: [...prefQueries.details(), 'synced', prefName],
  //     queryFn: async ({ client }) => {
  //       const allSyncedPrefs = await client.ensureQueryData(
  //         prefQueries.listSynced(),
  //       );
  //       return allSyncedPrefs?.[prefName] ?? null;
  //     },
  //     enabled: !!prefName,
  //     staleTime: Infinity,
  //   }),
};
