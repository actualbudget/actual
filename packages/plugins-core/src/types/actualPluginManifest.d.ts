export interface ActualPluginManifest {
  url: string;
  name: string;
  version: string;
  enabled?: boolean;
  description?: string;
  pluginType: 'server' | 'client';
  minimumActualVersion: string;
  author: string;
  plugin?: Blob;
  config?: ActualPluginConfigField[];
}

export interface ActualPluginConfigField {
  name: string;
  title?: string;
  desription?: string;
}

export type ActualPluginConfigType<T extends ActualPluginManifest> =
  T['config'] extends ActualPluginConfigField[]
    ? Partial<ActualPluginConfigToType<T['config']>>
    : { [name: string]: string };

type ActualPluginConfigToType<T extends ActualPluginConfigField[]> = {
  [K in T[number]['name']]: string;
};
