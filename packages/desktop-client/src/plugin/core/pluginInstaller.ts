import { send } from '@actual-app/core/platform/client/connection';
import {
  type ActualPluginInitialized,
  type ActualPluginManifest,
  isSyncServerPlugin,
  validateActualPluginManifest,
} from '@actual-app/plugins-core';
import JSZip from 'jszip';

import {
  fetchRelease,
  fetchWithHeader,
  parseGitHubRepoUrl,
} from './githubUtils';
import { persistPlugin } from './pluginStore';

export async function installPluginFromManifest(
  loadedPlugins: ActualPluginInitialized[],
  manifest: ActualPluginManifest,
): Promise<void> {
  try {
    const foundPlugin = loadedPlugins.find(
      plugin =>
        plugin.name === manifest.name && plugin.version === manifest.version,
    );
    if (foundPlugin) return;

    console.log(
      `Downloading plugin "${manifest.name}" v${manifest.version}...`,
    );

    if (!manifest.url) throw new Error(`Plugin ${manifest.name} has no URL`);

    const parsedRepo = parseGitHubRepoUrl(manifest.url);
    if (!parsedRepo) throw new Error(`Invalid repo ${manifest.url}`);

    const { scriptUrl } = await fetchRelease(
      parsedRepo.owner,
      parsedRepo.repo,
      `tags/${manifest.version}`,
    );

    const result = await fetchWithHeader(scriptUrl);

    // Handle error responses
    if (typeof result === 'object' && 'error' in result) {
      throw new Error(
        `Failed to download plugin script for ${manifest.name}: ${result.error}`,
      );
    }

    // Handle binary responses
    if (typeof result === 'object' && 'isBinary' in result && result.isBinary) {
      // Create blob directly from the data array
      const uint8Array = new Uint8Array(result.data);
      const blob = new Blob([uint8Array as unknown as ArrayBuffer], {
        type: 'application/zip',
      });

      console.log(`Plugin '${manifest.name}' loaded successfully.`);
      await persistPlugin(blob, manifest);
    } else {
      throw new Error(
        `Expected binary response for plugin script ${manifest.name}`,
      );
    }
  } catch (error) {
    console.error(`Error saving plugin "${manifest.name}":`, error);
    return;
  }
}

export async function installPluginFromZipFile(
  loadedPlugins: ActualPluginInitialized[],
  file: File,
): Promise<ActualPluginManifest> {
  const zipData = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(zipData);

  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error(`manifest.json not found in zip file: ${file.name}`);
  }

  const manifestText = await manifestFile.async('string');
  const manifest = validateActualPluginManifest(JSON.parse(manifestText));

  if (
    manifest.frontend &&
    (!manifest.frontend.entry.startsWith('frontend/') ||
      !zip.file(manifest.frontend.entry))
  ) {
    throw new Error(
      `Plugin '${manifest.name}' frontend files must live under frontend/.`,
    );
  }

  if (
    manifest.syncserver &&
    (!manifest.syncserver.entry.startsWith('syncserver/') ||
      !zip.file(manifest.syncserver.entry))
  ) {
    throw new Error(
      `Plugin '${manifest.name}' sync-server files must live under syncserver/.`,
    );
  }

  const alreadyInstalled = loadedPlugins.some(
    plugin =>
      plugin.name === manifest.name && plugin.version === manifest.version,
  );
  if (alreadyInstalled) {
    console.log(
      `Plugin '${manifest.name}' v${manifest.version} is already installed.`,
    );
    return manifest;
  }

  const zipBytes = new Uint8Array(zipData);

  if (isSyncServerPlugin(manifest)) {
    const serverUrl = await send('get-server-url');
    if (!serverUrl) {
      throw new Error(
        `Plugin '${manifest.name}' requires a sync server before it can be installed.`,
      );
    }

    const result = await send('plugin-sync-server-install', {
      zipBytes: Array.from(zipBytes),
    });
    console.log(`Plugin '${manifest.name}' installed on sync server.`);
    return result.manifest;
  }

  console.log(`Persisting plugin '${manifest.name}' from zip file...`);

  const blob = new Blob([zipBytes], { type: 'application/zip' });

  await persistPlugin(blob, manifest);
  console.log(`Plugin '${manifest.name}' persisted successfully.`);
  return manifest;
}
