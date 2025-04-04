import { type PageHookMap } from '../../../../plugins-core/src/types/actualPlugin';
import { useActualPlugins } from '../../plugin/ActualPluginsProvider';

type PageKey = keyof PageHookMap;
type EventHooks<T extends PageKey> = NonNullable<PageHookMap[T]['eventHooks']>;
type EventHookKey<T extends PageKey> = keyof EventHooks<T>;
type EventHookArgs<
  T extends PageKey,
  K extends EventHookKey<T>,
> = EventHooks<T>[K] extends (args: infer A) => any ? A : never;

export function usePluginEventHook<T extends PageKey>(defaultPage: T) {
  const { plugins } = useActualPlugins();

  function pluginHook<K extends EventHookKey<T>>(eventName: K): void;
  function pluginHook<K extends EventHookKey<T>>(
    eventName: K,
    eventArgs: EventHookArgs<T, K>,
  ): void;
  function pluginHook<K extends EventHookKey<T>>(
    eventName: K,
    eventArgs?: EventHookArgs<T, K>,
  ) {
    if (plugins.length === 0) return;

    plugins.forEach(plugin => {
      const eventHooks = plugin.hooks?.[defaultPage]?.eventHooks as
        | EventHooks<T>
        | undefined;

      if (eventHooks && typeof eventHooks[eventName] === 'function') {
        try {
          if (eventArgs !== undefined) {
            (eventHooks[eventName] as (args: EventHookArgs<T, K>) => any)(
              eventArgs,
            );
          } else {
            (eventHooks[eventName] as () => any)();
          }
        } catch (error) {
          console.error(
            `Error in plugin: ${plugin.name}, event hook: ${String(eventName)}`,
            error,
          );
        }
      }
    });
  }

  return pluginHook;
}
