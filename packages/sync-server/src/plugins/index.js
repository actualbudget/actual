/**
 * Plugin system entry point for sync-server
 *
 * This module exports the plugin manager and middleware
 * for use in the sync-server application
 */

import { PluginManager } from '../plugin-manager.js';
import { createPluginMiddleware } from '../plugin-middleware.js';

export { PluginManager, createPluginMiddleware };
