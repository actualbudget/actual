import { PluginManifest } from '@actual-app/plugins-core-sync-server';

export const manifest: PluginManifest = {
  name: 'pluggy-bank-sync',
  version: '0.0.1',
  description: 'Pluggy.ai bank synchronization plugin for Actual Budget',
  type: 'mixed',
  frontend: {
    entry: 'frontend/mf-manifest.json',
  },
  author: 'Actual Budget Team',
  license: 'MIT',
  syncserver: {
    entry: 'syncserver/index.js',
    routes: [
      {
        path: '/status',
        methods: ['POST', 'GET'],
        auth: 'authenticated',
        description: 'Check Pluggy.ai configuration status',
      },
      {
        path: '/accounts',
        methods: ['POST'],
        auth: 'authenticated',
        description: 'Fetch accounts from Pluggy.ai',
      },
      {
        path: '/transactions',
        methods: ['POST'],
        auth: 'authenticated',
        description: 'Fetch transactions from Pluggy.ai',
      },
    ],
    bankSync: {
      enabled: true,
      displayName: 'Pluggy.ai',
      description: 'Connect your bank accounts via Pluggy.ai',
      requiresAuth: true,
      setup: {
        type: 'plugin',
      },
      endpoints: {
        status: '/status',
        accounts: '/accounts',
        transactions: '/transactions',
      },
    },
  },
};

export default manifest;
