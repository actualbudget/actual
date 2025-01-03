export interface ActualPluginManifest {
  url: string;
  name: string;
  version: string;
  description?: string;
  pluginType: 'server' | 'client';
  minimumActualVersion: string;
  author: string;
  plugin?: string;
}
