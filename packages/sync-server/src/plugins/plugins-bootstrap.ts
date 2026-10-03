import path from 'path';

import { config } from '#load-config';

import { createPluginManager } from './plugin-manager.js';

const pluginsDir = path.join(config.get('serverFiles'), 'plugins');
const pluginManager = createPluginManager(pluginsDir);

async function bootstrapPlugins(): Promise<void> {
  try {
    await pluginManager.loadPlugins();
    const loadedPlugins = pluginManager.getInstalledPluginManifests();
    console.log(`Loaded ${loadedPlugins.length} plugin(s):`, loadedPlugins);
  } catch (error) {
    console.error('Error loading plugins:', error);
  }
}

async function shutdownPlugins(): Promise<void> {
  try {
    await pluginManager.shutdown();
    console.log('Plugins shut down successfully');
  } catch (error) {
    console.error('Error shutting down plugins:', error);
  }
}

export { bootstrapPlugins, shutdownPlugins, pluginManager };
