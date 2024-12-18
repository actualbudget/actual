import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  type ActualPlugin,
  type ActualPluginEntry,
} from '../../../plugins-shared/src';

// Context and Provider
type ActualPluginsContextType = {
  plugins: ActualPlugin[] | null;
  loadPlugins: () => Promise<void>;
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
  const [plugins, setPlugins] = useState<ActualPlugin[] | null>(null);

  const loadPlugins = async () => {
    try {
      const loaded = await Promise.all([
        loadPluginFromRepo('https://github.com/actual-plugins/example'),
      ]);
      setPlugins(loaded.filter(Boolean) as ActualPlugin[]);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  return (
    <ActualPluginsContext.Provider value={{ plugins, loadPlugins }}>
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

// Utility Functions
async function loadPluginScript(scriptBlob: Blob): Promise<ActualPlugin> {
  window.React = React;

  const scriptURL = URL.createObjectURL(scriptBlob);
  const pluginModule = await import(/* @vite-ignore */ scriptURL);

  if (pluginModule?.default) {
    const pluginEntry: ActualPluginEntry = pluginModule.default;
    const plugin = pluginEntry(React);
    console.log(
      `Plugin “${plugin.name}” v${plugin.version} loaded successfully.`,
    );
    return plugin;
  }
  throw new Error('Plugin script does not export a default object.');
}

// async function fetchLatestRelease(
//   owner: string,
//   repo: string,
// ): Promise<{ version: string; zipUrl: string }> {
//   const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
//   const response = await fetch(apiUrl);
//   if (!response.ok) {
//     throw new Error(`Failed to fetch release metadata for ${repo}`);
//   }

//   const releaseData = await response.json();
//   const version = releaseData.tag_name;
//   const zipUrl = releaseData.assets.filter(f => f.name.includes('.zip'))[0]
//     ?.browser_download_url;

//   return { version, zipUrl };
// }

// function parseGitHubRepoUrl(
//   url: string,
// ): { owner: string; repo: string } | null {
//   try {
//     const parsedUrl = new URL(url);

//     if (!parsedUrl.hostname.includes('github.com')) {
//       throw new Error('Not a valid GitHub URL');
//     }

//     const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
//     if (pathParts.length >= 2) {
//       const owner = pathParts[0];
//       const repo = pathParts[1];
//       return { owner, repo };
//     }
//     throw new Error('URL does not contain owner and repository name');
//   } catch (error) {
//     console.error(`Error parsing GitHub URL: ${url}`, error.message);
//     return null;
//   }
// }

async function loadPluginFromRepo(repo: string): Promise<ActualPlugin | null> {
  try {
    // const parsedRepo = parseGitHubRepoUrl(repo);
    // if (parsedRepo == null) throw new Error(`Invalid repo ${repo}`);

    // console.log(`Checking for updates for plugin ${repo}...`);

    // const { version: latestVersion } = await fetchLatestRelease(
    //   parsedRepo.owner,
    //   parsedRepo.repo,
    // );

    // console.log(`Downloading plugin “${repo}” v${latestVersion}...`);
    const response = await fetch('/index.es.js');

    if (!response.ok) {
      throw new Error(`Failed to download plugin script for ${repo}`);
    }

    const indexJsBlob = await response.blob();

    console.log(`Plugin “${repo}” loaded successfully.`);
    return await loadPluginScript(indexJsBlob);
  } catch (error) {
    console.error(`Error loading plugin “${repo}”:`, error);
    return null;
  }
}
