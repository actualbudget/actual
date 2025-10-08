import { PluginManifest } from '@actual-app/plugins-core-sync-server';

export const manifest: PluginManifest = {
  name: 'simplefin-bank-sync',
  version: '0.0.1',
  description: 'SimpleFIN bank synchronization plugin for Actual Budget',
  entry: 'index.js',
  author: 'Actual Budget Team',
  license: 'MIT',
  routes: [
    {
      path: '/status',
      methods: ['POST'],
      auth: 'authenticated',
      description: 'Check SimpleFIN configuration status',
    },
    {
      path: '/accounts',
      methods: ['POST'],
      auth: 'authenticated',
      description: 'Fetch accounts from SimpleFIN',
    },
    {
      path: '/transactions',
      methods: ['POST'],
      auth: 'authenticated',
      description: 'Fetch transactions from SimpleFIN',
    },
  ],
  bankSync: {
    enabled: true,
    displayName: 'SimpleFIN',
    description: 'Connect your bank accounts via SimpleFIN',
    requiresAuth: true,
    endpoints: {
      status: '/status',
      accounts: '/accounts',
      transactions: '/transactions',
    },
  },
};

export default manifest;
