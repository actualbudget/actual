import type { ActualPluginManifest } from '@actual-app/plugins-core';

export const manifest: ActualPluginManifest = {
  url: 'https://github.com/actual-plugins/test-plugin/',
  name: 'test-plugin',
  version: '0.0.1',
  description: 'Plugin for testing.',
  pluginType: 'client',
  minimumActualVersion: 'v25.3.0',
  author: 'Test Server',
};
