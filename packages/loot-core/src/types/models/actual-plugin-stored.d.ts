import { ActualPluginManifest } from '../../../../plugins-core/src';

export type ActualPluginStored = {
  plugin: Blob;
  enabled: boolean;
} & ActualPluginManifest;
