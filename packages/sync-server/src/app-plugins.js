import path from 'path';

import express from 'express';

import { config } from './load-config.js';
import { PluginManager } from './plugin-manager.js';
import { createPluginMiddleware } from './plugin-middleware.js';
import {
  errorMiddleware,
  requestLoggerMiddleware,
} from './util/middlewares.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);

export { app as handlers };

// Initialize plugin manager
const pluginsDir = path.join(config.get('serverFiles'), 'plugins-api');
const pluginManager = new PluginManager(pluginsDir);

// Add endpoint to list available bank sync plugins
app.get('/bank-sync/list', (_req, res) => {
  try {
    const bankSyncPlugins = pluginManager.getBankSyncPlugins();
    res.json({
      status: 'ok',
      data: {
        providers: bankSyncPlugins,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

// Add plugin middleware to handle all plugin routes
app.use(createPluginMiddleware(pluginManager));

// Error handling middleware (must be last)
app.use(errorMiddleware);

// Load plugins on startup
async function loadPlugins() {
  try {
    await pluginManager.loadPlugins();
    const loadedPlugins = pluginManager.getOnlinePlugins();
    console.log(`Loaded ${loadedPlugins.length} plugin(s):`, loadedPlugins);
  } catch (error) {
    console.error('Error loading plugins:', error);
  }
}

// Start loading plugins
loadPlugins();

// Export plugin manager for potential external use
export { pluginManager };
