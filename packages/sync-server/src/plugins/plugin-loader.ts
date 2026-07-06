import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import AdmZip from 'adm-zip';

import {
  assertSafeZipEntries,
  getErrorMessage,
  resolvePluginPath,
  validateManifest,
} from './plugin-helpers.js';
import type {
  Manifest,
  PluginSourceCandidate,
  SyncServerManifest,
} from './plugin-types.js';

export function extractZipPlugin(
  zipPath: string,
  pluginSlug: string,
  extractedPlugins: Map<string, string>,
): string {
  try {
    const zip = new AdmZip(zipPath);
    assertSafeZipEntries(zip);
    const extractPath = path.join(os.tmpdir(), 'actual-plugins', pluginSlug);

    if (fs.existsSync(extractPath)) {
      fs.rmSync(extractPath, { recursive: true, force: true });
    }

    zip.extractAllTo(extractPath, true);
    installPluginDependencies(extractPath, pluginSlug);
    extractedPlugins.set(pluginSlug, extractPath);

    return extractPath;
  } catch (error) {
    throw new Error(
      `Failed to extract zip plugin ${pluginSlug}: ${getErrorMessage(error)}`,
    );
  }
}

export function getPluginSlugFromManifest(pluginPath: string): string | null {
  const manifestPath = path.join(pluginPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return typeof manifest.name === 'string' ? manifest.name : null;
  } catch {
    return null;
  }
}

export function findInstallablePlugins(
  pluginsDir: string,
  extractedPlugins: Map<string, string>,
): PluginSourceCandidate[] {
  const pluginsToLoad: PluginSourceCandidate[] = [];

  for (const entry of fs.readdirSync(pluginsDir, { withFileTypes: true })) {
    try {
      const candidate = toPluginSourceCandidate(
        pluginsDir,
        entry,
        extractedPlugins,
      );
      if (candidate) {
        pluginsToLoad.push(candidate);
      }
    } catch (error) {
      console.error(
        `Failed to process plugin ${entry.name}:`,
        getErrorMessage(error),
      );
    }
  }

  return pluginsToLoad;
}

export function cleanupExtractedPlugin(
  plugin: PluginSourceCandidate,
  extractedPlugins: Map<string, string>,
): void {
  if (plugin.type !== 'zip' || !extractedPlugins.has(plugin.slug)) {
    return;
  }

  const extractPath = extractedPlugins.get(plugin.slug);
  if (extractPath && fs.existsSync(extractPath)) {
    fs.rmSync(extractPath, { recursive: true, force: true });
  }
  extractedPlugins.delete(plugin.slug);
}

export function readPluginManifest(
  pluginSlug: string,
  pluginPath: string,
): Manifest {
  const manifestPath = path.join(pluginPath, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Plugin ${pluginSlug} does not have a manifest.json`);
  }

  return validateManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
}

export function resolveSyncServerEntry(
  pluginSlug: string,
  pluginPath: string,
  manifest: SyncServerManifest,
): string {
  const entryPath = resolvePluginPath(pluginPath, manifest.syncserver.entry);
  if (!fs.existsSync(entryPath)) {
    throw new Error(
      `Plugin ${pluginSlug} entry point does not exist: ${entryPath}`,
    );
  }

  return entryPath;
}

function installPluginDependencies(
  extractPath: string,
  pluginSlug: string,
): void {
  const packageJsonPath = path.join(extractPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (
      packageJson.dependencies &&
      Object.keys(packageJson.dependencies).length > 0
    ) {
      console.log(`Installing dependencies for plugin ${pluginSlug}...`);
      execFileSync(
        'npm',
        [
          'install',
          '--production',
          '--ignore-scripts',
          '--no-audit',
          '--no-fund',
        ],
        {
          cwd: extractPath,
          stdio: 'inherit',
        },
      );
      console.log(`Dependencies installed for plugin ${pluginSlug}`);
    }
  } catch (error) {
    console.warn(
      `Failed to install dependencies for plugin ${pluginSlug}:`,
      getErrorMessage(error),
    );
  }
}

function toPluginSourceCandidate(
  pluginsDir: string,
  entry: fs.Dirent,
  extractedPlugins: Map<string, string>,
): PluginSourceCandidate | null {
  if (entry.isDirectory()) {
    const pluginPath = path.join(pluginsDir, entry.name);
    return {
      type: 'directory',
      name: entry.name,
      slug: getPluginSlugFromManifest(pluginPath) || entry.name,
      path: pluginPath,
    };
  }

  if (entry.isFile() && entry.name.endsWith('.zip')) {
    return toZipPluginSourceCandidate(pluginsDir, entry.name, extractedPlugins);
  }

  return null;
}

function toZipPluginSourceCandidate(
  pluginsDir: string,
  filename: string,
  extractedPlugins: Map<string, string>,
): PluginSourceCandidate | null {
  const zipPath = path.join(pluginsDir, filename);
  const tempSlug = filename
    .replace(/\.zip$/, '')
    .replace(/\.\d+\.\d+\.\d+$/, '');

  try {
    const extractedPath = extractZipPlugin(zipPath, tempSlug, extractedPlugins);
    const slug = getPluginSlugFromManifest(extractedPath) || tempSlug;
    if (slug !== tempSlug) {
      extractedPlugins.set(slug, extractedPath);
      extractedPlugins.delete(tempSlug);
    }

    return {
      type: 'zip',
      name: filename,
      slug,
      path: extractedPath,
      zipPath,
    };
  } catch (error) {
    console.error(`Failed to extract zip ${filename}:`, getErrorMessage(error));
    return null;
  }
}
