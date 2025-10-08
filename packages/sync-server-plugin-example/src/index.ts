import { attachPluginMiddleware } from '@actual-app/plugins-core-sync-server';
import express, { Request, Response } from 'express';

// The manifest is imported but not used in runtime code
// It's only used during build time to generate the JSON manifest
import './manifest';

// Create Express app
const app = express();

// Use JSON middleware for parsing request bodies
app.use(express.json());

// Attach the plugin middleware to enable IPC communication with sync-server
attachPluginMiddleware(app);

// Example routes

/**
 * GET /hello
 * Simple hello world endpoint
 */
app.get('/hello', (_req: Request, res: Response) => {
  res.json({
    message: 'Hello from example plugin!',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /info
 * Get plugin information
 */
app.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'example-plugin',
    version: '0.0.1',
    description: 'An example plugin for Actual sync-server',
    routes: [
      {
        method: 'GET',
        path: '/hello',
        auth: 'anonymous',
        description: 'Simple hello world',
      },
      {
        method: 'GET',
        path: '/info',
        auth: 'anonymous',
        description: 'Plugin information',
      },
      {
        method: 'GET',
        path: '/status',
        auth: 'anonymous',
        description: 'Health check',
      },
      {
        method: 'POST',
        path: '/echo',
        auth: 'authenticated',
        description: 'Echo back the request body (requires auth)',
      },
      {
        method: 'GET',
        path: '/data/:id',
        auth: 'authenticated',
        description: 'Get data by ID (requires auth)',
      },
      {
        method: 'POST',
        path: '/calculate',
        auth: 'authenticated',
        description: 'Perform calculations (requires auth)',
      },
      {
        method: 'GET',
        path: '/admin/settings',
        auth: 'admin',
        description: 'View admin settings (admin only)',
      },
      {
        method: 'POST',
        path: '/admin/settings',
        auth: 'admin',
        description: 'Update admin settings (admin only)',
      },
    ],
  });
});

/**
 * POST /echo
 * Echo back the request body
 */
app.post('/echo', (req: Request, res: Response) => {
  res.json({
    received: req.body,
    headers: req.headers,
    query: req.query,
  });
});

/**
 * GET /data/:id
 * Example route with parameters
 */
app.get('/data/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  res.json({
    id,
    data: {
      message: `Data for ID: ${id}`,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /status
 * Health check endpoint
 */
app.get('/status', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/**
 * POST /calculate
 * Example calculation endpoint
 */
app.post('/calculate', (req: Request, res: Response) => {
  const { operation, a, b } = req.body;

  if (typeof a !== 'number' || typeof b !== 'number') {
    res.status(400).json({
      error: 'invalid_input',
      message: 'Both a and b must be numbers',
    });
    return;
  }

  let result: number;

  switch (operation) {
    case 'add':
      result = a + b;
      break;
    case 'subtract':
      result = a - b;
      break;
    case 'multiply':
      result = a * b;
      break;
    case 'divide':
      if (b === 0) {
        res.status(400).json({
          error: 'division_by_zero',
          message: 'Cannot divide by zero',
        });
        return;
      }
      result = a / b;
      break;
    default:
      res.status(400).json({
        error: 'invalid_operation',
        message: 'Operation must be one of: add, subtract, multiply, divide',
      });
      return;
  }

  res.json({
    operation,
    a,
    b,
    result,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'not_found',
    message: 'Route not found',
    path: req.path,
  });
});

/**
 * GET /admin/settings
 * Admin-only endpoint (requires admin role)
 */
app.get('/admin/settings', (_req: Request, res: Response) => {
  res.json({
    message: 'Admin settings accessed',
    settings: {
      pluginEnabled: true,
      maxRequests: 1000,
      logLevel: 'info',
    },
  });
});

/**
 * POST /admin/settings
 * Update admin settings (requires admin role)
 */
app.post('/admin/settings', (req: Request, res: Response) => {
  const updates = req.body;

  res.json({
    message: 'Settings updated successfully',
    updates,
    timestamp: new Date().toISOString(),
  });
});

// Error handler

app.use(
  (err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'internal_error',
      message: 'An internal error occurred',
    });
  },
);

console.log('Example plugin initialized and ready');
