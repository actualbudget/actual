import React, { useRef, useEffect } from 'react';

import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { type PluginSidebarRegistrationFn } from '@desktop-client/plugin/core/pluginLoader';

type RenderPluginsComponentProps = {
  toRender: Map<string, PluginSidebarRegistrationFn>;
};

export function RenderPluginsComponent({
  toRender,
}: RenderPluginsComponentProps) {
  const pluginRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [pluginsEnabled] = useGlobalPref('plugins');

  useEffect(() => {
    if (!pluginsEnabled) return;

    [...toRender.values()].forEach((plugin, index) => {
      const pluginRef = pluginRefs.current[index];
      if (pluginRef) {
        plugin(pluginRef);
      }
    });
  }, [toRender, pluginsEnabled]);

  return (
    pluginsEnabled && (
      <>
        {[...toRender.entries()].map(([key], index) => (
          <div
            key={key}
            ref={el => {
              pluginRefs.current[index] = el;
            }}
          />
        ))}
      </>
    )
  );
}
