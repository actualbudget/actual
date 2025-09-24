import React, { ReactElement } from 'react';
import { initReactI18next } from 'react-i18next';

import { BasicModalProps } from '@actual-app/components/props/modalProps';
import ReactDOM from 'react-dom/client';

import {
  ActualPlugin,
  ActualPluginInitialized,
  SidebarLocations,
} from './types/actualPlugin';

const containerRoots = new WeakMap<HTMLElement, Map<string, ReactDOM.Root>>();

/**
 * Generates a short random plugin identifier string.
 *
 * The returned value has the form `plugin-<random>` where `<random>` is
 * a 10-character base-36 substring derived from Math.random().
 *
 * @returns A pseudo-random plugin id (not cryptographically unique).
 */
function generateRandomPluginId() {
  return 'plugin-' + Math.random().toString(36).slice(2, 12);
}

/**
 * Retrieve or create a React root for a specific plugin within a host container.
 *
 * Returns a cached ReactDOM.Root associated with the given container and pluginId,
 * creating and caching a new root if none exists. The mapping is stored in a
 * per-container WeakMap so roots are reused for the same (container, pluginId)
 * pair and can be garbage-collected with the container.
 *
 * @param container - Host DOM element that will host the React root.
 * @param pluginId - Identifier for the plugin instance; roots are namespaced by this id.
 * @returns The existing or newly created React root for the specified container and pluginId.
 */
function getOrCreateRoot(container: HTMLElement, pluginId: string) {
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
 * Produces an initialized plugin wrapper that mounts the plugin's UI into per-plugin React roots
 * and forwards host resources.
 *
 * The returned plugin is a shallow copy of `plugin` with `initialized: true` and an `activate`
 * implementation that:
 * - installs `initReactI18next` into the plugin's i18n instance,
 * - wraps the host activation context to forward host-provided resources (`db`, `q`, theme and utility
 *   helpers) and to replace UI registration helpers so provided React elements are rendered into
 *   per-container, per-plugin React roots (menus, modals, routes, dashboard widgets),
 * - preserves and then calls the original `plugin.activate` with the wrapped context.
 *
 * @param plugin - The plugin to initialize.
 * @param providedPluginId - Optional plugin identifier to use for scoping per-container React roots;
 *   when omitted a random plugin id is generated.
 * @returns A plugin object marked `initialized: true` whose `activate` is wrapped to provide the
 *   augmented context and per-plugin rendering behavior.
 */
export function initializePlugin(
  plugin: ActualPlugin,
  providedPluginId?: string,
): ActualPluginInitialized {
  const pluginId = providedPluginId || generateRandomPluginId();

  const originalActivate = plugin.activate;

  const newPlugin: ActualPluginInitialized = {
    ...plugin,
    initialized: true,
    activate: context => {
      context.i18nInstance.use(initReactI18next);

      const wrappedContext = {
        ...context,

        // Database provided by host
        db: context.db,

        // Query builder passed through directly
        q: context.q,

        registerMenu(position: SidebarLocations, element: ReactElement) {
          return context.registerMenu(position, container => {
            const root = getOrCreateRoot(container, pluginId);
            root.render(element);
          });
        },

        pushModal(element: ReactElement, modalProps?: BasicModalProps) {
          context.pushModal(container => {
            const root = getOrCreateRoot(container, pluginId);
            root.render(element);
          }, modalProps);
        },

        registerRoute(path: string, element: ReactElement) {
          return context.registerRoute(path, container => {
            const root = getOrCreateRoot(container, pluginId);
            root.render(element);
          });
        },

        registerDashboardWidget(
          widgetType: string,
          displayName: string,
          element: ReactElement,
          options?: {
            defaultWidth?: number;
            defaultHeight?: number;
            minWidth?: number;
            minHeight?: number;
          },
        ) {
          return context.registerDashboardWidget(
            widgetType,
            displayName,
            container => {
              const root = getOrCreateRoot(container, pluginId);
              root.render(element);
            },
            options,
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
