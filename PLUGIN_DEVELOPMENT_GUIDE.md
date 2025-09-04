# Actual Budget Plugin Development Guide

This guide covers all the plugin development capabilities and features available in Actual Budget's plugin system.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Plugin Structure](#plugin-structure)
3. [Core API Reference](#core-api-reference)
4. [UI Components](#ui-components)
5. [Database & Data Access](#database--data-access)
6. [Dashboard Widgets](#dashboard-widgets)
7. [Modals](#modals)
8. [Navigation & Routing](#navigation--routing)
9. [Sidebar Integration](#sidebar-integration)
10. [Theming](#theming)
11. [Spreadsheets & Reports](#spreadsheets--reports)
12. [Events & Lifecycle](#events--lifecycle)
13. [Migration System](#migration-system)
14. [Installation & Distribution](#installation--distribution)
15. [Best Practices](#best-practices)
16. [Examples](#examples)

## Getting Started

### Plugin Types

Actual Budget supports **client-side plugins** that run in the browser and can extend the user interface, add new features, and integrate with the app's data.

### Module Structure

The `@actual-app/plugins-core` package provides both client and server-side exports:

- **Main export** (`@actual-app/plugins-core`): Contains all components and types
- **Client export** (`@actual-app/plugins-core/client`): React components and client-only features
- **Server export** (`@actual-app/plugins-core/server`): Server-safe types and utilities (no DOM dependencies)

```typescript
// For full plugin functionality (client-side).
import { Button, PluginContext, ActualPlugin } from '@actual-app/plugins-core';

// For better tree-shaking (client-only)
import { Button } from '@actual-app/plugins-core/client';

// For server-safe imports (types only). Used by Actual `loot-core` to run the service worker
import type {
  PluginDatabase,
  QueryBuilder,
} from '@actual-app/plugins-core/server';
```

### Prerequisites

- Node.js 20+
- Basic knowledge of React and TypeScript
- Understanding of Actual Budget's data model

### Basic Plugin Structure

```typescript
import {
  ActualPlugin,
  ActualPluginEntry,
  PluginContext,
  initializePlugin,
} from '@actual-app/plugins-core';

export const pluginEntry: ActualPluginEntry = () => {
  const plugin: ActualPlugin = {
    name: 'My Plugin',
    version: '1.0.0',

    activate: (context: PluginContext) => {
      // Plugin initialization code
      console.log('Plugin activated!');
    },

    uninstall: () => {
      // Cleanup code when plugin is uninstalled
    },
  };

  return initializePlugin(plugin);
};
```

## Plugin Structure

### Manifest File (`manifest.ts`)

The plugin manifest can be defined as a TypeScript module for better type safety:

```typescript
import type { ActualPluginManifest } from '@actual-app/plugins-core';

export const manifest: ActualPluginManifest = {
  url: 'https://github.com/username/my-plugin',
  name: 'My Awesome Plugin',
  version: '1.0.0',
  description: 'A plugin that does awesome things',
  pluginType: 'client',
  minimumActualVersion: 'v24.1.0',
  author: 'Your Name',
};
```

Or as a traditional JSON file (`manifest.json`):

```json
{
  "url": "https://github.com/username/my-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "A plugin that does awesome things",
  "pluginType": "client",
  "minimumActualVersion": "v24.1.0",
  "author": "Your Name"
}
```

### Plugin Entry Point

Your plugin **must** export a `pluginEntry` function that returns an initialized `ActualPlugin`:

```typescript
import { ActualPlugin, ActualPluginEntry, PluginContext, initializePlugin } from '@actual-app/plugins-core';
import { manifest } from './manifest';
import { migrations } from './migrations';

export const pluginEntry: ActualPluginEntry = () => {
  const plugin: ActualPlugin = {
    name: manifest.name,
    version: manifest.version,

    // Optional: Define database migrations
    migrations: () => migrations,

    activate: (context: PluginContext) => {
      // Plugin logic here
      console.log('Plugin activated:', manifest.name);

      // Example: Register a dashboard widget
      context.registerDashboardWidget(
        'my-widget',
        'My Widget',
        <MyWidgetComponent context={context} />,
        { defaultWidth: 4, defaultHeight: 2 }
      );
    },

    uninstall: () => {
      // Cleanup logic
      console.log('Plugin uninstalled');
    },
  };

  return initializePlugin(plugin);
};
```

## Core API Reference

### Context Object

The `PluginContext` object provides access to all plugin capabilities:

```typescript
interface PluginContext {
  // Navigation
  navigate: (routePath: string) => void;
  popModal: () => void;

  // Modals (React Elements)
  pushModal: (element: ReactElement, modalProps?: BasicModalProps) => void;

  // Routing (React Elements)
  registerRoute: (path: string, routeElement: ReactElement) => string;
  unregisterRoute: (id: string) => void;

  // Sidebar (React Elements)
  registerMenu: (location: SidebarLocations, element: ReactElement) => string;
  unregisterMenu: (id: string) => void;

  // Dashboard Widgets (React Elements)
  registerDashboardWidget: (
    widgetType: string,
    displayName: string,
    element: ReactElement,
    options?: {
      defaultWidth?: number;
      defaultHeight?: number;
      minWidth?: number;
      minHeight?: number;
    },
  ) => string;
  unregisterDashboardWidget: (id: string) => void;

  // Theming
  addTheme: (
    themeId: string,
    displayName: string,
    colorOverrides: ThemeColorOverrides,
    options?: {
      baseTheme?: 'light' | 'dark' | 'midnight';
      description?: string;
    },
  ) => void;
  overrideTheme: (
    themeId: 'light' | 'dark' | 'midnight' | string,
    colorOverrides: ThemeColorOverrides,
  ) => void;

  // Data Access
  q: QueryBuilder; // Query builder for database access
  db?: PluginDatabase; // Plugin-specific database (optional)
  createSpreadsheet: () => PluginSpreadsheet;
  makeFilters: (
    conditions: Array<PluginFilterCondition>,
  ) => Promise<PluginFilterResult>;

  // Events
  on: <K extends keyof ContextEvent>(
    eventType: K,
    callback: (data: ContextEvent[K]) => void,
  ) => void;
}
```

### Sidebar Locations

```typescript
type SidebarLocations =
  | 'main-menu' // Main navigation area
  | 'more-menu' // "More" submenu
  | 'before-accounts' // Above accounts list
  | 'after-accounts' // Below accounts list
  | 'topbar'; // Top navigation bar
```

## UI Components

### Available Components

All Actual Budget UI components are available through `@actual-app/plugins-core`. For better tree-shaking, you can also import from specific modules:

```typescript
// Main import (includes all components)
import {
  Button,
  ButtonWithLoading,
  Card,
  Text,
  TextOneLine,
  View,
  Input,
  Select,
  Stack,
  Popover,
  Menu,
  AlignedText,
  Block,
  FormError,
  InitialFocus,
  InlineField,
  Label,
  Paragraph,
  SpaceBetween,
  Toggle,
  Tooltip,
} from '@actual-app/plugins-core';

// Or specific imports for better tree-shaking
import { Button } from '@actual-app/plugins-core/client';
```

### Modal Components

Modal-specific components are also available:

```typescript
import {
  ModalTitle,
  ModalButtons,
  ModalHeader,
  ModalCloseButton,
} from '@actual-app/plugins-core';
```

### Icons and Styling

```typescript
import { theme } from '@actual-app/plugins-core';
// Icons are available from '@actual-app/plugins-core' (v2 icons)
```

### Component Examples

```tsx
import { Card, Text, Button, Stack, View } from '@actual-app/plugins-core';

function MyPluginComponent() {
  return (
    <Card>
      <Stack spacing={2}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
          My Plugin Widget
        </Text>
        <Button onPress={() => console.log('Clicked!')}>Click Me</Button>
      </Stack>
    </Card>
  );
}

// Using View for custom padding/layout
function SimplePluginComponent() {
  return (
    <View style={{ padding: 20 }}>
      <Card>
        <Text>Plugin content here</Text>
      </Card>
    </View>
  );
}
```

## Database & Data Access

### Plugin Database

Each plugin gets its own isolated database:

```typescript
// In your activate function
activate: async (context: PluginContext) => {
  const { db } = context;

  // Check if database is available
  if (!db) {
    console.warn('Database not available in this environment');
    return;
  }

  // Create tables
  await db.runQuery(`
    CREATE TABLE IF NOT EXISTS my_plugin_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert data
  await db.runQuery('INSERT INTO my_plugin_data (name, value) VALUES (?, ?)', [
    'setting1',
    'value1',
  ]);

  // Query data - specify fetchAll for SELECT statements
  const results = await db.runQuery('SELECT * FROM my_plugin_data', [], true);
  console.log(results);

  // Execute DDL commands
  db.execQuery('CREATE INDEX IF NOT EXISTS idx_name ON my_plugin_data(name)');

  // Use transactions for multiple operations
  db.transaction(() => {
    db.runQuery('INSERT INTO my_plugin_data (name, value) VALUES (?, ?)', [
      'setting2',
      'value2',
    ]);
    db.runQuery('INSERT INTO my_plugin_data (name, value) VALUES (?, ?)', [
      'setting3',
      'value3',
    ]);
  });
};
```

### Accessing Main App Data

Use the query builder with AQL to access Actual Budget's main database:

```typescript
activate: async (context: PluginContext) => {
  const { q, db } = context;

  if (!db) return; // Database not available

  // Get all accounts using AQL
  const accountsQuery = q('accounts').select('*');
  const accountsResult = await db.aql(accountsQuery, { target: 'host' });
  console.log('Accounts:', accountsResult.data);

  // Get transactions since 2024-01-01
  const transactionsQuery = q('transactions')
    .filter({ date: { $gte: '2024-01-01' } })
    .select(['id', 'account', 'amount', 'payee']);

  const transactionsResult = await db.aql(transactionsQuery, {
    target: 'host',
  });
  console.log('Transactions:', transactionsResult.data);

  // Complex queries with calculations
  const spendingQuery = q('transactions')
    .filter({
      amount: { $lt: 0 },
      date: { $gte: '2024-01-01', $lte: '2024-01-31' },
    })
    .calculate({ $sum: '$amount' });

  const spendingResult = await db.aql(spendingQuery, { target: 'host' });
  console.log('Total spending:', spendingResult.data);
};
```

### AQL (Actual Query Language)

AQL is the unified query language for both plugin and host databases:

```typescript
// Plugin database query (default target is 'plugin')
const pluginResult = await db.aql(
  q('my_plugin_data').filter({ active: true }).select('*'),
);

// Specify plugin target explicitly
const pluginResult2 = await db.aql(
  q('settings').filter({ key: 'api_enabled' }),
  { target: 'plugin' },
);

// Main app database query
const hostResult = await db.aql(
  q('transactions')
    .filter({ amount: { $lt: 0 } })
    .calculate({ $sum: '$amount' }),
  { target: 'host' },
);

// AQL results include data and dependencies
console.log('Data:', hostResult.data);
console.log('Dependencies:', hostResult.dependencies);

// Using query parameters
const parameterizedResult = await db.aql(
  q('transactions').filter({ account: '$accountId', amount: { $lt: 0 } }),
  {
    target: 'host',
    params: { accountId: 'account-123' },
  },
);
```

## Dashboard Widgets

Create custom dashboard widgets that users can add to their dashboard:

```typescript
import React, { useState, useEffect } from 'react';
import { Card, Text, View, PluginContext } from '@actual-app/plugins-core';

type DashboardWidgetProps = {
  context: PluginContext;
};

function MyDashboardWidget({ context }: DashboardWidgetProps) {
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenseData = async () => {
      if (!context.db) {
        setLoading(false);
        return;
      }

      try {
        const result = await context.db.aql(
          context.q('transactions')
            .filter({ amount: { $lt: 0 } })
            .calculate({ $sum: '$amount' }),
          { target: 'host' }
        );

        setTotalExpenses(Math.abs(result.data as number || 0));
      } catch (error) {
        console.error('Error fetching expense data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenseData();
  }, [context]);

  if (loading) {
    return (
      <Card>
        <Text>Loading...</Text>
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
          Total Expenses: ${totalExpenses.toFixed(2)}
        </Text>
      </View>
    </Card>
  );
}

// Register the widget in your activate function
activate: (context: PluginContext) => {
  context.registerDashboardWidget(
    'expense-summary',
    'Expense Summary',
    <MyDashboardWidget context={context} />,
    {
      defaultWidth: 4,
      defaultHeight: 2,
      minWidth: 2,
      minHeight: 1
    }
  );
}
```

### Widget Options

```typescript
interface WidgetOptions {
  defaultWidth?: number; // Grid units (1-12)
  defaultHeight?: number; // Grid units
  minWidth?: number; // Minimum width
  minHeight?: number; // Minimum height
}
```

## Modals

Create custom modal dialogs:

```typescript
import React from 'react';
import { ModalTitle, ModalButtons, Button, Text, View, PluginContext } from '@actual-app/plugins-core';

type MyModalProps = {
  context: PluginContext;
};

function MyModal({ context }: MyModalProps) {
  return (
    <View>
      <ModalTitle title="My Plugin Modal" />
      <View style={{ padding: 20 }}>
        <Text>Modal content goes here</Text>
      </View>
      <ModalButtons>
        <Button onPress={() => context.popModal()}>
          Close
        </Button>
      </ModalButtons>
    </View>
  );
}

// Show the modal in your plugin code
activate: (context: PluginContext) => {
  // Register a button that opens the modal
  context.registerMenu(
    'after-accounts',
    <Button onPress={() => {
      context.pushModal(<MyModal context={context} />, {
        title: 'My Plugin',
        size: { width: 400, height: 300 }
      });
    }}>
      Open Modal
    </Button>
  );
}
```

### Modal Components

- `ModalTitle` - Styled modal title
- `ModalHeader` - Header
- `ModalButtons` - Button container with proper spacing
- `ModalCloseButton` - Standard close button

## Navigation & Routing

### Register Custom Routes

```typescript
activate: (context) => {
  // Register a new route
  const routeId = context.registerRoute('/my-plugin', <MyPluginPage />);

  // Navigate to your route
  context.navigate('/my-plugin');

  // Cleanup on uninstall
  return () => {
    context.unregisterRoute(routeId);
  };
}
```

### Route Component Example

```tsx
import { View, Text } from '@actual-app/plugins-core';

function MyPluginPage() {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>My Plugin Page</Text>
      <Text>This is a custom page added by my plugin!</Text>
    </View>
  );
}
```

## Sidebar Integration

Add custom menu items to various sidebar locations:

```typescript
activate: (context) => {
  // Add to main menu
  const menuId = context.registerMenu(
    'main-menu',
    <Button onPress={() => context.navigate('/my-plugin')}>
      My Plugin
    </Button>
  );

  // Add to more menu
  context.registerMenu(
    'more-menu',
    <MenuButton text="Plugin Settings" onPress={() => openSettings()} />
  );

  // Cleanup
  return () => {
    context.unregisterMenu(menuId);
  };
}
```

## Theming

### Create Custom Themes

```typescript
activate: context => {
  // Add a new theme
  context.addTheme(
    'my-dark-theme',
    'My Dark Theme',
    {
      pageBackground: '#1a1a1a',
      pageText: '#ffffff',
      cardBackground: '#2d2d2d',
      buttonPrimaryBackground: '#007acc',
      // ... more color overrides
    },
    {
      baseTheme: 'dark',
      description: 'A custom dark theme',
    },
  );
};
```

### Override Existing Themes

```typescript
// Modify existing theme colors
context.overrideTheme('light', {
  buttonPrimaryBackground: '#ff6b6b',
  buttonPrimaryBackgroundHover: '#ff5252',
});
```

### Available Theme Colors

The `ThemeColorOverrides` type includes 200+ customizable colors covering:

- Page colors (`pageBackground`, `pageText`, etc.)
- Card colors (`cardBackground`, `cardBorder`, etc.)
- Button colors (`buttonPrimaryBackground`, etc.)
- Table colors (`tableBackground`, `tableText`, etc.)
- Sidebar colors (`sidebarBackground`, etc.)
- Menu colors (`menuBackground`, `menuItemText`, etc.)
- Form colors (`formInputBackground`, etc.)
- Status colors (`errorBackground`, `warningText`, etc.)
- Custom colors (`custom-myColor`: '#ffffff')

## Spreadsheets & Reports

### Using Spreadsheets for Data

```typescript
import { useReport } from '@actual-app/plugins-core';

function DataDrivenWidget() {
  const spreadsheet = context.createSpreadsheet();

  const data = useReport('my-report', async (spreadsheet, setData) => {
    // Create queries
    await spreadsheet.createQuery('expenses', 'monthly-expenses',
      q('transactions')
        .filter({
          amount: { $lt: 0 },
          date: { $gte: startOfMonth, $lte: endOfMonth }
        })
        .groupBy('category')
        .select(['category', { amount: { $sum: '$amount' } }])
    );

    // Get results
    const results = await spreadsheet.get('expenses', 'monthly-expenses');
    setData(results);
  }, spreadsheet);

  return (
    <div>
      {data?.map(item => (
        <div key={item.category}>
          {item.category}: ${Math.abs(item.amount)}
        </div>
      ))}
    </div>
  );
}
```

### Filter Utilities

```typescript
// Create filters from conditions
const conditions: PluginFilterCondition[] = [
  { field: 'amount', op: 'lt', value: 0 },
  { field: 'date', op: 'gte', value: '2024-01-01' },
];

const filterResult = await context.makeFilters(conditions);
// Use filterResult.filters in your queries
```

## Events & Lifecycle

### Available Events

```typescript
activate: context => {
  // Listen for data changes
  context.on('accounts', data => {
    console.log('Accounts updated:', data.accounts);
  });

  context.on('categories', data => {
    console.log('Categories updated:', data.categories, data.groups);
  });

  context.on('payees', data => {
    console.log('Payees updated:', data.payees);
  });
};
```

### Plugin Lifecycle

```typescript
export default function (): ActualPlugin {
  return {
    name: 'My Plugin',
    version: '1.0.0',

    // Called when plugin is activated
    activate: context => {
      console.log('Plugin starting up');

      // Return cleanup function
      return () => {
        console.log('Plugin cleaning up');
      };
    },

    // Called when plugin is uninstalled
    uninstall: () => {
      console.log('Plugin being uninstalled');
    },
  };
}
```

## Migration System

Define database migrations for your plugin using the `PluginMigration` type:

```typescript
// migrations.ts
import type { PluginMigration } from '@actual-app/plugins-core';

export const migrations: PluginMigration[] = [
  // [timestamp, name, up_command, down_command]
  [
    1704067200000, // 2024-01-01 00:00:00 UTC
    'create_initial_tables',
    `CREATE TABLE IF NOT EXISTS plugin_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    'DROP TABLE IF EXISTS plugin_settings',
  ],
  [
    1704067201000, // One second later
    'add_user_preferences',
    `CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      preferences TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    'DROP TABLE IF EXISTS user_preferences',
  ],
];

// index.tsx
export const pluginEntry: ActualPluginEntry = () => {
  const plugin: ActualPlugin = {
    name: 'My Plugin',
    version: '1.0.0',

    migrations: () => migrations,

    activate: async (context: PluginContext) => {
      // Migrations run automatically before activate is called
      console.log('Plugin activated with migrated database');

      if (context.db) {
        // Database is ready and migrated
        console.log(
          'Database available:',
          await context.db.getMigrationState(),
        );
      }
    },
  };

  return initializePlugin(plugin);
};
```

### Migration Best Practices

- Use UTC timestamps (milliseconds since epoch) for migration ordering
- Always use `IF NOT EXISTS` for CREATE statements
- Always use `IF EXISTS` for DROP statements
- Test both up and down migrations
- Never modify existing migrations after they've been released

## Installation & Distribution

### Current Distribution Method

**Important**: Currently, all plugins must be installed through the **Plugin Manager Store**. Direct GitHub installation is not yet available for end users.

### Plugin Submission Process

1. **Develop Your Plugin**
   - Create a GitHub repository for your plugin
   - Add a `manifest.ts` or `manifest.json` file in the root
   - Build and package your plugin
   - Ensure your plugin follows all best practices and security guidelines

2. **Submit for Review**
   - Create a GitHub release with your plugin assets
   - Submit your plugin for review by Actual Budget maintainers
   - The maintainers will review your code for:
     - Security vulnerabilities
     - Code quality and best practices
     - Compatibility with Actual Budget's architecture
     - User experience and functionality
     - Proper error handling and edge cases

3. **Review Process**
   - Maintainers will conduct a thorough code review
   - Any issues or requested changes will be communicated back to you
   - You may need to make updates and resubmit
   - Once approved, your plugin will be added to the Plugin Manager Store

4. **Plugin Manager Store**
   - Approved plugins are made available through the built-in Plugin Manager
   - Users can browse, install, and manage plugins directly within Actual Budget
   - Updates to your plugin will also go through the review process

### Module Federation Setup (Required)

**Critical**: Your plugin MUST use Module Federation to be loadable by Actual Budget. This is not optional - without proper module federation configuration, your plugin cannot be loaded by the host application.

#### Required Module Federation Configuration

```typescript
// vite.config.mts
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    federation({
      name: 'yourPluginName', // REQUIRED: Unique name for your plugin
      ignoreOrigin: true, // REQUIRED: Allows loading from any origin
      manifest: true, // REQUIRED: Generates federation manifest
      exposes: {
        '.': './src/index.tsx', // REQUIRED: Exposes your main entry point
      },
      shared: {}, // REQUIRED: Shared dependencies configuration
    }),
    // ... other plugins
  ],
});
```

#### Package.json Requirements

Your `package.json` must include:

```json
{
  "type": "module", // REQUIRED: Use ES modules
  "module": "build/your-plugin.es.js", // REQUIRED: Point to built ES module
  "devDependencies": {
    "@module-federation/vite": "^1.4.1" // REQUIRED: Module federation plugin
  }
}
```

#### TypeScript Configuration

Your `tsconfig.json` should target ES2022 for compatibility:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "isolatedModules": true
  }
}
```

### Build Process & Configuration

With module federation properly configured, you'll need to build your plugin and convert the manifest to JSON. Here's the complete Vite configuration based on the test-plugin:

```typescript
// vite.config.mts
import { defineConfig } from 'vite';
import path from 'path';
import { federation } from '@module-federation/vite';
import { fileURLToPath } from 'url';
import { createWriteStream, rmSync, writeFileSync } from 'fs';
import archiver from 'archiver';
import react from '@vitejs/plugin-react-swc';

import { manifest } from './src/manifest'; // Import your TypeScript manifest

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'build',
    lib: {
      entry: path.resolve(__dirname, 'src/index.tsx'),
      name: 'your-plugin-name',
      fileName: format => `your-plugin-name.${format}.js`,
      formats: ['es'],
    },
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.tsx'),
      external: [], // Bundle all dependencies for isolation
    },
  },
  plugins: [
    federation({
      name: 'yourPluginName', // Must match your plugin's unique name
      ignoreOrigin: true, // Critical for plugin loading
      manifest: true, // Generates federation manifest
      exposes: {
        '.': './src/index.tsx', // Exposes your pluginEntry export
      },
      shared: {}, // Keep empty for plugin isolation
    }),
    react(),
    // Custom plugin to generate manifest.json from TypeScript manifest
    {
      name: 'vite-plugin-generate-manifest',
      closeBundle() {
        const outputPath = path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          'build',
          'manifest.json',
        );

        // Convert TypeScript manifest to JSON
        writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
        console.log('✅ manifest.json generated in /build');
      },
    },
    // Create ZIP for distribution
    {
      name: 'vite-plugin-zip-build',
      closeBundle() {
        const distPath = path.resolve(__dirname, 'build');
        const zipName = `${manifest.name}-${manifest.version}.zip`;
        const outputPath = path.resolve(__dirname, 'build', zipName);
        const output = createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        console.log(`📦 Creating ${zipName}...`);

        archive.glob('**/*', {
          cwd: distPath,
          ignore: [zipName],
        });

        archive.pipe(output);
        archive.finalize();
      },
    },
  ],
});
```

### Required Dependencies

Add these to your `package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "preview": "vite build && vite preview"
  },
  "devDependencies": {
    "@module-federation/vite": "^1.4.1",
    "@types/archiver": "^6.0.3",
    "@vitejs/plugin-react-swc": "^3.10.2",
    "archiver": "^7.0.1",
    "typescript": "~5.7.2",
    "vite": "^6.2.0"
  }
}
```

### Build Steps

1. **Development**: Run `npm run dev` or `yarn dev` to start development server
2. **Build**: Run `npm run build` or `yarn build` to:
   - Bundle your plugin code
   - Convert TypeScript manifest to JSON
   - Create distribution files
   - Create a ZIP file for submission

### Plugin Package Structure

```
my-plugin/
├── src/
│   ├── index.tsx              # Plugin entry point
│   ├── manifest.ts            # TypeScript manifest (source)
│   ├── components/
│   └── types/
├── build/                     # Generated by build process
│   ├── manifest.json          # Converted from manifest.ts
│   ├── your-plugin.es.js      # Bundled plugin code
│   └── your-plugin-1.0.0.zip  # Distribution package
├── package.json
├── vite.config.mts           # Build configuration
├── tsconfig.json
├── README.md
└── LICENSE
```

**Important Notes:**

- **Module Federation is mandatory** - plugins cannot load without proper federation setup
- When using TypeScript manifests, the build process **must** convert them to JSON
- The final `manifest.json` file is what Actual Budget reads
- All dependencies should be bundled for plugin isolation
- The `federation()` configuration must expose your plugin's entry point
- Use `"type": "module"` in package.json for proper ES module support
- The ZIP file created by the build process is ready for submission

### Development Workflow with Hot Reload

For development and testing, Actual Budget supports **hot reload** when loading plugins from a development server. This provides an excellent developer experience with instant updates.

#### Development Server Setup

1. **Start your plugin development server**:

   ```bash
   # In your plugin directory
   npm run dev
   # or
   yarn dev
   ```

   This starts your plugin on `http://localhost:2000` (or your configured port) with:
   - Module federation manifest at `/mf-manifest.json`
   - Hot module replacement (HMR) enabled
   - React refresh support

2. **Load dev plugin in Actual Budget**:
   - Open Actual Budget
   - Navigate to Settings → Plugins
   - In the "Dev Plugin" section, you'll see a pre-filled input: `http://localhost:2000/mf-manifest.json`
   - Click **"Enable Dev Plugin"**

#### Hot Reload Features

- **Instant Updates**: Changes to your plugin code are reflected immediately in Actual Budget
- **State Preservation**: React state is preserved during hot reloads when possible
- **Error Recovery**: Development errors are handled gracefully with retry mechanisms
- **Console Feedback**: Clear logging shows plugin loading status and any issues

#### Development vs. Production

| Aspect      | Development (Hot Reload)                 | Production                         |
| ----------- | ---------------------------------------- | ---------------------------------- |
| **Loading** | `http://localhost:2000/mf-manifest.json` | Installed via Plugin Manager Store |
| **Updates** | Instant hot reload                       | Manual plugin updates              |

#### Troubleshooting Development

- **Plugin not loading**: Check that your dev server is running on the correct port
- **Hot reload not working**: Refresh the browser - this is expected during some hot reloads

This development workflow allows you to iterate quickly on your plugin without needing to rebuild and reinstall for every change.

### Submission Guidelines

When preparing your plugin for submission to the Plugin Manager Store, ensure you meet these requirements:

**Code Quality:**

- Follow TypeScript best practices and provide proper type annotations
- Include comprehensive error handling and loading states
- Use the official `@actual-app/plugins-core` components and APIs
- Write clean, maintainable, and well-documented code

**Security:**

- Never access or store sensitive user data without explicit consent
- Validate all user inputs and sanitize data appropriately
- Follow secure coding practices to prevent vulnerabilities
- Declare all external dependencies and their purposes

**Documentation:**

- Include a detailed README.md with installation and usage instructions
- Document all plugin features and configuration options
- Provide examples and troubleshooting information
- Include proper licensing information

**Testing:**

- Test your plugin thoroughly across different Actual Budget versions
- Ensure compatibility with the minimum required version specified in your manifest
- Test edge cases, error conditions, and recovery scenarios
- Verify your plugin works correctly with and without database access

**User Experience:**

- Follow Actual Budget's design patterns and styling conventions
- Provide clear feedback for loading states and errors
- Ensure your plugin is accessible and usable
- Include proper cleanup when the plugin is uninstalled

## Best Practices

### 1. Error Handling

```typescript
activate: context => {
  try {
    // Plugin initialization
  } catch (error) {
    console.error('Plugin failed to initialize:', error);
    // Graceful degradation
  }
};
```

### 2. Resource Cleanup

```typescript
activate: (context) => {
  const registrations = [];

  // Register features
  registrations.push(context.registerRoute(...));
  registrations.push(context.registerMenu(...));

  // Return cleanup function
  return () => {
    registrations.forEach(id => {
      // Cleanup registrations
    });
  };
}
```

### 3. Performance

- Use `useReport` for data that needs periodic updates
- Avoid heavy computations in render methods
- Implement proper memoization for expensive operations

### 4. User Experience

- Provide clear error messages
- Use consistent styling with Actual Budget's design
- Make features discoverable through proper menu placement

### 5. Data Safety

- Always validate user inputs
- Use transactions for database operations
- Handle edge cases gracefully

## Examples

### Simple Dashboard Widget

```tsx
import React, { useState, useEffect } from 'react';
import { Card, Text, View, PluginContext } from '@actual-app/plugins-core';

type ExpenseTrackerProps = {
  context: PluginContext;
};

function ExpenseTracker({ context }: ExpenseTrackerProps) {
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenseTotal = async () => {
      if (!context.db) {
        setLoading(false);
        return;
      }

      try {
        const result = await context.db.aql(
          context
            .q('transactions')
            .filter({ amount: { $lt: 0 } })
            .calculate({ $sum: '$amount' }),
          { target: 'host' },
        );

        setTotal(Math.abs((result.data as number) || 0));
      } catch (error) {
        console.error('Error fetching expenses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenseTotal();
  }, [context]);

  return (
    <Card>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
          Total Expenses: {loading ? '...' : `$${total.toFixed(2)}`}
        </Text>
      </View>
    </Card>
  );
}

// Registration in activate function
activate: (context: PluginContext) => {
  context.registerDashboardWidget(
    'expense-tracker',
    'Expense Tracker',
    <ExpenseTracker context={context} />,
    { defaultWidth: 4, defaultHeight: 2 },
  );
};
```

### Settings Modal

```tsx
import React, { useState } from 'react';
import {
  ModalTitle,
  ModalButtons,
  Button,
  Input,
  Stack,
  View,
  PluginContext,
} from '@actual-app/plugins-core';

type SettingsModalProps = {
  context: PluginContext;
};

function SettingsModal({ context }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!context.db) {
      console.warn('Database not available');
      return;
    }

    setSaving(true);
    try {
      await context.db.runQuery(
        'INSERT OR REPLACE INTO plugin_settings (key, value) VALUES (?, ?)',
        ['api_key', apiKey],
      );
      context.popModal();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <ModalTitle title="Plugin Settings" />
      <Stack spacing={3} style={{ padding: 20 }}>
        <Input placeholder="API Key" value={apiKey} onChangeValue={setApiKey} />
      </Stack>
      <ModalButtons>
        <Button onPress={() => context.popModal()}>Cancel</Button>
        <Button variant="primary" onPress={handleSave} isDisabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </ModalButtons>
    </View>
  );
}
```

### Custom Theme

```typescript
import type { ThemeColorOverrides } from '@actual-app/plugins-core';

const oceanBlueTheme: ThemeColorOverrides = {
  pageBackground: '#f0f8ff',
  pageText: '#2c3e50',
  cardBackground: '#ffffff',
  cardBorder: '#e1e8ed',
  buttonPrimaryBackground: '#3498db',
  buttonPrimaryBackgroundHover: '#2980b9',
  buttonPrimaryText: '#ffffff',
  sidebarBackground: '#34495e',
  sidebarItemText: '#ecf0f1',
  sidebarItemTextSelected: '#ffffff',
  tableBackground: '#ffffff',
  tableText: '#2c3e50',
  tableHeaderBackground: '#ecf0f1',
  menuBackground: '#ffffff',
  menuItemText: '#2c3e50',
  // Custom colors for your plugin
  'custom-ocean-accent': '#16a085',
  'custom-ocean-light': '#a8e6cf',
};

activate: (context: PluginContext) => {
  context.addTheme('ocean-blue', 'Ocean Blue', oceanBlueTheme, {
    baseTheme: 'light',
    description: 'A calming ocean-inspired theme perfect for budgeting',
  });
};
```
