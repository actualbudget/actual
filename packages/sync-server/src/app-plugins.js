import path from 'path';

import express from 'express';

import {
  checkAuth,
  extractUserFromHeaders,
  getRouteAuthLevel,
} from './auth-checker.js';
import { config } from './load-config.js';
import { PluginManager } from './plugin-manager.js';
import { createPluginMiddleware } from './plugin-middleware.js';
import { arePluginsEnabled } from './server-prefs.js';
import { secretsService } from './services/secrets-service.js';
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
const pluginsDir = path.join(config.get('serverFiles'), 'plugins');
const pluginManager = new PluginManager(pluginsDir);

async function requirePluginAuth(req, res, authLevel = 'authenticated') {
  const user = await extractUserFromHeaders(req.headers);
  const authCheck = checkAuth(user, authLevel);
  if (!authCheck.allowed) {
    res.status(authCheck.status).json({
      status: 'error',
      error: authCheck.error,
      reason: authCheck.message,
    });
    return false;
  }

  return true;
}

function sendPluginError(res, error) {
  res.status(500).json({
    status: 'error',
    reason: error.message,
  });
}

app.get('/list', async (req, res) => {
  if (!(await requirePluginAuth(req, res))) return;

  try {
    res.json({
      status: 'ok',
      data: {
        plugins: pluginManager.getInstalledPluginManifests(),
      },
    });
  } catch (error) {
    sendPluginError(res, error);
  }
});

app.get('/files/:pluginName', async (req, res) => {
  if (!(await requirePluginAuth(req, res))) return;

  try {
    res.json({
      status: 'ok',
      data: {
        files: pluginManager.getFrontendPluginFiles(req.params.pluginName),
      },
    });
  } catch (error) {
    sendPluginError(res, error);
  }
});

app.post(
  '/install',
  express.raw({ type: 'application/zip', limit: '100mb' }),
  async (req, res) => {
    if (!(await requirePluginAuth(req, res, 'admin'))) return;

    try {
      const manifest = await pluginManager.installPluginZip(req.body);
      res.json({
        status: 'ok',
        data: { manifest },
      });
    } catch (error) {
      sendPluginError(res, error);
    }
  },
);

app.post('/dev/register', async (req, res) => {
  if (!(await requirePluginAuth(req, res, 'admin'))) return;

  try {
    const manifest = await pluginManager.registerDevPlugin(
      req.body.manifestUrl,
    );
    res.json({
      status: 'ok',
      data: { manifest },
    });
  } catch (error) {
    sendPluginError(res, error);
  }
});

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

function getBankSyncPluginEndpoint(res, providerSlug, endpointName) {
  const plugin = pluginManager.getPlugin(providerSlug);
  if (!plugin || !plugin.manifest?.bankSync?.enabled) {
    res.status(404).json({
      error_code: 'PLUGIN_NOT_FOUND',
      reason: `Bank sync plugin '${providerSlug}' not found`,
    });
    return null;
  }

  const endpoint = plugin.manifest.bankSync.endpoints?.[endpointName];
  if (!endpoint) {
    res.status(500).json({
      error_code: 'ENDPOINT_NOT_FOUND',
      reason: `Plugin '${providerSlug}' does not define a ${endpointName} endpoint`,
    });
    return null;
  }

  return endpoint;
}

async function forwardToBankSyncPluginEndpoint(
  req,
  res,
  providerSlug,
  endpoint,
) {
  const plugin = pluginManager.getPlugin(providerSlug);
  if (!plugin || !plugin.manifest) {
    res.status(500).json({
      error_code: 'PLUGIN_NOT_CONFIGURED',
      reason: `Plugin '${providerSlug}' configuration not found`,
    });
    return;
  }

  const authLevel = getRouteAuthLevel(plugin.manifest, req.method, endpoint);
  const user = await extractUserFromHeaders(req.headers);
  const authCheck = checkAuth(user, authLevel);
  if (!authCheck.allowed) {
    res.status(authCheck.status).json({
      error_code: authCheck.error,
      reason: authCheck.message,
    });
    return;
  }

  const response = await pluginManager.sendRequest(providerSlug, {
    method: req.method,
    path: endpoint,
    headers: req.headers,
    query: req.query,
    body: req.body,
    user,
    pluginSlug: providerSlug,
  });

  if (response.headers) {
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }

  res.status(response.status || 200);

  if (typeof response.body === 'string') {
    res.send(response.body);
  } else {
    res.json(response.body);
  }
}

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

    return forwardToBankSyncPluginEndpoint(
      req,
      res,
      providerSlug,
      statusEndpoint,
    );
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

app.post('/bank-sync/:providerSlug/status', async (req, res) => {
  try {
    const { providerSlug } = req.params;
    const statusEndpoint = getBankSyncPluginEndpoint(
      res,
      providerSlug,
      'status',
    );
    if (!statusEndpoint) {
      return;
    }

    return forwardToBankSyncPluginEndpoint(
      req,
      res,
      providerSlug,
      statusEndpoint,
    );
  } catch (error) {
    res.status(500).json({
      error_code: 'INTERNAL_ERROR',
      reason: error.message,
    });
  }
});

app.post('/bank-sync/:providerSlug/secret', async (req, res) => {
  if (!(await requirePluginAuth(req, res, 'admin'))) return;

  try {
    const { providerSlug } = req.params;
    const plugin = pluginManager.getPlugin(providerSlug);
    if (!plugin || !plugin.manifest?.bankSync?.enabled) {
      res.status(404).json({
        error_code: 'PLUGIN_NOT_FOUND',
        reason: `Bank sync plugin '${providerSlug}' not found`,
      });
      return;
    }

    const { key, value } = req.body ?? {};
    const fileId = req.body?.fileId || req.headers['x-actual-file-id'];
    if (!key || typeof key !== 'string') {
      res.status(400).json({
        error_code: 'INVALID_SECRET_KEY',
        reason: 'Secret key is required',
      });
      return;
    }
    if (!fileId || typeof fileId !== 'string') {
      res.status(400).json({
        error_code: 'MISSING_FILE_ID',
        reason: 'fileId is required',
      });
      return;
    }
    if (value !== null && typeof value !== 'string') {
      res.status(400).json({
        error_code: 'INVALID_SECRET_VALUE',
        reason: 'Secret value must be a string or null',
      });
      return;
    }

    secretsService.set(`${providerSlug}_${key}`, value, { fileId });

    res.json({
      status: 'ok',
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      error_code: 'INTERNAL_ERROR',
      reason: error.message,
    });
  }
});

// Add endpoint to get accounts from a specific bank sync plugin
app.post('/bank-sync/:providerSlug/accounts', async (req, res) => {
  try {
    const { providerSlug } = req.params;

    const accountsEndpoint = getBankSyncPluginEndpoint(
      res,
      providerSlug,
      'accounts',
    );
    if (!accountsEndpoint) {
      return;
    }

    return forwardToBankSyncPluginEndpoint(
      req,
      res,
      providerSlug,
      accountsEndpoint,
    );
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

    const transactionsEndpoint = getBankSyncPluginEndpoint(
      res,
      providerSlug,
      'transactions',
    );
    if (!transactionsEndpoint) {
      return;
    }

    return forwardToBankSyncPluginEndpoint(
      req,
      res,
      providerSlug,
      transactionsEndpoint,
    );
  } catch (error) {
    res.status(500).json({
      error_code: 'INTERNAL_ERROR',
      reason: error.message,
    });
  }
});

app.all(/^\/bank-sync\/([^/]+)\/(.+)$/, async (req, res) => {
  try {
    const [, providerSlug, route] = req.params;
    const routePath = `/${route || ''}`;

    return forwardToBankSyncPluginEndpoint(req, res, providerSlug, routePath);
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
    if (!arePluginsEnabled()) {
      console.log('Plugins are disabled. Skipping plugin loading.');
      return;
    }

    await pluginManager.loadPlugins();
    const loadedPlugins = pluginManager.getOnlinePlugins();
    console.log(`Loaded ${loadedPlugins.length} plugin(s):`, loadedPlugins);
  } catch (error) {
    console.error('Error loading plugins:', error);
  }
}

// Start loading plugins
void loadPlugins();

// Export plugin manager for potential external use
export { pluginManager };
