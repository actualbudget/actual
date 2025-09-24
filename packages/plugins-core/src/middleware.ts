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

function generateRandomPluginId() {
  return 'plugin-' + Math.random().toString(36).slice(2, 12);
}

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
