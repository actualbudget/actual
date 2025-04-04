import { ActualPluginInitialized, ActualPluginManifest } from 'plugins-core/index';
import { fetchRelease, fetchWithHeader, parseGitHubRepoUrl } from './githubUtils';
import { getStoredPlugin, persistPlugin } from './pluginStore';

/**
 * Install a plugin from a manifest, fetching the .zip from GitHub.
 */
export async function installPluginFromManifest(
  loadedPlugins: ActualPluginInitialized[],
  manifest: ActualPluginManifest
): Promise<void> {
  try {
    const foundPlugin = loadedPlugins.find(
      plugin => plugin.name === manifest.name
    );
    if (foundPlugin) return;

    console.log(`Downloading plugin “${manifest.name}” v${manifest.version}...`);

    const parsedRepo = parseGitHubRepoUrl(manifest.url);
    if (!parsedRepo) throw new Error(`Invalid repo ${manifest.url}`);

    const { scriptUrl } = await fetchRelease(
      parsedRepo.owner,
      parsedRepo.repo,
      `tags/${manifest.version}`
    );

    const response = await fetchWithHeader(
      `http://localhost:5006/cors-proxy?url=${scriptUrl}`
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
