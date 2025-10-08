import {
  extractUserFromHeaders,
  checkAuth,
  getRouteAuthLevel,
} from './auth-checker.js';

/**
 * Express middleware that intercepts requests to /<plugin-slug>/<plugin-route>
 * and forwards them to the appropriate plugin via IPC
 *
 * Note: This middleware expects to be mounted at /plugins-api/ in the main app
 */
function createPluginMiddleware(pluginManager) {
  return async (req, res, _next) => {
    // Check if the request is for a plugin
    // Since this is mounted at /plugins-api/, req.path will be /<plugin-slug>/<plugin-route>
    const pluginMatch = req.path.match(/^\/([^/]+)\/(.*)$/);

    if (!pluginMatch) {
      // Not a valid plugin request format
      return res.status(404).json({
        error: 'not_found',
        message:
          'Invalid plugin route format. Expected: /plugins-api/<plugin-slug>/<route>',
      });
    }

    const [, pluginSlug, pluginRoute] = pluginMatch;

    // Check if the plugin is online
    if (!pluginManager.isPluginOnline(pluginSlug)) {
      return res.status(404).json({
        error: 'not_found',
        message: `Plugin '${pluginSlug}' is not available`,
      });
    }

    // Get plugin manifest for auth checking
    const plugin = pluginManager.getPlugin(pluginSlug);
    if (!plugin || !plugin.manifest) {
      return res.status(500).json({
        error: 'internal_error',
        message: 'Plugin configuration not found',
      });
    }

    // Determine required auth level for this route
    const authLevel = getRouteAuthLevel(
      plugin.manifest,
      req.method,
      '/' + pluginRoute,
    );

    // Extract user information from request
    const user = extractUserFromHeaders(req.headers);

    // Check if user meets auth requirements
    const authCheck = checkAuth(user, authLevel);

    if (!authCheck.allowed) {
      return res.status(authCheck.status).json({
        error: authCheck.error,
        message: authCheck.message,
      });
    }

    try {
      // Prepare request data to send to plugin
      const requestData = {
        method: req.method,
        path: '/' + pluginRoute,
        headers: req.headers,
        query: req.query,
        body: req.body,
        user, // Pass user info for secrets access
        pluginSlug, // Pass plugin slug for namespaced secrets
      };

      // Send request to plugin via IPC
      const response = await pluginManager.sendRequest(pluginSlug, requestData);

      // Set response headers
      if (response.headers) {
        Object.entries(response.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }

      // Send response
      res.status(response.status || 200);

      if (typeof response.body === 'string') {
        res.send(response.body);
      } else {
        res.json(response.body);
      }
    } catch (error) {
      console.error(`Error forwarding request to plugin ${pluginSlug}:`, error);
      res.status(500).json({
        error: 'internal_error',
        message: 'Failed to process plugin request',
      });
    }
  };
}

export { createPluginMiddleware };
