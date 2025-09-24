/**
 * Main Entry Point for @actual-app/plugins-core
 *
 * Re-exports everything from both server and client exports.
 * `server` must be used in `loot-core`
 * `client` must be used in `desktop-client`
 */

// Re-export all server-safe exports
export * from './server';

// Re-export all client-only exports
export * from './client';
