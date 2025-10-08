import { PluginManifest } from '@actual-app/plugins-core-sync-server';

export const manifest: PluginManifest = {
  name: 'example-plugin',
  version: '0.0.1',
  description:
    'An example plugin for Actual sync-server demonstrating plugin capabilities',
  entry: 'index.js',
  author: 'Actual Budget Team',
  license: 'MIT',
  routes: [
    {
      path: '/hello',
      methods: ['GET'],
      auth: 'anonymous',
      description: 'Public hello world endpoint',
    },
    {
      path: '/info',
      methods: ['GET'],
      auth: 'anonymous',
      description: 'Public plugin information',
    },
    {
      path: '/status',
      methods: ['GET'],
      auth: 'anonymous',
      description: 'Public health check',
    },
    {
      path: '/echo',
      methods: ['POST'],
      auth: 'authenticated',
      description: 'Echo endpoint - requires authentication',
    },
    {
      path: '/data/:id',
      methods: ['GET'],
      auth: 'authenticated',
      description: 'Get data by ID - requires authentication',
    },
    {
      path: '/calculate',
      methods: ['POST'],
      auth: 'authenticated',
      description: 'Calculate endpoint - requires authentication',
    },
    {
      path: '/admin/settings',
      methods: ['GET', 'POST'],
      auth: 'admin',
      description: 'Admin settings - requires admin role',
    },
  ],
};

// Export for use in tests or other files
export default manifest;
