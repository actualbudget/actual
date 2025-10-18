import React, { ReactElement } from 'react';
import { initReactI18next } from 'react-i18next';

import type { BasicModalProps } from '@actual-app/components';
import ReactDOM from 'react-dom/client';

import {
  ActualPlugin,
  ActualPluginInitialized,
  SlotLocations,
} from './types/actualPlugin';

const containerRoots = new WeakMap<HTMLElement, ReactDOM.Root>();

function getOrCreateRoot(container: HTMLElement) {
  let root = containerRoots.get(container);
  if (!root) {
    root = ReactDOM.createRoot(container);
    containerRoots.set(container, root);
  }
  return root;
}

export function initializePlugin(
  plugin: ActualPlugin,
): ActualPluginInitialized {
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

        registerSlotContent(position: SlotLocations, element: ReactElement) {
          return context.registerSlotContent(position, container => {
            const root = getOrCreateRoot(container);
            root.render(element);
            return () => root.unmount();
          });
        },

        pushModal(element: ReactElement, modalProps?: BasicModalProps) {
          context.pushModal(container => {
            const root = getOrCreateRoot(container);
            root.render(element);
            return () => root.unmount();
          }, modalProps);
        },

        registerRoute(path: string, element: ReactElement) {
          return context.registerRoute(path, container => {
            const root = getOrCreateRoot(container);
            root.render(element);
            return () => root.unmount();
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
              const root = getOrCreateRoot(container);
              root.render(element);
              return () => root.unmount();
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
