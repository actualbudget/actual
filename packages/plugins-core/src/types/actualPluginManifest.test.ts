import { describe, expect, it } from 'vitest';

import { validateActualPluginManifest } from './actualPluginManifest';

describe('validateActualPluginManifest', () => {
  it('accepts mixed bank-sync plugins with plugin-owned setup UI', () => {
    expect(() =>
      validateActualPluginManifest({
        name: 'simplefin-bank-sync',
        version: '0.0.1',
        type: 'mixed',
        frontend: {
          entry: 'frontend/mf-manifest.json',
        },
        syncserver: {
          entry: 'syncserver/index.js',
          bankSync: {
            enabled: true,
            displayName: 'SimpleFIN',
            endpoints: {
              status: '/status',
              accounts: '/accounts',
              transactions: '/transactions',
            },
            setup: {
              type: 'plugin',
            },
          },
        },
      }),
    ).not.toThrow();
  });

  it('rejects plugin-owned bank-sync setup without frontend capability', () => {
    expect(() =>
      validateActualPluginManifest({
        name: 'server-bank-sync',
        version: '0.0.1',
        type: 'syncserver',
        syncserver: {
          entry: 'syncserver/index.js',
          bankSync: {
            enabled: true,
            displayName: 'Server Bank',
            endpoints: {
              status: '/status',
              accounts: '/accounts',
              transactions: '/transactions',
            },
            setup: {
              type: 'plugin',
            },
          },
        },
      }),
    ).toThrow(
      "Bank sync setup.type 'plugin' requires a mixed plugin with frontend config",
    );
  });

  it('accepts json bank-sync setup for sync-server-only plugins', () => {
    expect(() =>
      validateActualPluginManifest({
        name: 'json-bank-sync',
        version: '0.0.1',
        type: 'syncserver',
        syncserver: {
          entry: 'syncserver/index.js',
          bankSync: {
            enabled: true,
            displayName: 'JSON Bank',
            endpoints: {
              status: '/status',
              accounts: '/accounts',
              transactions: '/transactions',
            },
            setup: {
              type: 'json',
            },
          },
        },
      }),
    ).not.toThrow();
  });

  it('rejects invalid sync-server route shapes', () => {
    expect(() =>
      validateActualPluginManifest({
        name: 'bad-routes',
        version: '0.0.1',
        type: 'syncserver',
        syncserver: {
          entry: 'syncserver/index.js',
          routes: [{ path: '/accounts', methods: 'GET' }],
        },
      }),
    ).toThrow('syncserver.routes entries must specify methods');
  });

  it('rejects invalid bank-sync setup types', () => {
    expect(() =>
      validateActualPluginManifest({
        name: 'bad-bank-sync',
        version: '0.0.1',
        type: 'syncserver',
        syncserver: {
          entry: 'syncserver/index.js',
          bankSync: {
            enabled: true,
            displayName: 'Bad Bank',
            endpoints: {
              status: '/status',
            },
            setup: {
              type: 'oauth',
            },
          },
        },
      }),
    ).toThrow("syncserver.bankSync.setup.type must be 'plugin' or 'json'");
  });

  it('rejects invalid permissions', () => {
    expect(() =>
      validateActualPluginManifest({
        name: 'bad-permissions',
        version: '0.0.1',
        type: 'syncserver',
        syncserver: {
          entry: 'syncserver/index.js',
          permissions: 'admin',
        },
      }),
    ).toThrow('syncserver.permissions must be an array of strings');
  });
});
