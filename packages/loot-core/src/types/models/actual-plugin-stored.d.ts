import { ActualPluginManifest } from '../../../../plugins-shared/src';

export type ActualPluginStored = {
  plugin: string;
  enabled: boolean;
} & ActualPluginManifest;
