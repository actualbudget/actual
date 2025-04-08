import React, { useRef, useEffect } from 'react';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { type PluginSidebarRegistrationFn } from '../../plugin/core/pluginLoader';

type RenderPluginsComponentProps = {
  toRender: Map<string, PluginSidebarRegistrationFn>;
};

export function RenderPluginsComponent({
  toRender,
}: RenderPluginsComponentProps) {
  const pluginRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pluginsEnabled = useFeatureFlag('plugins');

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
          <div key={key} ref={el => (pluginRefs.current[index] = el)} />
        ))}
      </>
    )
  );
}
