import { useEffect, useState } from 'react';

import { type ActualPluginManifest } from 'plugins-core/index';
import { type ActualPluginConfigType } from 'plugins-core/types/actualPluginManifest';

import { persistPluginConfig, getPluginConfig } from './pluginStore';

export function usePluginConfig(manifest: ActualPluginManifest) {
  type ConfigType = ActualPluginConfigType<typeof manifest>;

  const [config, setConfig] = useState<ConfigType>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        setConfig(await getPluginConfig(manifest));
      } finally {
        setLoading(false);
      }
    })();
  }, [manifest]);

  async function saveConfig() {
    setLoading(true);
    try {
      await persistPluginConfig(manifest, config ?? {});
    } finally {
      setLoading(false);
    }
  }

  return { config, setConfig, saveConfig, loading };
}
