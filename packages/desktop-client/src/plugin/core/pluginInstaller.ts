import JSZip from 'jszip';
import {
  type ActualPluginInitialized,
  type ActualPluginManifest,
} from 'plugins-core/index';

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
      `Downloading plugin “${manifest.name}” v${manifest.version}...`,
    );

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

      console.log(`Plugin ‘${manifest.name}’ loaded successfully.`);
      await persistPlugin(blob, manifest);
    } else {
      throw new Error(
        `Expected binary response for plugin script ${manifest.name}`,
      );
    }
  } catch (error) {
    console.error(`Error saving plugin “${manifest.name}”:`, error);
    return;
  }
}

export async function installPluginFromZipFile(
  loadedPlugins: ActualPluginInitialized[],
  file: File,
): Promise<void> {
  const zipData = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(zipData);

  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error(`manifest.json not found in zip file: ${file.name}`);
  }

  const manifestText = await manifestFile.async('string');
  const manifest: ActualPluginManifest = JSON.parse(manifestText);

  const alreadyInstalled = loadedPlugins.some(
    plugin =>
      plugin.name === manifest.name && plugin.version === manifest.version,
  );
  if (alreadyInstalled) {
    console.log(
      `Plugin ‘${manifest.name}’ v${manifest.version} is already installed.`,
    );
    return;
  }

  console.log(`Persisting plugin ‘${manifest.name}’ from zip file...`);
  const zipBytes = new Uint8Array(zipData);

  const blob = new Blob([zipBytes], { type: 'application/zip' });

  await persistPlugin(blob, manifest);
  console.log(`Plugin ‘${manifest.name}’ persisted successfully.`);
}
