import { Component, createElement } from 'react';
import type { ErrorInfo, ReactElement, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { initReactI18next } from 'react-i18next';

import type { BasicModalProps } from '@actual-app/shared-types/modalProps';

import type {
  ActualPlugin,
  ActualPluginInitialized,
  BankSyncProviderLinkRenderer,
  BankSyncProviderSetupRenderer,
} from './types/actualPlugin';

const containerRoots = new WeakMap<HTMLElement, ReactDOM.Root>();

type PluginErrorBoundaryProps = {
  children?: ReactNode;
  pluginKey: string;
  surface: string;
};

type PluginErrorBoundaryState = {
  error: unknown;
  hasError: boolean;
};

function isNamedType(value: unknown): value is { name?: string } {
  return typeof value === 'object' && value != null && 'name' in value;
}

class PluginErrorBoundary extends Component<
  PluginErrorBoundaryProps,
  PluginErrorBoundaryState
> {
  state: PluginErrorBoundaryState = { error: null, hasError: false };

  static getDerivedStateFromError(error: unknown) {
    return { error, hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error('[plugins-core] Plugin render failed', {
      pluginKey: this.props.pluginKey,
      surface: this.props.surface,
      error,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return createElement(PluginErrorNotice, {
        error: this.state.error,
        pluginKey: this.props.pluginKey,
        surface: this.props.surface,
      });
    }

    return this.props.children;
  }
}

function PluginErrorNotice({
  error,
  pluginKey,
  surface,
}: {
  error: unknown;
  pluginKey: string;
  surface: string;
}) {
  const message = error instanceof Error ? error.message : String(error);

  return createElement(
    'div',
    {
      role: 'alert',
      style: {
        border: '1px solid #d97c7c',
        borderRadius: 4,
        color: '#8a1f1f',
        margin: 12,
        padding: 12,
      },
    },
    createElement(
      'div',
      { style: { fontWeight: 600 } },
      'Plugin failed to render',
    ),
    createElement(
      'div',
      { style: { fontSize: 12, marginTop: 4 } },
      `${pluginKey} (${surface})`,
    ),
    createElement(
      'pre',
      { style: { fontSize: 12, margin: '8px 0 0', whiteSpace: 'pre-wrap' } },
      message,
    ),
  );
}

function renderPluginElement({
  root,
  element,
  pluginKey,
  surface,
}: {
  root: ReactDOM.Root;
  element: ReactElement;
  pluginKey: string;
  surface: string;
}) {
  root.render(
    createElement(
      PluginErrorBoundary,
      {
        pluginKey,
        surface,
      },
      element,
    ),
  );
}

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

        //. This is part of the full plugin support system that was removed from the initial bank sync MVP
        /*
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
        */

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
                      : isNamedType(element.type)
                        ? element.type.name
                        : undefined,
                });
                renderPluginElement({
                  root,
                  element,
                  pluginKey: providerSlug,
                  surface: 'bank-sync-provider-setup',
                });
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

        registerBankSyncProviderLink(
          providerSlug: string,
          renderLink: BankSyncProviderLinkRenderer,
          modalProps?: BasicModalProps,
        ) {
          return context.registerBankSyncProviderLink(
            providerSlug,
            (props, container) => {
              console.debug('[plugins-core] mounting bank-sync link UI', {
                providerSlug,
                container,
              });

              try {
                const root = getOrCreateRoot(container);
                const element = renderLink(props);
                renderPluginElement({
                  root,
                  element,
                  pluginKey: providerSlug,
                  surface: 'bank-sync-provider-link',
                });
                return () => unmountRoot(container);
              } catch (error) {
                console.error(
                  '[plugins-core] failed to mount bank-sync link UI',
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

        //. This is part of the full plugin support system that was removed from the initial bank sync MVP
        /*
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
        */
      };

      originalActivate(wrappedContext);
    },
  };

  return newPlugin;
}
