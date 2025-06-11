import ReactDOM from 'react-dom/client';
import {
  ActualPlugin,
  ActualPluginInitialized,
  SidebarLocations,
} from './types/actualPlugin';
import {
  PluginQuery,
  PluginQueryState,
  PluginQueryBuilder,
  LootCoreQuery,
  LootCoreQueryBuilder,
  ObjectExpression,
} from './types/query';
import { BasicModalProps } from '@actual-app/components/props/modalProps';

const containerRoots = new WeakMap<
  HTMLElement,
  Map<string, ReactDOM.Root>
>();

function generateRandomPluginId() {
  return (
    'plugin-' +
    Math.random().toString(36).slice(2, 12)
  );
}

function getOrCreateRoot(
  container: HTMLElement,
  pluginId: string
) {
  let pluginMap = containerRoots.get(container);
  if (!pluginMap) {
    pluginMap = new Map();
    containerRoots.set(container, pluginMap);
  }

  let root = pluginMap.get(pluginId);
  if (!root) {
    root = ReactDOM.createRoot(container);
    pluginMap.set(pluginId, root);
  }
  return root;
}

/**
 * Plugin-specific Query implementation that wraps loot-core's Query
 * This is provided by the host application and acts as a bridge.
 */
class PluginQueryImpl implements PluginQuery {
  constructor(private _lootCoreQuery: LootCoreQuery) {}

  get state(): PluginQueryState {
    const state = this._lootCoreQuery.state;
    return {
      table: state.table,
      tableOptions: state.tableOptions,
      filterExpressions: state.filterExpressions,
      selectExpressions: state.selectExpressions,
      groupExpressions: state.groupExpressions,
      orderExpressions: state.orderExpressions,
      calculation: state.calculation,
      rawMode: state.rawMode,
      withDead: state.withDead,
      validateRefs: state.validateRefs,
      limit: state.limit,
      offset: state.offset,
    };
  }

  filter(expr: ObjectExpression): PluginQuery {
    return new PluginQueryImpl(this._lootCoreQuery.filter(expr));
  }

  unfilter(exprs?: Array<keyof ObjectExpression>): PluginQuery {
    return new PluginQueryImpl(this._lootCoreQuery.unfilter(exprs));
  }

  select(exprs: ObjectExpression | string | Array<ObjectExpression | string> | '*' | ['*']): PluginQuery {
    return new PluginQueryImpl(this._lootCoreQuery.select(exprs));
  }

  calculate(expr: ObjectExpression | string): PluginQuery {
    return new PluginQueryImpl(this._lootCoreQuery.calculate(expr));
  }

  groupBy(exprs: ObjectExpression | string | Array<ObjectExpression | string>): PluginQuery {
    return new PluginQueryImpl(this._lootCoreQuery.groupBy(exprs));
  }

  orderBy(exprs: ObjectExpression | string | Array<ObjectExpression | string>): PluginQuery {
    return new PluginQueryImpl(this._lootCoreQuery.orderBy(exprs));
  }

  limit(num: number): PluginQuery {
    return new PluginQueryImpl(this._lootCoreQuery.limit(num));
  }

  offset(num: number): PluginQuery {
    return new PluginQueryImpl(this._lootCoreQuery.offset(num));
  }

  raw(): PluginQuery {
    return new PluginQueryImpl(this._lootCoreQuery.raw());
  }

  withDead(): PluginQuery {
    return new PluginQueryImpl(this._lootCoreQuery.withDead());
  }

  withoutValidatedRefs(): PluginQuery {
    return new PluginQueryImpl(this._lootCoreQuery.withoutValidatedRefs());
  }

  options(opts: Record<string, unknown>): PluginQuery {
    return new PluginQueryImpl(this._lootCoreQuery.options(opts));
  }

  reset(): PluginQuery {
    return new PluginQueryImpl(this._lootCoreQuery.reset());
  }

  serialize(): PluginQueryState {
    return this.state;
  }

  serializeAsString(): string {
    return this._lootCoreQuery.serializeAsString();
  }
}

/**
 * Convert a PluginQuery back to loot-core Query for internal use
 * This is used by the host application when calling loot-core methods
 */
export function convertPluginQueryToLootCore(pluginQuery: PluginQuery, lootCoreQ?: LootCoreQueryBuilder): LootCoreQuery {
  if (pluginQuery instanceof PluginQueryImpl) {
    return (pluginQuery as unknown as { _lootCoreQuery: LootCoreQuery })._lootCoreQuery;
  }
  
  // If it's a serialized query state, reconstruct it using loot-core's q function
  if (!lootCoreQ) {
    throw new Error('lootCoreQ is required when converting serialized plugin queries');
  }
  
  const state = pluginQuery.serialize();
  let query = lootCoreQ(state.table);
  
  // Apply all the state transformations
  if (state.tableOptions && Object.keys(state.tableOptions).length > 0) {
    query = query.options(state.tableOptions);
  }
  
  for (const filterExpr of state.filterExpressions) {
    query = query.filter(filterExpr);
  }
  
  if (state.selectExpressions.length > 0) {
    if (state.calculation) {
      query = query.calculate(state.selectExpressions[0]);
    } else {
      query = query.select(state.selectExpressions as Array<ObjectExpression | string>);
    }
  }
  
  for (const groupExpr of state.groupExpressions) {
    query = query.groupBy(groupExpr);
  }
  
  for (const orderExpr of state.orderExpressions) {
    query = query.orderBy(orderExpr);
  }
  
  if (state.limit !== null) {
    query = query.limit(state.limit);
  }
  
  if (state.offset !== null) {
    query = query.offset(state.offset);
  }
  
  if (state.rawMode) {
    query = query.raw();
  }
  
  if (state.withDead) {
    query = query.withDead();
  }
  
  if (!state.validateRefs) {
    query = query.withoutValidatedRefs();
  }
  
  return query;
}

export function initializePlugin(
  plugin: ActualPlugin,
  providedPluginId?: string
): ActualPluginInitialized {
  const pluginId = providedPluginId || generateRandomPluginId();

  const originalActivate = plugin.activate;

  const newPlugin: ActualPluginInitialized = {
    ...plugin,
    initialized: true,
    activate: context => {
      // Create plugin-specific query builder from host's q function
      const pluginQueryBuilder: PluginQueryBuilder = (table: string) => {
        if (!context.q) {
          throw new Error('Query builder not available - the host application must provide a q function in the context');
        }
        // Host's q function now properly typed to return LootCoreQuery
        const lootCoreQuery = context.q(table);
        return new PluginQueryImpl(lootCoreQuery);
      };

      const wrappedContext = {
        ...context,

        // Database provided by host
        db: context.db,

        // Plugin-specific query builder (wraps host's q function)
        q: pluginQueryBuilder,

        registerMenu(position: SidebarLocations, element: JSX.Element) {
          return context.registerMenu(position, container => {
            const root = getOrCreateRoot(container, pluginId);
            root.render(element);
          });
        },

        pushModal(element: JSX.Element, modalProps?: BasicModalProps) {
          context.pushModal(container => {
            const root = getOrCreateRoot(container, pluginId);
            root.render(element);
          }, modalProps);
        },

        registerRoute(path: string, element: JSX.Element) {
          return context.registerRoute(path, container => {
            const root = getOrCreateRoot(container, pluginId);
            root.render(element);
          });
        },

        registerDashboardWidget(
          widgetType: string,
          displayName: string,
          element: JSX.Element,
          options?: {
            defaultWidth?: number;
            defaultHeight?: number;
            minWidth?: number;
            minHeight?: number;
          }
        ) {
          return context.registerDashboardWidget(
            widgetType,
            displayName,
            container => {
              const root = getOrCreateRoot(container, pluginId);
              root.render(element);
            },
            options
          );
        },

        // Theme methods - passed through from host context
        addTheme: context.addTheme,
        overrideTheme: context.overrideTheme,

        // Report and spreadsheet utilities - passed through from host context
        createSpreadsheet: context.createSpreadsheet,
        makeFilters: context.makeFilters,
      };

      originalActivate(wrappedContext);
    },
  };

  return newPlugin;
}
