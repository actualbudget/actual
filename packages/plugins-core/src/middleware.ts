import React, { ReactElement } from 'react';
import ReactDOM from 'react-dom/client';
import { initReactI18next } from 'react-i18next';

import type { BasicModalProps } from '@actual-app/components';

import {
  ActualPlugin,
  ActualPluginInitialized,
  BankSyncProviderSetupRenderer,
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

function unmountRoot(container: HTMLElement) {
  const root = containerRoots.get(container);
  if (root) {
    root.unmount();
    containerRoots.delete(container);
  }
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
            return () => unmountRoot(container);
          });
        },

        pushModal(element: ReactElement, modalProps?: BasicModalProps) {
          context.pushModal(container => {
            const root = getOrCreateRoot(container);
            root.render(element);
            return () => unmountRoot(container);
          }, modalProps);
        },

        registerRoute(path: string, element: ReactElement) {
          return context.registerRoute(path, container => {
            const root = getOrCreateRoot(container);
            root.render(element);
            return () => unmountRoot(container);
          });
        },

        registerBankSyncProviderSetup(
          providerSlug: string,
          renderSetup: BankSyncProviderSetupRenderer,
          modalProps?: BasicModalProps,
        ) {
          return context.registerBankSyncProviderSetup(
            providerSlug,
            (props, container) => {
              console.debug('[plugins-core] mounting bank-sync setup UI', {
                providerSlug,
                container,
              });

              try {
                const root = getOrCreateRoot(container);
                const element = renderSetup(props);
                console.debug('[plugins-core] bank-sync setup element', {
                  providerSlug,
                  elementType:
                    typeof element.type === 'string'
                      ? element.type
                      : (element.type as { name?: string })?.name,
                });
                root.render(element);
                return () => unmountRoot(container);
              } catch (error) {
                console.error(
                  '[plugins-core] failed to mount bank-sync setup UI',
                  {
                    providerSlug,
                    error,
                  },
                );
                throw error;
              }
            },
            modalProps,
          );
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
              return () => unmountRoot(container);
            },
            options,
          );
        },

        // Theme methods - passed through from host context
        registerTheme: context.registerTheme,

        // Report and spreadsheet utilities - passed through from host context
        createSpreadsheet: context.createSpreadsheet,
        makeFilters: context.makeFilters,
      };

      originalActivate(wrappedContext);
    },
  };

  return newPlugin;
}
