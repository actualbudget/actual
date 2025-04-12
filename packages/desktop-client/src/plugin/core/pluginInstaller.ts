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

    const response = await fetchWithHeader(
      `http://localhost:5006/cors-proxy?url=${scriptUrl}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to download plugin script for ${manifest.name}`);
    }

    const zipArrayBuffer = await response.arrayBuffer();
    const zipBytes = new Uint8Array(zipArrayBuffer);

    if (!zipBytes) {
      return;
    }

    const blob = new Blob([zipBytes], { type: 'application/zip' });

    console.log(`Plugin “${manifest.name}” loaded successfully.`);
    await persistPlugin(blob, manifest);
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
      `Plugin "${manifest.name}" v${manifest.version} is already installed.`,
    );
    return;
  }

  console.log(`Persisting plugin "${manifest.name}" from zip file...`);
  const zipBytes = new Uint8Array(zipData);

  const blob = new Blob([zipBytes], { type: 'application/zip' });

  await persistPlugin(blob, manifest);
  console.log(`Plugin "${manifest.name}" persisted successfully.`);
}
