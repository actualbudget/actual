// import ReactDOM from 'react-dom/client';

import {
  ActualPlugin,
  ActualPluginInitialized,
  HostContext,
} from './types/actualPlugin';

// import type {
//   ActualPlugin,
//   ActualPluginInitialized,
//   PageHookMap,
//   PluginHooks,
// } from './types/actualPlugin';

// let root: ReactDOM.Root | null = null;
// let containerToDraw: HTMLDivElement | null = null;

// export function initializePlugin(
//   plugin: ActualPlugin,
// ): ActualPluginInitialized {
//   const initializedPlugin: ActualPluginInitialized = {
//     ...plugin,
//     initialized: true,
//     hooks: {} as PluginHooks,
//   };

//   Object.entries(plugin.hooks || {}).forEach(([page, hooks]) => {
//     type PageKey = keyof PageHookMap;
//     const typedPage = page as PageKey;

//     if (!(typedPage in initializedPlugin.hooks)) {
//       initializedPlugin.hooks[typedPage] = {
//         renderableHooks: {},
//         eventHooks: {},
//       };
//     }

//     // Process renderable hooks
//     Object.entries(hooks.renderableHooks || {}).forEach(
//       ([hookName, hookFunction]) => {
//         type RenderableKey = keyof NonNullable<
//           PageHookMap[PageKey]['renderableHooks']
//         >;
//         const typedHookName = hookName as RenderableKey;

//         if (typeof hookFunction === 'function') {
//           (
//             initializedPlugin.hooks[typedPage]!.renderableHooks as Record<
//               string,
//               any
//             >
//           )[typedHookName] = (container: HTMLDivElement, args?: any) => {
//             if (!root || containerToDraw !== container) {
//               root = ReactDOM.createRoot(container);
//               containerToDraw = container;
//             }

//             const componentToDraw =
//               args !== undefined ? hookFunction(args) : hookFunction();
//             root.render(componentToDraw);
//             return '';
//           };
//         }
//       },
//     );

//     Object.entries(hooks.eventHooks || {}).forEach(
//       ([hookName, hookFunction]) => {
//         type EventKey = keyof NonNullable<PageHookMap[PageKey]['eventHooks']>;
//         const typedHookName = hookName as EventKey;

//         if (typeof hookFunction === 'function') {
//           (
//             initializedPlugin.hooks[typedPage]!.eventHooks as Record<
//               string,
//               any
//             >
//           )[typedHookName] = (params?: any) =>
//             params !== undefined ? hookFunction(params) : hookFunction();
//         }
//       },
//     );
//   });

//   return initializedPlugin;
// }

import ReactDOM from 'react-dom/client';

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
        registerSidebarMenu(element) {
          const id = context.registerSidebarMenu(container => {
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
