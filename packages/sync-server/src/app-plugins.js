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

app.get('/bank-sync/:providerSlug/status', async (req, res) => {
  try {
    const { providerSlug } = req.params;

    // Get the plugin
    const plugin = pluginManager.getPlugin(providerSlug);
    if (!plugin || !plugin.manifest?.bankSync?.enabled) {
      return res.json({
        status: 'ok',
        data: {
          configured: false,
        },
      });
    }

    // Check if the plugin defines a status endpoint
    const statusEndpoint = plugin.manifest.bankSync.endpoints?.status;
    if (!statusEndpoint) {
      // Plugin exists but doesn't have a status endpoint - consider it configured
      return res.json({
        status: 'ok',
        data: {
          configured: true,
        },
      });
    }

    // Try to call the plugin's status endpoint
    try {
      // Create a new request object for the plugin call
      const pluginReq = {
        ...req,
        method: 'GET',
        url: `/plugins-api/${providerSlug}${statusEndpoint}`,
        path: `/${providerSlug}${statusEndpoint}`,
        originalUrl: `/plugins-api/${providerSlug}${statusEndpoint}`,
      };

      // Create a mock response object
      let pluginResponseSent = false;
      const pluginRes = {
        status: (code) => ({
          json: (data) => {
            if (!pluginResponseSent) {
              pluginResponseSent = true;
              res.status(code).json(data);
            }
          }
        }),
        json: (data) => {
          if (!pluginResponseSent) {
            pluginResponseSent = true;
            res.json(data);
          }
        }
      };

      // Call the plugin middleware directly
      const middleware = createPluginMiddleware(pluginManager);
      await middleware(pluginReq, pluginRes, (err) => {
        if (err && !pluginResponseSent) {
          pluginResponseSent = true;
          // If plugin status check fails, assume plugin is configured but has issues
          res.json({
            status: 'ok',
            data: {
              configured: true,
              error: err.message,
            },
          });
        }
      });

      // If middleware didn't send a response, assume plugin is configured
      if (!pluginResponseSent) {
        res.json({
          status: 'ok',
          data: {
            configured: true,
          },
        });
      }

    } catch (pluginError) {
      // If plugin status check fails, assume plugin is configured but has issues
      res.json({
        status: 'ok',
        data: {
          configured: true,
          error: pluginError.message,
        },
      });
    }

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
