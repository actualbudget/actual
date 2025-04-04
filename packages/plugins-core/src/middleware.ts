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
        registerSidebarMenu(element: JSX.Element) {
          const id = context.registerSidebarMenu(container => {
            const root = ReactDOM.createRoot(container);
            root.render(element);
          });

          return id;
        },
        pushModal(element: JSX.Element) {
          context.pushModal(container => {
            const root = ReactDOM.createRoot(container);
            root.render(element);
          })
        }
      };

      // Call the original activate with the wrapped context
      originalActivate(wrappedContext);
    },
  };

  return newPlugin;
}
