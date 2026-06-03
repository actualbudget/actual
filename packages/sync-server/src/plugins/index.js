/**
 * Plugin system entry point for sync-server
 *
 * This module exports the plugin manager and middleware
 * for use in the sync-server application
 */

import { PluginManager } from '#plugin-manager';
import { createPluginMiddleware } from '#plugin-middleware';

export { PluginManager, createPluginMiddleware };
