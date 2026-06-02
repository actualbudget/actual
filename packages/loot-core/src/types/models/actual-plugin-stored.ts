import type { ActualPluginManifest } from '@actual-app/plugins-core/server';

export type ActualPluginStored = {
  plugin?: Blob;
  enabled: boolean;
  source?: 'indexeddb' | 'sync-server';
} & ActualPluginManifest;
