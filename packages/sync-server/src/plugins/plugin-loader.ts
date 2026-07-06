import fs from 'fs';
import os from 'os';
import path from 'path';

import { unzipSync } from 'fflate';
import type { Unzipped } from 'fflate';

import { getErrorMessage } from './plugin-errors.js';
import { validateManifest } from './plugin-manifest.js';
import type { Manifest } from './plugin-manifest.js';
import { assertSafeZipEntries, resolvePluginPath } from './plugin-paths.js';

export type PluginSourceCandidate = {
  type: 'directory' | 'zip';
  name: string;
  slug: string;
  path: string;
  extractionKey?: string;
  zipPath?: string;
};

type SafeUnzipOptions = {
  maxArchiveSize?: number;
  maxEntrySize?: number;
  maxEntries?: number;
  maxTotalUncompressedSize?: number;
};

const MAX_PLUGIN_ZIP_SIZE = 100 * 1024 * 1024;
const MAX_PLUGIN_ZIP_ENTRIES = 10_000;

export function extractZipPlugin(
  zipPath: string,
  extractionKey: string,
  extractedPlugins: Map<string, string>,
): string {
  let extractPath: string | undefined;

  try {
    const zipEntries = safeUnzipPluginArchive(fs.readFileSync(zipPath));
    extractPath = fs.mkdtempSync(path.join(os.tmpdir(), 'actual-plugin-'));

    for (const [entryName, content] of Object.entries(zipEntries)) {
      if (entryName.endsWith('/')) {
        continue;
      }

      const filePath = resolvePluginPath(
        extractPath,
        entryName.split('\\').join('/'),
      );
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
    }
    extractedPlugins.set(extractionKey, extractPath);

    return extractPath;
  } catch (error) {
    if (extractPath) {
      try {
        fs.rmSync(extractPath, { recursive: true, force: true });
      } catch {
        // Preserve the extraction error.
      }
    }

    throw new Error(
      `Failed to extract zip plugin ${extractionKey}: ${getErrorMessage(error)}`,
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

  const entries = fs
    .readdirSync(pluginsDir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
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
  if (plugin.type !== 'zip' || !plugin.extractionKey) {
    return;
  }

  if (fs.existsSync(plugin.path)) {
    fs.rmSync(plugin.path, { recursive: true, force: true });
  }

  if (extractedPlugins.get(plugin.extractionKey) === plugin.path) {
    extractedPlugins.delete(plugin.extractionKey);
  }
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
  const extractionKey = stripZipExtension(filename);
  const fallbackSlug = stripTrailingVersion(extractionKey);

  try {
    const extractedPath = extractZipPlugin(
      zipPath,
      extractionKey,
      extractedPlugins,
    );
    const slug = getPluginSlugFromManifest(extractedPath) || fallbackSlug;

    return {
      type: 'zip',
      name: filename,
      slug,
      path: extractedPath,
      extractionKey,
      zipPath,
    };
  } catch (error) {
    console.error(`Failed to extract zip ${filename}:`, getErrorMessage(error));
    return null;
  }
}

export function safeUnzipPluginArchive(
  archive: Uint8Array,
  {
    maxArchiveSize = MAX_PLUGIN_ZIP_SIZE,
    maxEntrySize = MAX_PLUGIN_ZIP_SIZE,
    maxEntries = MAX_PLUGIN_ZIP_ENTRIES,
    maxTotalUncompressedSize = MAX_PLUGIN_ZIP_SIZE,
  }: SafeUnzipOptions = {},
): Unzipped {
  if (archive.length > maxArchiveSize) {
    throw new Error(
      `Plugin zip exceeds maximum archive size of ${maxArchiveSize} bytes`,
    );
  }

  const seenEntries = new Set<string>();
  let entryCount = 0;
  let totalUncompressedSize = 0;

  return unzipSync(archive, {
    filter(file) {
      assertSafeZipEntries([file.name]);

      entryCount += 1;
      if (entryCount > maxEntries) {
        throw new Error(
          `Plugin zip exceeds maximum entry count of ${maxEntries}`,
        );
      }

      if (file.originalSize > maxEntrySize) {
        throw new Error(
          `Plugin zip entry ${file.name} exceeds maximum size of ${maxEntrySize} bytes`,
        );
      }

      totalUncompressedSize += file.originalSize;
      if (totalUncompressedSize > maxTotalUncompressedSize) {
        throw new Error(
          `Plugin zip exceeds maximum total uncompressed size of ${maxTotalUncompressedSize} bytes`,
        );
      }

      const normalizedEntryName = path.posix
        .normalize(file.name.split('\\').join('/'))
        .toLowerCase();
      if (seenEntries.has(normalizedEntryName)) {
        throw new Error(`Plugin zip contains duplicate entry ${file.name}`);
      }
      seenEntries.add(normalizedEntryName);

      return true;
    },
  });
}

function stripZipExtension(filename: string): string {
  return filename.endsWith('.zip')
    ? filename.slice(0, -'.zip'.length)
    : filename;
}

function stripTrailingVersion(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 4) {
    return filename;
  }

  const versionParts = parts.slice(-3);
  if (!versionParts.every(isNonEmptyDigitString)) {
    return filename;
  }

  return parts.slice(0, -3).join('.');
}

function isNonEmptyDigitString(value: string): boolean {
  return value !== '' && Array.from(value).every(isDigit);
}

function isDigit(character: string): boolean {
  return character >= '0' && character <= '9';
}
