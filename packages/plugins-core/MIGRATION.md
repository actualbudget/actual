# Plugin Core Migration Guide

## Overview

The `plugins-core` package has been refactored to remove direct dependencies on `loot-core`. This ensures that plugins cannot access `loot-core` directly and instead must use the interfaces provided by `plugins-core`.

## Changes Made

### 1. Removed Direct loot-core Imports

**Before:**
```typescript
// plugins-core/src/index.ts
export { q } from '../../loot-core/src/shared/query';
export type { QueryState } from '../../loot-core/src/shared/query';
```

**After:**
```typescript
// plugins-core/src/index.ts
export type { 
  PluginQuery, 
  PluginQueryState, 
  PluginQueryBuilder 
} from './types/query';
export { convertPluginQueryToLootCore } from './middleware';
```

### 2. New Plugin-Specific Types

Created new types in `packages/plugins-core/src/types/query.ts`:

- `PluginQuery`: Interface that mirrors loot-core's Query class functionality
- `PluginQueryState`: Interface that mirrors loot-core's QueryState 
- `PluginQueryBuilder`: Function type for creating queries (`q` function equivalent)

### 3. Updated Plugin Context

**Before:**
```typescript
interface PluginContext {
  db?: PluginDatabase;
  // ... other properties
}
```

**After:**
```typescript
interface PluginContext {
  db?: PluginDatabase;
  q: PluginQueryBuilder;  // New query builder function
  // ... other properties
}
```

### 4. Middleware Enhancements

The middleware now:
- Provides a plugin-specific `q` function that wraps loot-core's query functionality
- Converts between plugin queries and loot-core queries internally
- Maintains the same API for plugins while abstracting loot-core dependencies

## For Plugin Developers

### Using the Query Builder

**Before (direct loot-core access):**
```typescript
import { q } from '@actual-app/plugins-core';

// In plugin
const query = q('transactions').filter({ amount: { $gt: 100 } });
```

**After (plugin-specific interface):**
```typescript
// In plugin activate function
export function activate(context) {
  const { q } = context;
  
  const query = q('transactions').filter({ amount: { $gt: 100 } });
  // API remains exactly the same!
}
```

### Type Imports

**Before:**
```typescript
import { QueryState } from '@actual-app/plugins-core';
```

**After:**
```typescript
import { PluginQueryState } from '@actual-app/plugins-core';
```

## For Host Application Developers

### Providing Query Builder in Context

**Before:**
```typescript
// Host application context
const context = {
  db: pluginDatabase,
  registerMenu: hostRegisterMenu,
  // ... other functions
};

const initializedPlugin = initializePlugin(plugin, pluginId);
initializedPlugin.activate(context);
```

**After:**
```typescript
import { q } from 'loot-core/shared/query'; // loot-core import stays in host app
import type { HostQueryBuilder } from '@actual-app/plugins-core';

// Host application context - now includes q function with proper typing
const context = {
  db: pluginDatabase,
  registerMenu: hostRegisterMenu,
  q: q as HostQueryBuilder, // Provide loot-core's q function with proper type constraint
  // ... other functions
};

const initializedPlugin = initializePlugin(plugin, pluginId);
initializedPlugin.activate(context);
```

### Converting Plugin Queries

When a plugin passes a query to the host application (e.g., through `db.aql`), the host needs to convert it:

```typescript
import { convertPluginQueryToLootCore } from '@actual-app/plugins-core';
import type { PluginQuery, LootCoreQueryBuilder } from '@actual-app/plugins-core';
import { q } from 'loot-core/shared/query';

// In PluginDatabase.aql implementation
async aql(pluginQuery: PluginQuery, options?) {
  // Convert plugin query to loot-core query with proper typing
  const lootCoreQuery = convertPluginQueryToLootCore(
    pluginQuery, 
    q as LootCoreQueryBuilder
  );
  
  // Use loot-core query with existing infrastructure
  return await runQuery(lootCoreQuery, options);
}
```

## Benefits

1. **Isolation**: Plugins can no longer directly access loot-core internals
2. **API Stability**: The plugin API is now independent of loot-core changes
3. **Type Safety**: 
   - Plugin-specific types provide better type checking for plugin developers
   - No `any` types exposed in the public plugin API
   - Proper TypeScript interfaces for all host-plugin interactions
4. **Maintainability**: Clear separation between plugin interface and host implementation
5. **Transparency**: Plugins receive the `q` function transparently through context, just like other host-provided utilities

## Breaking Changes

1. Plugins can no longer import `q` directly from `@actual-app/plugins-core`
2. Plugins must use `context.q` provided during activation
3. Host applications must provide loot-core's `q` function in the context
4. Type imports need to be updated from `QueryState` to `PluginQueryState`

## Verification

After migration, verify that:
1. The `plugins-core` build contains no references to `loot-core` in `build/index.d.ts`
2. All plugin query functionality works through the new interface
3. Host application properly converts between plugin and loot-core queries 