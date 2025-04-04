/**
 * Main Entry Point for @actual-app/plugins-core
 *
 * Re-exports everything from both server and client exports for backward compatibility.
 * For better tree-shaking and to avoid DOM dependencies in server environments,
 * prefer importing from './server' or './client' directly.
 */

// Re-export all server-safe exports
export * from './server';

// Re-export all client-only exports
export * from './client';
