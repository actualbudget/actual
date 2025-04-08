// import ReactDOM from 'react-dom/client';

import ReactDOM from 'react-dom/client';

import {
  ActualPlugin,
  ActualPluginInitialized,
} from './types/actualPlugin';

export function initializePlugin(
  plugin: ActualPlugin,
): ActualPluginInitialized {
  // Wrap the activate method
  const originalActivate = plugin.activate;

  const newPlugin: ActualPluginInitialized = {
    ...plugin,
    initialized: true,
    activate: context => {
      const wrappedContext = {
        ...context,
        registerMenu(position, element: JSX.Element) {
          const id = context.registerMenu(position, container => {
            const root = ReactDOM.createRoot(container);
            root.render(element);
          });

          return id;
        },
        pushModal(element: JSX.Element, modalProps) {
          context.pushModal(container => {
            const root = ReactDOM.createRoot(container);
            root.render(element);
          }, modalProps);
        },
        registerRoute(path, element: JSX.Element) {
          const id = context.registerRoute(path, container => {
            const root = ReactDOM.createRoot(container);
            root.render(element);
          });

          return id;
        },
      };

      // Call the original activate with the wrapped context
      originalActivate(wrappedContext);
    },
  };

  return newPlugin;
}
