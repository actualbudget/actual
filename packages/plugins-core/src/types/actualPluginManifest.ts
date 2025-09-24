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
}
