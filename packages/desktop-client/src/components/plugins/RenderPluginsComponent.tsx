import React, { useEffect, useRef } from 'react';

import { useFeatureFlag } from '#hooks/useFeatureFlag';
import type { PluginSlotRegistrationFn } from '#plugin/core/pluginLoader';

type RenderPluginsComponentProps = {
  toRender: Map<string, PluginSlotRegistrationFn>;
};

export function RenderPluginsComponent({
  toRender,
}: RenderPluginsComponentProps) {
  const pluginRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pluginsEnabled = useFeatureFlag('plugins');

  useEffect(() => {
    if (!pluginsEnabled) return;

    const cleanups: Array<void | (() => void)> = [];

    [...toRender.values()].forEach((plugin, index) => {
      const pluginRef = pluginRefs.current[index];
      if (pluginRef) {
        const cleanup = plugin(pluginRef);
        cleanups.push(cleanup);
      }
    });

    return () => {
      cleanups.forEach(cleanup => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
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
