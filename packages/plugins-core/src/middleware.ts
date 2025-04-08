import ReactDOM from 'react-dom/client';
import {
  ActualPlugin,
  ActualPluginInitialized,
} from './types/actualPlugin';

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
      const wrappedContext = {
        ...context,

        registerMenu(position, element: JSX.Element) {
          return context.registerMenu(position, container => {
            const root = getOrCreateRoot(container, pluginId);
            root.render(element);
          });
        },

        pushModal(element: JSX.Element, modalProps) {
          context.pushModal(container => {
            const root = getOrCreateRoot(container, pluginId);
            root.render(element);
          }, modalProps);
        },

        registerRoute(path, element: JSX.Element) {
          return context.registerRoute(path, container => {
            const root = getOrCreateRoot(container, pluginId);
            root.render(element);
          });
        },
      };

      originalActivate(wrappedContext);
    },
  };

  return newPlugin;
}
