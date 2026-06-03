import type { Request, Response } from 'express';

/**
 * Plugin request data sent from sync-server to plugin via IPC
 */
export type PluginRequest = {
  type: 'request';
  requestId: string;
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
  body: unknown;
  user?: UserInfo; // User information for secrets access
  pluginSlug?: string; // Plugin slug for namespaced secrets
};

/**
 * Plugin response sent from plugin to sync-server via IPC
 */
export type PluginResponse = {
  type: 'response';
  requestId: string;
  status: number;
  headers?: Record<string, string | string[]>;
  body: unknown;
};

/**
 * Plugin error response sent from plugin to sync-server via IPC
 */
export type PluginError = {
  type: 'error';
  requestId: string;
  error: string;
};

/**
 * Plugin ready message sent from plugin to sync-server via IPC
 */
export type PluginReady = {
  type: 'ready';
};

/**
 * All possible IPC messages from plugin to sync-server
 */
export type PluginMessage = PluginResponse | PluginError | PluginReady;

/**
 * Authentication level required for a route
 */
export type AuthLevel = 'anonymous' | 'authenticated' | 'admin';

/**
 * Route configuration in manifest
 */
export type PluginRoute = {
  path: string;
  methods: string[];
  auth?: AuthLevel;
  description?: string;
};

/**
 * Bank sync endpoint mapping
 */
export type BankSyncEndpoints = {
  status: string; // Route for checking connection status
  accounts: string; // Route for fetching accounts
  transactions: string; // Route for fetching transactions
};

/**
 * Bank sync configuration in manifest
 */
export type BankSyncConfig = {
  enabled: boolean;
  displayName: string; // Display name for the bank sync provider
  endpoints: BankSyncEndpoints; // Mapping of standard endpoints to plugin routes
  description?: string;
  requiresAuth?: boolean; // Whether this bank sync requires authentication
  setup?: {
    type: 'plugin' | 'json';
  };
};

export const BankSyncErrorCode = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_ACCESS_TOKEN: 'INVALID_ACCESS_TOKEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  INVALID_REQUEST: 'INVALID_REQUEST',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type BankSyncErrorCode =
  (typeof BankSyncErrorCode)[keyof typeof BankSyncErrorCode];

/**
 * Standardized error response for bank sync operations
 */
export type BankSyncError = {
  error_type: BankSyncErrorCode | string;
  error_code: BankSyncErrorCode | string;
  status: 'error' | 'rejected';
  reason: string; // Human-readable error message
  details?: Record<string, unknown>; // Optional provider-specific details
};

/**
 * Manifest file structure for plugins
 */
export type PluginManifest = {
  name: string;
  version: string;
  description?: string;
  type?: 'frontend' | 'syncserver' | 'mixed';
  frontend?: {
    entry: string;
  };
  syncserver?: {
    entry: string;
    routes?: PluginRoute[];
    bankSync?: BankSyncConfig;
  };
  entry?: string;
  author?: string;
  license?: string;
  routes?: PluginRoute[];
  bankSync?: BankSyncConfig; // Optional bank sync configuration
};

/**
 * Express Request with plugin context
 */
export type PluginExpressRequest = {
  pluginSlug?: string;
} & Request;

/**
 * Express Response type
 */
export type PluginExpressResponse = Response;

/**
 * User information extracted from request
 */
export type UserInfo = {
  id: string;
  role: 'user' | 'admin';
  [key: string]: unknown;
};
