import fs from 'fs';
import { randomUUID } from 'node:crypto';
import os from 'os';
import path from 'path';

import createDebug from 'debug';

import { getErrorMessage } from './plugin-errors.js';
import {
  cleanupExtractedPlugin,
  extractZipPlugin as extractZipPluginArchive,
  findInstallablePlugins,
  getPluginSlugFromManifest,
  readPluginManifest,
} from './plugin-loader.js';
import type { PluginSourceCandidate } from './plugin-loader.js';
import { validateManifest } from './plugin-manifest.js';
import type { Manifest } from './plugin-manifest.js';
import { sanitizePluginSlug } from './plugin-paths.js';

type PluginSource = {
  slug: string;
  manifest: Manifest;
  path: string;
  zipPath?: string | null;
};

const debug = createDebug('actual:plugins');

export type PluginManager = ReturnType<typeof createPluginManager>;

function createPluginManager(pluginsDir: string) {
  const extractedPlugins = new Map<string, string>();
  const pluginSources = new Map<string, PluginSource>();
  let operationQueue: Promise<unknown> = Promise.resolve();

  /**
   * Extract a zip file to a temporary directory
   */
  function extractZipPlugin(zipPath: string, pluginSlug: string): string {
    return extractZipPluginArchive(zipPath, pluginSlug, extractedPlugins);
  }

  /**
   * Get plugin slug from manifest
   */
  function getPluginSlugFromPluginManifest(pluginPath: string): string | null {
    return getPluginSlugFromManifest(pluginPath);
  }

  /**
   * Load all plugins from the plugins directory
   * Supports both subdirectories and .zip files
   * On slug clash, loads the first plugin and warns about duplicates
   */
  async function loadPlugins(): Promise<void> {
    return enqueue(async () => {
      await shutdownNow();
      await loadPluginsNow();
    });
  }

  async function loadPluginsNow(): Promise<void> {
    if (!fs.existsSync(pluginsDir)) {
      console.log('Plugins directory does not exist:', pluginsDir);
      return;
    }

    const loadedSlugs = new Set<string>();
    const pluginsToLoad = findInstallablePlugins(pluginsDir, extractedPlugins);

    for (const plugin of pluginsToLoad) {
      try {
        if (skipDuplicatePlugin(plugin, loadedSlugs)) {
          continue;
        }

        await loadPluginNow(plugin.slug, plugin.path, plugin.zipPath);
        loadedSlugs.add(plugin.slug);
        console.log(`✅ Loaded plugin: ${plugin.slug} (from ${plugin.name})`);

        debugPluginMetadata(plugin.slug);
      } catch (error) {
        console.error(
          `Failed to load plugin ${plugin.name}:`,
          getErrorMessage(error),
        );

        cleanupExtractedPlugin(plugin, extractedPlugins);
      }
    }
  }

  /**
   * Load a single plugin by slug
   * @param {string} pluginSlug - The plugin identifier
   * @param {string} pluginPath - Path to the plugin directory
   * @param {boolean} _isExtracted - Whether this plugin was extracted from a zip
   */
  async function loadPlugin(
    pluginSlug: string,
    pluginPath: string,
    _isExtracted = false,
    zipPath: string | null | undefined = null,
  ): Promise<void> {
    return enqueue(() => loadPluginNow(pluginSlug, pluginPath, zipPath));
  }

  async function loadPluginNow(
    pluginSlug: string,
    pluginPath: string,
    zipPath: string | null | undefined = null,
  ): Promise<void> {
    const manifest = readPluginManifest(pluginSlug, pluginPath);
    rememberPluginSource(pluginSlug, manifest, pluginPath, zipPath);
  }

  function getInstalledPluginManifests(): Array<Manifest & { source: string }> {
    return Array.from(pluginSources.values()).map(source => ({
      ...source.manifest,
      source: 'sync-server',
    }));
  }

  async function installPluginZip(zipBuffer: Buffer): Promise<Manifest> {
    return enqueue(() => installPluginZipNow(zipBuffer));
  }

  async function installPluginZipNow(zipBuffer: Buffer): Promise<Manifest> {
    fs.mkdirSync(pluginsDir, { recursive: true });

    const tempSlug = `upload-${randomUUID()}`;
    const tempZipPath = path.join(os.tmpdir(), `${tempSlug}.zip`);
    fs.writeFileSync(tempZipPath, zipBuffer);

    let extractedPath: string | null = null;
    try {
      extractedPath = extractZipPlugin(tempZipPath, tempSlug);
      const manifest = validateManifest(
        JSON.parse(
          fs.readFileSync(path.join(extractedPath, 'manifest.json'), 'utf8'),
        ),
      );
      const pluginSlug = sanitizePluginSlug(manifest.name);

      if (pluginSources.has(pluginSlug)) {
        throw new Error(`Plugin ${pluginSlug} is already installed`);
      }

      const zipPath = getPluginZipPath(pluginSlug, manifest.version);
      fs.writeFileSync(zipPath, zipBuffer);

      await loadPluginNow(pluginSlug, extractedPath, zipPath);
      extractedPlugins.delete(tempSlug);
      extractedPlugins.set(`${pluginSlug}-${manifest.version}`, extractedPath);
      extractedPath = null;

      return manifest;
    } finally {
      if (extractedPath) {
        fs.rmSync(extractedPath, { recursive: true, force: true });
      }
      fs.rmSync(tempZipPath, { force: true });
      extractedPlugins.delete(tempSlug);
    }
  }

  async function reloadPlugins(): Promise<void> {
    return enqueue(() => reloadPluginsNow());
  }

  async function reloadPluginsNow(): Promise<void> {
    await shutdownNow();
    await loadPluginsNow();
  }

  /**
   * Debug loaded plugin metadata when DEBUG=actual:plugins is set.
   */
  function debugPluginMetadata(pluginSlug: string): void {
    const source = pluginSources.get(pluginSlug);
    if (!source) {
      return;
    }

    debug(`Plugin: ${pluginSlug}`);
    debug(`  Version: ${source.manifest.version}`);
    debug(`  Description: ${source.manifest.description || 'N/A'}`);
    debug(''); // Empty line for readability
  }

  /**
   * Shutdown all plugins
   */
  async function shutdown(): Promise<void> {
    return enqueue(() => shutdownNow());
  }

  async function shutdownNow(): Promise<void> {
    pluginSources.clear();

    for (const [pluginSlug, extractPath] of extractedPlugins) {
      try {
        if (fs.existsSync(extractPath)) {
          fs.rmSync(extractPath, { recursive: true, force: true });
          console.log(`Cleaned up extracted plugin: ${pluginSlug}`);
        }
      } catch (error) {
        console.error(
          `Failed to clean up plugin ${pluginSlug}:`,
          getErrorMessage(error),
        );
      }
    }
    extractedPlugins.clear();
  }

  function skipDuplicatePlugin(
    plugin: PluginSourceCandidate,
    loadedSlugs: Set<string>,
  ): boolean {
    if (!loadedSlugs.has(plugin.slug)) {
      return false;
    }

    console.warn(
      `⚠️  Plugin slug clash detected: "${plugin.slug}" from "${plugin.name}" ` +
        `is already loaded. Skipping this plugin.`,
    );
    cleanupExtractedPlugin(plugin, extractedPlugins);
    return true;
  }

  function rememberPluginSource(
    pluginSlug: string,
    manifest: Manifest,
    pluginPath: string,
    zipPath: string | null | undefined,
  ): void {
    pluginSources.set(pluginSlug, {
      slug: pluginSlug,
      manifest,
      path: pluginPath,
      zipPath,
    });
  }

  function getPluginZipPath(pluginSlug: string, pluginVersion: string): string {
    if (!isPluginArchiveSegment(pluginVersion)) {
      throw new Error('Plugin version cannot contain path separators');
    }

    const zipPath = path.join(pluginsDir, `${pluginSlug}-${pluginVersion}.zip`);
    if (fs.existsSync(zipPath)) {
      throw new Error(
        `Plugin ${pluginSlug}@${pluginVersion} is already installed`,
      );
    }

    return zipPath;
  }

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = operationQueue.then(task, task);
    operationQueue = result.catch(() => undefined);
    return result;
  }

  return {
    extractZipPlugin,
    getPluginSlugFromManifest: getPluginSlugFromPluginManifest,
    loadPlugins,
    loadPlugin,
    getInstalledPluginManifests,
    installPluginZip,
    reloadPlugins,
    debugPluginMetadata,
    shutdown,
  };
}

function isPluginArchiveSegment(value: string): boolean {
  return value !== '' && Array.from(value).every(isPluginArchiveCharacter);
}

function isPluginArchiveCharacter(character: string): boolean {
  return (
    (character >= 'a' && character <= 'z') ||
    (character >= 'A' && character <= 'Z') ||
    (character >= '0' && character <= '9') ||
    character === '.' ||
    character === '_' ||
    character === '-' ||
    character === '+'
  );
}

export { createPluginManager };
