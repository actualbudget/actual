import fs from 'fs';
import { randomUUID } from 'node:crypto';
import os from 'os';
import path from 'path';

import createDebug from 'debug';

import {
  assertDevPluginRegistrationAllowed,
  buildDevPluginUrl,
  getErrorMessage,
  isFrontendPlugin,
  isPluginPathInsideDir,
  isSyncServerPlugin,
  normalizeDevPluginLocator,
  normalizeDevPluginPath,
  resolvePluginPath,
  sanitizePluginSlug,
  validateManifest,
} from './plugin-helpers.js';
import {
  cleanupExtractedPlugin,
  extractZipPlugin,
  findInstallablePlugins,
  getPluginSlugFromManifest,
  readPluginManifest,
  resolveSyncServerEntry,
} from './plugin-loader.js';
import type {
  DevPluginLocatorInput,
  FrontendPluginFile,
  Manifest,
  PluginSource,
  PluginSourceCandidate,
} from './plugin-types.js';

const debug = createDebug('actual:config');
const pluginArchiveSegmentPattern = /^[a-zA-Z0-9._-]+$/;

class PluginManager {
  pluginsDir: string;
  extractedPlugins: Map<string, string>;
  pluginSources: Map<string, PluginSource>;

  constructor(pluginsDir: string) {
    this.pluginsDir = pluginsDir;
    this.extractedPlugins = new Map(); // Track extracted zip plugins for cleanup
    this.pluginSources = new Map();
  }

  /**
   * Extract a zip file to a temporary directory
   */
  extractZipPlugin(zipPath: string, pluginSlug: string): string {
    return extractZipPlugin(zipPath, pluginSlug, this.extractedPlugins);
  }

  /**
   * Get plugin slug from manifest
   */
  getPluginSlugFromManifest(pluginPath: string): string | null {
    return getPluginSlugFromManifest(pluginPath);
  }

  /**
   * Load all plugins from the plugins directory
   * Supports both subdirectories and .zip files
   * On slug clash, loads the first plugin and warns about duplicates
   */
  async loadPlugins(): Promise<void> {
    if (!fs.existsSync(this.pluginsDir)) {
      console.log('Plugins directory does not exist:', this.pluginsDir);
      return;
    }

    const loadedSlugs = new Set<string>();
    const pluginsToLoad = findInstallablePlugins(
      this.pluginsDir,
      this.extractedPlugins,
    );

    for (const plugin of pluginsToLoad) {
      try {
        if (this.skipDuplicatePlugin(plugin, loadedSlugs)) {
          continue;
        }

        await this.loadPlugin(
          plugin.slug,
          plugin.path,
          plugin.type === 'zip',
          plugin.zipPath,
        );
        loadedSlugs.add(plugin.slug);
        console.log(`✅ Loaded plugin: ${plugin.slug} (from ${plugin.name})`);

        this.debugPluginMetadata(plugin.slug);
      } catch (error) {
        console.error(
          `Failed to load plugin ${plugin.name}:`,
          getErrorMessage(error),
        );

        cleanupExtractedPlugin(plugin, this.extractedPlugins);
      }
    }
  }

  /**
   * Load a single plugin by slug
   * @param {string} pluginSlug - The plugin identifier
   * @param {string} pluginPath - Path to the plugin directory
   * @param {boolean} _isExtracted - Whether this plugin was extracted from a zip
   */
  async loadPlugin(
    pluginSlug: string,
    pluginPath: string,
    _isExtracted = false,
    zipPath: string | null | undefined = null,
  ): Promise<void> {
    const manifest = readPluginManifest(pluginSlug, pluginPath);

    if (isSyncServerPlugin(manifest)) {
      resolveSyncServerEntry(pluginSlug, pluginPath, manifest);
    }

    this.rememberPluginSource(pluginSlug, manifest, pluginPath, zipPath);
  }

  getInstalledPluginManifests(): Array<Manifest & { source: string }> {
    return Array.from(this.pluginSources.values()).map(source => ({
      ...source.manifest,
      source: 'sync-server',
    }));
  }

  getFrontendPluginFiles(pluginSlug: string): FrontendPluginFile[] {
    const source = this.pluginSources.get(pluginSlug);
    if (!source) {
      throw new Error(`Plugin '${pluginSlug}' is not installed`);
    }

    if (!isFrontendPlugin(source.manifest)) {
      throw new Error(`Plugin '${pluginSlug}' has no frontend capability`);
    }

    const frontendDir = path.join(source.path, 'frontend');
    if (!fs.existsSync(frontendDir)) {
      throw new Error(`Plugin '${pluginSlug}' has no frontend directory`);
    }

    const files: FrontendPluginFile[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(entryPath);
        } else {
          const relativePath = path.relative(frontendDir, entryPath);
          files.push({
            name: relativePath,
            content: fs.readFileSync(entryPath).toString('base64'),
            encoding: 'base64',
          });
        }
      }
    };

    walk(frontendDir);
    return files;
  }

  async installPluginZip(zipBuffer: Buffer): Promise<Manifest> {
    fs.mkdirSync(this.pluginsDir, { recursive: true });

    const tempSlug = `upload-${randomUUID()}`;
    const tempZipPath = path.join(os.tmpdir(), `${tempSlug}.zip`);
    fs.writeFileSync(tempZipPath, zipBuffer);

    let extractedPath: string | null = null;
    try {
      extractedPath = this.extractZipPlugin(tempZipPath, tempSlug);
      const manifest = validateManifest(
        JSON.parse(
          fs.readFileSync(path.join(extractedPath, 'manifest.json'), 'utf8'),
        ),
      );
      const pluginSlug = sanitizePluginSlug(manifest.name);

      if (isFrontendPlugin(manifest)) {
        const frontendDir = resolvePluginPath(extractedPath, 'frontend');
        const frontendEntry = resolvePluginPath(
          extractedPath,
          manifest.frontend.entry,
        );
        if (
          !isPluginPathInsideDir(
            extractedPath,
            'frontend',
            manifest.frontend.entry,
          ) ||
          !fs.existsSync(frontendDir) ||
          !fs.existsSync(frontendEntry)
        ) {
          throw new Error(
            `Plugin ${manifest.name} frontend files must live under frontend/`,
          );
        }
      }

      if (isSyncServerPlugin(manifest)) {
        const syncserverEntry = resolvePluginPath(
          extractedPath,
          manifest.syncserver.entry,
        );
        if (
          !isPluginPathInsideDir(
            extractedPath,
            'syncserver',
            manifest.syncserver.entry,
          ) ||
          !fs.existsSync(syncserverEntry)
        ) {
          throw new Error(
            `Plugin ${manifest.name} sync-server files must live under syncserver/`,
          );
        }
      }

      const zipPath = this.getPluginZipPath(pluginSlug, manifest.version);
      fs.writeFileSync(zipPath, zipBuffer);

      await this.reloadPlugins();
      return manifest;
    } finally {
      if (extractedPath) {
        fs.rmSync(extractedPath, { recursive: true, force: true });
      }
      fs.rmSync(tempZipPath, { force: true });
      this.extractedPlugins.delete(tempSlug);
    }
  }

  async registerDevPlugin(
    devPluginLocator: DevPluginLocatorInput,
  ): Promise<Manifest> {
    assertDevPluginRegistrationAllowed();
    const manifestLocator = normalizeDevPluginLocator(devPluginLocator);
    const manifestUrlForFetch = buildDevPluginUrl(manifestLocator);
    const manifestResponse = await fetch(manifestUrlForFetch);
    if (!manifestResponse.ok) {
      throw new Error(
        `Failed to fetch dev plugin manifest: ${manifestUrlForFetch}`,
      );
    }

    const manifest = validateManifest(await manifestResponse.json());

    if (!isSyncServerPlugin(manifest)) {
      return manifest;
    }

    const pluginSlug = sanitizePluginSlug(manifest.name);
    const devPath = path.join(os.tmpdir(), 'actual-dev-plugins', pluginSlug);
    if (
      !isPluginPathInsideDir(devPath, 'syncserver', manifest.syncserver.entry)
    ) {
      throw new Error(
        `Plugin ${manifest.name} sync-server files must live under syncserver/`,
      );
    }
    fs.rmSync(devPath, { recursive: true, force: true });
    fs.mkdirSync(path.join(devPath, 'syncserver'), { recursive: true });
    fs.writeFileSync(
      path.join(devPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
    );

    const parsedEntryUrl = new URL(
      manifest.syncserver.entry,
      manifestUrlForFetch,
    );
    const entryLocator = {
      ...manifestLocator,
      path: normalizeDevPluginPath(parsedEntryUrl.pathname),
      search: parsedEntryUrl.search,
    };
    const entryUrlForFetch = buildDevPluginUrl(entryLocator);
    const entryResponse = await fetch(entryUrlForFetch);
    if (!entryResponse.ok) {
      throw new Error(`Failed to fetch dev plugin entry: ${entryUrlForFetch}`);
    }

    const devEntryPath = path.join(devPath, manifest.syncserver.entry);
    fs.mkdirSync(path.dirname(devEntryPath), { recursive: true });
    fs.writeFileSync(devEntryPath, await entryResponse.text(), 'utf8');

    await this.loadPlugin(pluginSlug, devPath, false);
    return manifest;
  }

  async reloadPlugins(): Promise<void> {
    await this.shutdown();
    await this.loadPlugins();
  }

  /**
   * Debug loaded plugin metadata when DEBUG=actual:config is set.
   */
  debugPluginMetadata(pluginSlug: string): void {
    const source = this.pluginSources.get(pluginSlug);
    if (!source || !isSyncServerPlugin(source.manifest)) {
      return;
    }

    debug(`Plugin: ${pluginSlug}`);
    debug(`  Version: ${source.manifest.version}`);
    debug(`  Description: ${source.manifest.description || 'N/A'}`);
    debug(`  Entry: ${source.manifest.syncserver.entry}`);
    debug(''); // Empty line for readability
  }

  /**
   * Shutdown all plugins
   */
  async shutdown(): Promise<void> {
    this.pluginSources.clear();

    for (const [pluginSlug, extractPath] of this.extractedPlugins) {
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
    this.extractedPlugins.clear();
  }

  private skipDuplicatePlugin(
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
    cleanupExtractedPlugin(plugin, this.extractedPlugins);
    return true;
  }

  private rememberPluginSource(
    pluginSlug: string,
    manifest: Manifest,
    pluginPath: string,
    zipPath: string | null | undefined,
  ): void {
    this.pluginSources.set(pluginSlug, {
      slug: pluginSlug,
      manifest,
      path: pluginPath,
      zipPath,
    });
  }

  private getPluginZipPath(pluginSlug: string, pluginVersion: string): string {
    if (!pluginArchiveSegmentPattern.test(pluginVersion)) {
      throw new Error('Plugin version cannot contain path separators');
    }

    return path.join(this.pluginsDir, `${pluginSlug}-${pluginVersion}.zip`);
  }
}

export { PluginManager };
