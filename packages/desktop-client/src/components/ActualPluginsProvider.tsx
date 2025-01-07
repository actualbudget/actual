import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { getDatabase } from 'loot-core/platform/server/indexeddb';
import { type ActualPluginStored } from 'loot-core/types/models/actual-plugin-stored';

import {
  type ActualPluginManifest,
  type ActualPlugin,
  type ActualPluginEntry,
} from '../../../plugins-shared/src';
import { useFeatureFlag } from '../hooks/useFeatureFlag';

// Context and Provider
type ActualPluginsContextType = {
  plugins: ActualPlugin[];
  pluginStore: ActualPluginStored[];
  loadPlugins: () => Promise<void>;
  refreshPluginStore: () => Promise<void>;
};

const ActualPluginsContext = createContext<
  ActualPluginsContextType | undefined
>(undefined);

type ActualPluginsProviderProps = {
  children: ReactNode;
};
export function ActualPluginsProvider({
  children,
}: ActualPluginsProviderProps) {
  const pluginsEnabled = useFeatureFlag('plugins');
  const [plugins, setPlugins] = useState<ActualPlugin[]>([]);
  const [pluginStore, setPluginStore] = useState<ActualPluginStored[]>([]);

  const refreshPluginStore = useCallback(async () => {
    setPluginStore(await getAllPlugins());
  }, []);

  const loadPlugins = useCallback(async () => {
    try {
      const allPlugins = await getAllPlugins();

      const fullPlugins = [];
      for (const plugin of allPlugins) {
        const loadedPlugin = await loadPluginFromRepo(plugins, plugin.url);
        if (loadedPlugin) {
          fullPlugins.push(loadedPlugin);
        }
      }
      setPlugins(fullPlugins as ActualPlugin[]);
      await refreshPluginStore();
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  }, [plugins, refreshPluginStore]);

  useEffect(() => {
    if (pluginsEnabled && plugins.length === 0) {
      loadPlugins();
      refreshPluginStore();
    }
  }, [pluginsEnabled, plugins, loadPlugins, refreshPluginStore]);

  return (
    <ActualPluginsContext.Provider
      value={{ plugins, loadPlugins, pluginStore, refreshPluginStore }}
    >
      {children}
    </ActualPluginsContext.Provider>
  );
}

// Hook
export const useActualPlugins = () => {
  const context = useContext(ActualPluginsContext);
  if (!context) {
    throw new Error(
      'useActualPlugins must be used within an ActualPluginsProvider',
    );
  }
  return context;
};

async function loadPluginScript(
  scriptBlob: Blob,
  manifest: ActualPluginManifest,
): Promise<ActualPlugin | null> {
  const scriptURL = URL.createObjectURL(scriptBlob);
  const scriptCode = await scriptBlob.text();
  const pluginModule = await import(/* @vite-ignore */ scriptURL);
  const db = await getDatabase();

  if (pluginModule?.default) {
    const pluginEntry: ActualPluginEntry = pluginModule.default;

    if (manifest.pluginType === 'client') {
      const plugin = pluginEntry(React);
      console.log(
        `Plugin “${manifest.name}” v${manifest.version} loaded successfully.`,
      );
      const transaction = db.transaction(['plugins'], 'readwrite');
      const objectStore = transaction.objectStore('plugins');
      const storedPlugin: ActualPluginStored = manifest as ActualPluginStored;
      storedPlugin.plugin = scriptCode;

      objectStore.put(storedPlugin);

      return plugin;
    }

    return null;
  }
  throw new Error('Plugin script does not export a default object.');
}

type GitHubAsset = {
  name: string;
  browser_download_url: string;
};
export async function fetchRelease(
  owner: string,
  repo: string,
  releasePath: string,
): Promise<{ version: string; scriptUrl: string; manifestUrl: string }> {
  const apiUrl = `https://cors-anywhere.herokuapp.com/https://api.github.com/repos/${owner}/${repo}/releases/${releasePath}`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch release metadata for ${repo}`);
  }

  const releaseData = await response.json();
  const version = releaseData.tag_name;
  const scriptUrl = releaseData.assets.filter(
    (f: GitHubAsset) => f.name === 'index.es.js',
  )[0]?.browser_download_url;
  const manifestUrl = releaseData.assets.filter(
    (f: GitHubAsset) => f.name === 'manifest.json',
  )[0]?.browser_download_url;

  return { version, scriptUrl, manifestUrl };
}

export function parseGitHubRepoUrl(
  url: string,
): { owner: string; repo: string } | null {
  try {
    const parsedUrl = new URL(url);

    if (!parsedUrl.hostname.includes('github.com')) {
      throw new Error('Not a valid GitHub URL');
    }

    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      const owner = pathParts[0];
      const repo = pathParts[1];
      return { owner, repo };
    }
    throw new Error('URL does not contain owner and repository name');
  } catch (error) {
    console.error(`Error parsing GitHub URL: ${url}`, error);
    return null;
  }
}

async function loadPluginFromRepo(
  loadedPlugins: ActualPlugin[],
  repo: string,
): Promise<ActualPlugin | null> {
  try {
    const parsedRepo = parseGitHubRepoUrl(repo);
    if (parsedRepo == null) throw new Error(`Invalid repo ${repo}`);

    console.log(`Checking for updates for plugin ${repo}...`);

    const {
      version: latestVersion,
      scriptUrl,
      manifestUrl,
    } = await fetchRelease(parsedRepo.owner, parsedRepo.repo, 'latest');

    let response = await fetch(
      `https://cors-anywhere.herokuapp.com/${manifestUrl}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to download plugin manifest for ${repo}`);
    }

    const manifest = (await response.json()) as ActualPluginManifest;

    const foundPlugin = loadedPlugins.find(
      plugin => plugin.name === manifest.name,
    );
    if (foundPlugin) return foundPlugin;

    const storedPlugin = await getStoredPlugin(manifest);

    let indexContent = null;
    if (!storedPlugin || storedPlugin.version !== latestVersion) {
      console.log(`Downloading plugin “${repo}” v${latestVersion}...`);
      //need to change the cors proxy at some point:
      response = await fetch(
        `https://cors-anywhere.herokuapp.com/${scriptUrl}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to download plugin script for ${repo}`);
      }

      indexContent = await response.text();
    } else {
      indexContent = await storedPlugin.plugin;
      console.log(
        `Using cached version of plugin “${repo}” v${latestVersion}...`,
      );
    }

    if (!indexContent) {
      return null;
    }

    const indexJsBlob = new Blob([indexContent], {
      type: 'application/javascript',
    });

    console.log(`Plugin “${repo}” loaded successfully.`);
    return await loadPluginScript(indexJsBlob, manifest);
  } catch (error) {
    console.error(`Error loading plugin “${repo}”:`, error);
    return null;
  }
}

async function getStoredPlugin(
  manifest: ActualPluginManifest,
): Promise<ActualPluginManifest | null> {
  const db = await getDatabase(); // Open the database
  const transaction = db.transaction(['plugins'], 'readonly');
  const objectStore = transaction.objectStore('plugins');

  return new Promise((resolve, reject) => {
    const req = objectStore.get(manifest.url);

    req.onsuccess = () => {
      resolve(req.result || null); // Resolve with the result
    };

    req.onerror = () => {
      reject(req.error); // Reject with the error
    };
  });
}

async function getAllPlugins(): Promise<ActualPluginStored[]> {
  const db = await getDatabase(); // Open the database
  const transaction = db.transaction(['plugins'], 'readonly');
  const objectStore = transaction.objectStore('plugins');

  return new Promise((resolve, reject) => {
    const req = objectStore.getAll();

    req.onsuccess = () => {
      resolve(req.result); // Resolve with the array of rows
    };

    req.onerror = () => {
      reject(req.error); // Reject with the error
    };
  });
}

export async function installPluginFromManifest(
  loadedPlugins: ActualPlugin[],
  manifest: ActualPluginManifest,
): Promise<ActualPlugin | null> {
  try {
    const foundPlugin = loadedPlugins.find(
      plugin => plugin.name === manifest.name,
    );
    if (foundPlugin) return foundPlugin;

    console.log(
      `Downloading plugin “${manifest.name}” v${manifest.version}...`,
    );

    const parsedRepo = parseGitHubRepoUrl(manifest.url);
    if (parsedRepo == null) throw new Error(`Invalid repo ${manifest.url}`);

    const { scriptUrl } = await fetchRelease(
      parsedRepo.owner,
      parsedRepo.repo,
      `tags/${manifest.version}`,
    );

    //need to change the cors proxy at some point:
    const response = await fetch(
      `https://cors-anywhere.herokuapp.com/${scriptUrl}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to download plugin script for ${manifest.name}`);
    }

    const indexContent = await response.text();

    if (!indexContent) {
      return null;
    }

    const indexJsBlob = new Blob([indexContent], {
      type: 'application/javascript',
    });

    console.log(`Plugin “${manifest.name}” loaded successfully.`);
    const loadedPlugin = await loadPluginScript(indexJsBlob, manifest);
    if (loadedPlugin) {
      loadedPlugins.push(loadedPlugin);
    }
    return loadedPlugin;
  } catch (error) {
    console.error(`Error loading plugin “${manifest.name}”:`, error);
    return null;
  }
}
