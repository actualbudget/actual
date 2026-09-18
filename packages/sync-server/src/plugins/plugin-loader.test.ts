import fs from 'fs';
import os from 'os';
import path from 'path';

import { zipSync } from 'fflate';

import {
  cleanupExtractedPlugin,
  extractZipPlugin,
  findInstallablePlugins,
  getPluginSlugFromManifest,
  readPluginManifest,
  safeUnzipPluginArchive,
} from './plugin-loader.js';
import { createPluginManager } from './plugin-manager.js';
import { assertSafeZipEntries } from './plugin-paths.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'actual-plugin-test-'));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writePlugin(pluginPath: string, name = 'test-plugin'): void {
  writeJson(path.join(pluginPath, 'manifest.json'), {
    name,
    version: '1.0.0',
    type: 'syncserver',
  });
}

function makeZip(entries: Record<string, string>): string {
  const zipPath = path.join(makeTempDir(), 'plugin.zip');
  fs.writeFileSync(zipPath, makeZipBuffer(entries));
  return zipPath;
}

function makeZipBuffer(entries: Record<string, string>): Buffer {
  return Buffer.from(
    zipSync(
      Object.fromEntries(
        Object.entries(entries).map(([entryName, content]) => [
          entryName,
          Buffer.from(content),
        ]),
      ),
    ),
  );
}

function listTempPluginDirs(): string[] {
  return fs
    .readdirSync(os.tmpdir(), { withFileTypes: true })
    .filter(
      entry =>
        entry.isDirectory() &&
        entry.name.startsWith('actual-plugin-') &&
        !entry.name.startsWith('actual-plugin-test-'),
    )
    .map(entry => entry.name)
    .sort();
}

describe('plugin loader', () => {
  const tempDirs: string[] = [];
  const extractedPlugins = new Map<string, string>();

  afterEach(() => {
    for (const extractPath of extractedPlugins.values()) {
      fs.rmSync(extractPath, { recursive: true, force: true });
    }
    extractedPlugins.clear();

    for (const tempDir of tempDirs.splice(0)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function trackedTempDir(): string {
    const tempDir = makeTempDir();
    tempDirs.push(tempDir);
    return tempDir;
  }

  it('reads plugin slugs and validates manifests from plugin directories', () => {
    const pluginPath = path.join(trackedTempDir(), 'plugin');
    writePlugin(pluginPath, 'manifest-name');

    expect(getPluginSlugFromManifest(pluginPath)).toBe('manifest-name');
    expect(readPluginManifest('manifest-name', pluginPath)).toMatchObject({
      name: 'manifest-name',
      type: 'syncserver',
    });
  });

  it('returns null for missing or invalid manifest slugs', () => {
    const pluginPath = path.join(trackedTempDir(), 'plugin');
    fs.mkdirSync(pluginPath, { recursive: true });

    expect(getPluginSlugFromManifest(pluginPath)).toBeNull();

    fs.writeFileSync(path.join(pluginPath, 'manifest.json'), '{');
    expect(getPluginSlugFromManifest(pluginPath)).toBeNull();

    writeJson(path.join(pluginPath, 'manifest.json'), { name: 123 });
    expect(getPluginSlugFromManifest(pluginPath)).toBeNull();
  });

  it('discovers directory plugins and zip plugins', () => {
    const pluginsDir = trackedTempDir();
    writePlugin(path.join(pluginsDir, 'directory-plugin'), 'from-dir');

    fs.writeFileSync(
      path.join(pluginsDir, 'archive-plugin.1.2.3.zip'),
      makeZipBuffer({
        'manifest.json': JSON.stringify({
          name: 'from-zip',
          version: '1.0.0',
          type: 'syncserver',
        }),
      }),
    );

    expect(findInstallablePlugins(pluginsDir, extractedPlugins)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'directory',
          name: 'directory-plugin',
          slug: 'from-dir',
        }),
        expect.objectContaining({
          type: 'zip',
          name: 'archive-plugin.1.2.3.zip',
          slug: 'from-zip',
        }),
      ]),
    );
  });

  it('returns installable plugins in filename order', () => {
    const pluginsDir = trackedTempDir();
    writeJson(path.join(pluginsDir, 'z-plugin', 'manifest.json'), {
      name: 'z-plugin',
      version: '1.0.0',
      type: 'syncserver',
    });
    writeJson(path.join(pluginsDir, 'a-plugin', 'manifest.json'), {
      name: 'a-plugin',
      version: '1.0.0',
      type: 'syncserver',
    });

    expect(
      findInstallablePlugins(pluginsDir, extractedPlugins).map(
        plugin => plugin.name,
      ),
    ).toEqual(['a-plugin', 'z-plugin']);
  });

  it('extracts safe plugin zips and cleans them up', () => {
    const zipPath = makeZip({
      'manifest.json': JSON.stringify({
        name: 'safe-zip',
        version: '1.0.0',
        type: 'syncserver',
      }),
    });
    tempDirs.push(path.dirname(zipPath));

    const extractPath = extractZipPlugin(
      zipPath,
      'safe-zip-test',
      extractedPlugins,
    );

    expect(fs.existsSync(path.join(extractPath, 'manifest.json'))).toBe(true);
    cleanupExtractedPlugin(
      {
        type: 'zip',
        name: 'safe.zip',
        slug: 'safe-zip-test',
        path: extractPath,
        extractionKey: 'safe-zip-test',
        zipPath,
      },
      extractedPlugins,
    );
    expect(fs.existsSync(extractPath)).toBe(false);
    expect(extractedPlugins.has('safe-zip-test')).toBe(false);
  });

  it('does not derive the extraction directory from the archive key', () => {
    const zipPath = makeZip({
      'manifest.json': JSON.stringify({
        name: 'safe-zip',
        version: '1.0.0',
        type: 'syncserver',
      }),
    });
    tempDirs.push(path.dirname(zipPath));

    const extractPath = extractZipPlugin(zipPath, '..', extractedPlugins);

    expect(path.dirname(extractPath)).toBe(os.tmpdir());
    expect(path.basename(extractPath)).toMatch(/^actual-plugin-/);
    expect(extractedPlugins.get('..')).toBe(extractPath);
  });

  it('cleans extracted zips when the manifest slug differs from the filename', () => {
    const pluginsDir = trackedTempDir();
    fs.writeFileSync(
      path.join(pluginsDir, 'filename-slug.zip'),
      makeZipBuffer({
        'manifest.json': JSON.stringify({
          name: 'manifest-slug',
          version: '1.0.0',
          type: 'syncserver',
        }),
      }),
    );

    const [candidate] = findInstallablePlugins(pluginsDir, extractedPlugins);

    expect(candidate.slug).toBe('manifest-slug');
    expect(candidate.extractionKey).toBe('filename-slug');
    expect(extractedPlugins.has('filename-slug')).toBe(true);
    expect(extractedPlugins.has('manifest-slug')).toBe(false);

    cleanupExtractedPlugin(candidate, extractedPlugins);

    expect(fs.existsSync(candidate.path)).toBe(false);
    expect(extractedPlugins.has('filename-slug')).toBe(false);
  });

  it('cleans the candidate path when duplicate zip manifests share a slug', () => {
    const firstPath = path.join(trackedTempDir(), 'first-extract');
    const secondPath = path.join(trackedTempDir(), 'second-extract');
    fs.mkdirSync(firstPath, { recursive: true });
    fs.mkdirSync(secondPath, { recursive: true });
    extractedPlugins.set('second-key', secondPath);

    cleanupExtractedPlugin(
      {
        type: 'zip',
        name: 'first.zip',
        slug: 'duplicate-plugin',
        path: firstPath,
        extractionKey: 'first-key',
        zipPath: path.join(path.dirname(firstPath), 'first.zip'),
      },
      extractedPlugins,
    );

    expect(fs.existsSync(firstPath)).toBe(false);
    expect(fs.existsSync(secondPath)).toBe(true);
    expect(extractedPlugins.get('second-key')).toBe(secondPath);
  });

  it('tracks duplicate manifest slug zip extractions by archive key', () => {
    const pluginsDir = trackedTempDir();
    for (const filename of ['duplicate.1.0.0.zip', 'duplicate.2.0.0.zip']) {
      fs.writeFileSync(
        path.join(pluginsDir, filename),
        makeZipBuffer({
          'manifest.json': JSON.stringify({
            name: 'duplicate-plugin',
            version: '1.0.0',
            type: 'syncserver',
          }),
        }),
      );
    }

    const candidates = findInstallablePlugins(pluginsDir, extractedPlugins);

    expect(candidates).toEqual([
      expect.objectContaining({
        slug: 'duplicate-plugin',
        extractionKey: 'duplicate.1.0.0',
      }),
      expect.objectContaining({
        slug: 'duplicate-plugin',
        extractionKey: 'duplicate.2.0.0',
      }),
    ]);
    expect(extractedPlugins.get('duplicate.1.0.0')).toBe(candidates[0].path);
    expect(extractedPlugins.get('duplicate.2.0.0')).toBe(candidates[1].path);
  });

  it('rejects plugin zips over safe unzip limits before extraction', () => {
    const archive = makeZipBuffer({
      'manifest.json': '{}',
      'large.txt': '0123456789',
    });

    expect(() =>
      safeUnzipPluginArchive(archive, { maxArchiveSize: archive.length - 1 }),
    ).toThrow(/maximum archive size/);
    expect(() =>
      safeUnzipPluginArchive(archive, {
        maxArchiveSize: archive.length,
        maxEntrySize: 5,
      }),
    ).toThrow(/maximum size/);
    expect(() =>
      safeUnzipPluginArchive(archive, {
        maxArchiveSize: archive.length,
        maxEntrySize: 20,
        maxTotalUncompressedSize: 11,
      }),
    ).toThrow(/maximum total uncompressed size/);
  });

  it('rejects plugin zips over the entry count limit', () => {
    const archive = makeZipBuffer({
      'manifest.json': '{}',
      'empty.txt': '',
    });

    expect(() => safeUnzipPluginArchive(archive, { maxEntries: 1 })).toThrow(
      /maximum entry count/,
    );
  });

  it('rejects zip entries that resolve to the same extracted path', () => {
    const archive = makeZipBuffer({
      'nested/../manifest.json': '{}',
      'manifest.json': '{}',
    });

    expect(() => safeUnzipPluginArchive(archive)).toThrow(/duplicate entry/);
  });

  it('cleans partially extracted plugin zips after extraction failures', () => {
    const pluginDirsBefore = listTempPluginDirs();
    const zipPath = makeZip({
      manifest: '{}',
      'manifest/index.json': '{}',
    });
    tempDirs.push(path.dirname(zipPath));

    expect(() =>
      extractZipPlugin(zipPath, 'partial-failure', extractedPlugins),
    ).toThrow();
    expect(extractedPlugins.has('partial-failure')).toBe(false);
    expect(listTempPluginDirs()).toEqual(pluginDirsBefore);
  });

  it('rejects zip entries that would escape the extraction directory', () => {
    expect(() => assertSafeZipEntries(['../escape.txt'])).toThrow(
      /unsafe path/,
    );

    expect(() => assertSafeZipEntries(['nested/../../escape.txt'])).toThrow(
      /unsafe path/,
    );
  });

  it('rejects Windows drive-letter zip entries', () => {
    expect(() =>
      assertSafeZipEntries(['C:\\Windows\\System32\\evil.dll']),
    ).toThrow(/unsafe path/);

    expect(() => assertSafeZipEntries(['safe/../C:/evil.dll'])).toThrow(
      /unsafe path/,
    );
  });
});

describe('PluginManager plugin loading', () => {
  let pluginsDir: string;
  const pluginManagers: Array<ReturnType<typeof createPluginManager>> = [];

  beforeEach(() => {
    pluginsDir = makeTempDir();
  });

  afterEach(async () => {
    await Promise.all(
      pluginManagers.splice(0).map(pluginManager => pluginManager.shutdown()),
    );
    fs.rmSync(pluginsDir, { recursive: true, force: true });
  });

  function makePluginManager() {
    const pluginManager = createPluginManager(pluginsDir);
    pluginManagers.push(pluginManager);
    return pluginManager;
  }

  it('loads plugin manifests without running plugin code', async () => {
    writePlugin(path.join(pluginsDir, 'test-plugin'));

    const pluginManager = makePluginManager();
    await pluginManager.loadPlugins();

    expect(pluginManager.getInstalledPluginManifests()).toEqual([
      expect.objectContaining({
        name: 'test-plugin',
        source: 'sync-server',
      }),
    ]);
  });

  it('cleans old zip extractions when plugins are loaded repeatedly', async () => {
    const pluginDirsBefore = listTempPluginDirs();
    fs.writeFileSync(
      path.join(pluginsDir, 'zip-plugin.zip'),
      makeZipBuffer({
        'manifest.json': JSON.stringify({
          name: 'zip-plugin',
          version: '1.0.0',
          type: 'syncserver',
          syncserver: { entry: 'syncserver/index.js' },
        }),
        'syncserver/index.js': 'export const plugin = { routes: [] };',
      }),
    );

    const pluginManager = makePluginManager();
    await pluginManager.loadPlugins();
    await pluginManager.loadPlugins();
    await pluginManager.shutdown();

    expect(listTempPluginDirs()).toEqual(pluginDirsBefore);
  });

  it('keeps the first plugin when duplicate manifest slugs are found', async () => {
    writePlugin(path.join(pluginsDir, 'first'), 'duplicate-plugin');
    writeJson(path.join(pluginsDir, 'first', 'manifest.json'), {
      name: 'duplicate-plugin',
      version: '1.0.0',
      type: 'syncserver',
    });
    writePlugin(path.join(pluginsDir, 'second'), 'duplicate-plugin');
    writeJson(path.join(pluginsDir, 'second', 'manifest.json'), {
      name: 'duplicate-plugin',
      version: '2.0.0',
      type: 'syncserver',
    });

    const pluginManager = makePluginManager();
    await pluginManager.loadPlugins();

    expect(pluginManager.getInstalledPluginManifests()).toHaveLength(1);
    expect(pluginManager.getInstalledPluginManifests()[0].version).toBe(
      '1.0.0',
    );
  });

  it('rejects uploaded plugin versions with path separators', async () => {
    const zipBuffer = makeZipBuffer({
      'manifest.json': JSON.stringify({
        name: 'unsafe-version',
        version: '../evil',
        type: 'syncserver',
      }),
    });

    const pluginManager = makePluginManager();

    await expect(pluginManager.installPluginZip(zipBuffer)).rejects.toThrow(
      /version cannot contain path separators/,
    );
    expect(fs.existsSync(path.join(pluginsDir, 'evil.zip'))).toBe(false);
  });

  it('accepts uploaded plugin versions with semver build metadata', async () => {
    const zipBuffer = makeZipBuffer({
      'manifest.json': JSON.stringify({
        name: 'build-metadata-version',
        version: '1.0.0+build.5',
        type: 'syncserver',
      }),
    });

    const pluginManager = makePluginManager();

    await expect(pluginManager.installPluginZip(zipBuffer)).resolves.toEqual(
      expect.objectContaining({
        name: 'build-metadata-version',
        version: '1.0.0+build.5',
      }),
    );
    expect(
      fs.existsSync(
        path.join(pluginsDir, 'build-metadata-version-1.0.0+build.5.zip'),
      ),
    ).toBe(true);
  });

  it('rejects uploaded plugin packages with an installed slug and version', async () => {
    const zipBuffer = makeZipBuffer({
      'manifest.json': JSON.stringify({
        name: 'already-installed',
        version: '1.0.0',
        type: 'syncserver',
      }),
    });
    const zipPath = path.join(pluginsDir, 'already-installed-1.0.0.zip');
    fs.writeFileSync(zipPath, 'existing plugin');

    const pluginManager = makePluginManager();

    await expect(pluginManager.installPluginZip(zipBuffer)).rejects.toThrow(
      /already-installed@1\.0\.0 is already installed/,
    );
    expect(fs.readFileSync(zipPath, 'utf8')).toBe('existing plugin');
  });

  it('rejects uploaded plugin packages with an installed slug', async () => {
    const pluginManager = makePluginManager();
    await pluginManager.installPluginZip(
      makeZipBuffer({
        'manifest.json': JSON.stringify({
          name: 'same-slug',
          version: '1.0.0',
          type: 'syncserver',
        }),
      }),
    );

    await expect(
      pluginManager.installPluginZip(
        makeZipBuffer({
          'manifest.json': JSON.stringify({
            name: 'same-slug',
            version: '2.0.0',
            type: 'syncserver',
          }),
        }),
      ),
    ).rejects.toThrow(/same-slug is already installed/);

    expect(fs.existsSync(path.join(pluginsDir, 'same-slug-2.0.0.zip'))).toBe(
      false,
    );
  });

  it('serializes uploaded plugin installs', async () => {
    function makeInstallZip(name: string) {
      return makeZipBuffer({
        'manifest.json': JSON.stringify({
          name,
          version: '1.0.0',
          type: 'syncserver',
        }),
      });
    }

    const pluginManager = makePluginManager();
    const results = await Promise.allSettled([
      pluginManager.installPluginZip(makeInstallZip('same-upload')),
      pluginManager.installPluginZip(makeInstallZip('same-upload')),
    ]);

    const fulfilled = results.filter(result => result.status === 'fulfilled');
    const rejected = results.filter(result => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(fulfilled[0]).toMatchObject({
      value: expect.objectContaining({ name: 'same-upload' }),
    });
    expect(rejected[0]).toMatchObject({
      reason: expect.objectContaining({
        message: expect.stringMatching(/same-upload is already installed/),
      }),
    });
    expect(fs.existsSync(path.join(pluginsDir, 'same-upload-1.0.0.zip'))).toBe(
      true,
    );
  });

  it('keeps loaded plugins available while installing a new plugin', async () => {
    writeJson(path.join(pluginsDir, 'existing-plugin', 'manifest.json'), {
      name: 'existing-plugin',
      version: '1.0.0',
      type: 'syncserver',
      syncserver: { entry: 'syncserver/index.js' },
    });
    fs.mkdirSync(path.join(pluginsDir, 'existing-plugin', 'syncserver'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(pluginsDir, 'existing-plugin', 'syncserver', 'index.js'),
      'export const plugin = { routes: [] };',
    );

    const pluginManager = makePluginManager();
    await pluginManager.loadPlugins();
    await pluginManager.installPluginZip(
      makeZipBuffer({
        'manifest.json': JSON.stringify({
          name: 'uploaded-plugin',
          version: '1.0.0',
          type: 'syncserver',
          syncserver: { entry: 'syncserver/index.js' },
        }),
        'syncserver/index.js': 'export const plugin = { routes: [] };',
      }),
    );

    expect(pluginManager.getInstalledPluginManifests()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'existing-plugin' }),
        expect.objectContaining({ name: 'uploaded-plugin' }),
      ]),
    );
  });
});
