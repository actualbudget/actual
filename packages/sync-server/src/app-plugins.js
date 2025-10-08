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

    // Redirect to the actual plugin endpoint using absolute URL
    const protocol = req.protocol;
    const host = req.get('host');
    const redirectUrl = `${protocol}://${host}/plugins-api/${providerSlug}${statusEndpoint}`;
    return res.redirect(307, redirectUrl);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

// Add endpoint to get accounts from a specific bank sync plugin
app.post('/bank-sync/:providerSlug/accounts', async (req, res) => {
  try {
    const { providerSlug } = req.params;

    // Get the plugin
    const plugin = pluginManager.getPlugin(providerSlug);
    if (!plugin || !plugin.manifest?.bankSync?.enabled) {
      return res.status(404).json({
        error_code: 'PLUGIN_NOT_FOUND',
        reason: `Bank sync plugin '${providerSlug}' not found`,
      });
    }

    // Get the accounts endpoint from the plugin manifest
    const accountsEndpoint = plugin.manifest.bankSync.endpoints?.accounts;
    if (!accountsEndpoint) {
      return res.status(500).json({
        error_code: 'ENDPOINT_NOT_FOUND',
        reason: `Plugin '${providerSlug}' does not define an accounts endpoint`,
      });
    }

    // Redirect to the actual plugin endpoint using absolute URL
    const protocol = req.protocol;
    const host = req.get('host');
    const redirectUrl = `${protocol}://${host}/plugins-api/${providerSlug}${accountsEndpoint}`;
    return res.redirect(307, redirectUrl);
  } catch (error) {
    res.status(500).json({
      error_code: 'INTERNAL_ERROR',
      reason: error.message,
    });
  }
});

// Add endpoint to get transactions from a specific bank sync plugin
app.post('/bank-sync/:providerSlug/transactions', async (req, res) => {
  try {
    const { providerSlug } = req.params;

    // Get the plugin
    const plugin = pluginManager.getPlugin(providerSlug);
    if (!plugin || !plugin.manifest?.bankSync?.enabled) {
      return res.status(404).json({
        error_code: 'PLUGIN_NOT_FOUND',
        reason: `Bank sync plugin '${providerSlug}' not found`,
      });
    }

    // Get the transactions endpoint from the plugin manifest
    const transactionsEndpoint =
      plugin.manifest.bankSync.endpoints?.transactions;
    if (!transactionsEndpoint) {
      return res.status(500).json({
        error_code: 'ENDPOINT_NOT_FOUND',
        reason: `Plugin '${providerSlug}' does not define a transactions endpoint`,
      });
    }

    // Redirect to the actual plugin endpoint using absolute URL
    const protocol = req.protocol;
    const host = req.get('host');
    const redirectUrl = `${protocol}://${host}/plugins-api/${providerSlug}${transactionsEndpoint}`;
    return res.redirect(307, redirectUrl);
  } catch (error) {
    res.status(500).json({
      error_code: 'INTERNAL_ERROR',
      reason: error.message,
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
