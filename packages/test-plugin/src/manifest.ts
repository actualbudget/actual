import type { ActualPluginManifest } from '@actual-app/plugins-core';

export const manifest: ActualPluginManifest = {
  name: 'test-plugin',
  version: '0.0.1',
  description: 'Plugin for testing.',
  author: 'Test Server',
  type: 'frontend',
  frontend: {
    entry: 'frontend/mf-manifest.json',
  },
};
