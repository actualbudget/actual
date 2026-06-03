/**
 * @actual-app/plugins-core-sync-server
 *
 * Core plugin utilities for Actual sync-server plugin authors
 *
 * This package provides the middleware and utilities needed to create
 * plugins for the Actual sync-server. Plugin authors can use this to
 * build Express-based plugins that communicate with the sync-server via IPC.
 */

export { attachPluginMiddleware } from './middleware';
export { saveSecret, getSecret, saveSecrets, getSecrets } from './secrets';
export * from './types';
