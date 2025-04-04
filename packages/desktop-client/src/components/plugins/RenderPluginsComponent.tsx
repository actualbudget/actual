import React, { useRef, useEffect, useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';

import { Card } from '@actual-app/components/card';
import { View } from '@actual-app/components/view';

import { type PageHookMap } from '../../../../plugins-core/src/types/actualPlugin';
import { useActualPlugins } from '../../plugin/ActualPluginsProvider';

type PageKey = keyof PageHookMap;
type RenderableHooks<T extends PageKey> = NonNullable<
  PageHookMap[T]['renderableHooks']
>;
type RenderableKey<T extends PageKey> = keyof RenderableHooks<T>;
type ComponentArgs<
  T extends PageKey,
  K extends RenderableKey<T>,
> = RenderableHooks<T>[K] extends (
  container: HTMLDivElement,
  args: infer A,
) => JSX.Element
  ? A
  : never;

type RenderPluginsComponentProps<
  T extends PageKey,
  K extends RenderableKey<T>,
> = {
  page: T;
  componentName: K;
  componentArgs?: ComponentArgs<T, K>; // Dynamically inferred component arguments
  style?: CSSProperties;
};

export function RenderPluginsComponent<
  T extends PageKey,
  K extends RenderableKey<T>,
>({
  page,
  componentName,
  componentArgs,
  style = null,
}: RenderPluginsComponentProps<T, K>) {
  const { plugins } = useActualPlugins();
  const pluginRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [errors, setErrors] = useState<
    { index: number; pluginName: string; error: string }[]
  >([]);
  const [showPositionEnabled, setShowPositionEnabled] =
    useState<boolean>(false);

  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const showPosition = queryParams.get('showPosition') === 'true';
    setShowPositionEnabled(showPosition);
  }, [location]);

  useEffect(() => {
    setErrors([]);

    plugins.forEach((plugin, index) => {
      const pluginRef = pluginRefs.current[index];
      const renderableHooks = plugin.hooks?.[page]?.renderableHooks as
        | RenderableHooks<T>
        | undefined;

      if (
        pluginRef &&
        renderableHooks &&
        typeof renderableHooks[componentName] === 'function'
      ) {
        try {
          (
            renderableHooks[componentName] as (
              container: HTMLDivElement,
              args: ComponentArgs<T, K>,
            ) => JSX.Element
          )(pluginRef, componentArgs as ComponentArgs<T, K>);
        } catch (error) {
          console.error(
            `Error in plugin: ${plugin.name}, hook: ${String(componentName)}`,
            error,
          );

          setErrors(prevErrors => [
            ...prevErrors,
            { index, pluginName: plugin.name, error: (error as Error).message },
          ]);
        }
      }
    });
  }, [plugins, page, componentName, componentArgs]);

  return (
    <View style={{ flexGrow: 1, ...style }}>
      {showPositionEnabled && (
        <Card
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          [{page}.{String(componentName)}]
        </Card>
      )}
      {plugins.map((_, index) => {
        const error = errors.find(e => e.index === index);

        return error ? (
          <Card
            key={`error-${index}`}
            style={{
              backgroundColor: '#ffe5e5',
              padding: 10,
              borderRadius: 6,
              marginBottom: 5,
            }}
          >
            <strong style={{ color: '#d9534f' }}>
              {error.pluginName} - {String(componentName)}
            </strong>
            <p style={{ color: '#b22222' }}>{error.error}</p>
          </Card>
        ) : (
          <div key={index} ref={el => (pluginRefs.current[index] = el)} />
        );
      })}
    </View>
  );
}
