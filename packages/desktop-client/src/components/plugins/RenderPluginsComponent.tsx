import React, { useRef, useEffect } from 'react';

import { type PluginSidebarRegistrationFn } from '../../plugin/core/pluginLoader';

type RenderPluginsComponentProps = {
  toRender: Map<string, PluginSidebarRegistrationFn>;
};

export function RenderPluginsComponent({
  toRender,
}: RenderPluginsComponentProps) {
  const pluginRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    [...toRender.values()].forEach((plugin, index) => {
      const pluginRef = pluginRefs.current[index];
      if (pluginRef) {
        plugin(pluginRef);
      }
    });
  }, [toRender]);

  return (
    <>
      {[...toRender.entries()].map(([key], index) => (
        <div key={key} ref={el => (pluginRefs.current[index] = el)} />
      ))}
    </>
  );
}
