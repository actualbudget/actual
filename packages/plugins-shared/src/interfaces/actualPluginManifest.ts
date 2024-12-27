export interface ActualPluginManifest {
  slug: string;
  name: string;
  version: string;
  description?: string;
  pluginType: 'server' | 'client';
  minimumActualVersion: string;
  plugin?: string;
}
