import fs from 'fs';
import os from 'os';
import path from 'path';

import AdmZip from 'adm-zip';

import { assertSafeZipEntries } from './plugin-helpers.js';
import {
  cleanupExtractedPlugin,
  extractZipPlugin,
  findInstallablePlugins,
  getPluginSlugFromManifest,
  readPluginManifest,
  resolveSyncServerEntry,
} from './plugin-loader.js';
import { PluginManager } from './plugin-manager.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'actual-plugin-test-'));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeFrontendPlugin(
  pluginPath: string,
  name = 'frontend-plugin',
): void {
  writeJson(path.join(pluginPath, 'manifest.json'), {
    name,
    version: '1.0.0',
    type: 'frontend',
    frontend: { entry: 'frontend/index.js' },
  });
  fs.mkdirSync(path.join(pluginPath, 'frontend', 'nested'), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(pluginPath, 'frontend', 'index.js'),
    'export default {};',
  );
  fs.writeFileSync(
    path.join(pluginPath, 'frontend', 'nested', 'style.css'),
    '',
  );
  fs.writeFileSync(
    path.join(pluginPath, 'frontend', 'nested', 'logo.bin'),
    Buffer.from([0, 159, 255]),
  );
}

function makeZip(entries: Record<string, string>): string {
  const zipPath = path.join(makeTempDir(), 'plugin.zip');
  const zip = new AdmZip();
  for (const [entryName, content] of Object.entries(entries)) {
    zip.addFile(entryName, Buffer.from(content));
  }
  zip.writeZip(zipPath);
  return zipPath;
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
    writeFrontendPlugin(pluginPath, 'manifest-name');

    expect(getPluginSlugFromManifest(pluginPath)).toBe('manifest-name');
    expect(readPluginManifest('manifest-name', pluginPath)).toMatchObject({
      name: 'manifest-name',
      type: 'frontend',
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
    writeFrontendPlugin(path.join(pluginsDir, 'directory-plugin'), 'from-dir');

    const zip = new AdmZip();
    zip.addFile(
      'manifest.json',
      Buffer.from(
        JSON.stringify({
          name: 'from-zip',
          version: '1.0.0',
          type: 'frontend',
          frontend: { entry: 'frontend/index.js' },
        }),
      ),
    );
    zip.addFile('frontend/index.js', Buffer.from('export default {};'));
    zip.writeZip(path.join(pluginsDir, 'archive-plugin.1.2.3.zip'));

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

  it('extracts safe plugin zips and cleans them up', () => {
    const zipPath = makeZip({
      'manifest.json': JSON.stringify({
        name: 'safe-zip',
        version: '1.0.0',
        type: 'frontend',
        frontend: { entry: 'frontend/index.js' },
      }),
      'frontend/index.js': 'export default {};',
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
        zipPath,
      },
      extractedPlugins,
    );
    expect(fs.existsSync(extractPath)).toBe(false);
    expect(extractedPlugins.has('safe-zip-test')).toBe(false);
  });

  it('cleans extracted zips when the manifest slug differs from the filename', () => {
    const pluginsDir = trackedTempDir();
    const zip = new AdmZip();
    zip.addFile(
      'manifest.json',
      Buffer.from(
        JSON.stringify({
          name: 'manifest-slug',
          version: '1.0.0',
          type: 'frontend',
          frontend: { entry: 'frontend/index.js' },
        }),
      ),
    );
    zip.addFile('frontend/index.js', Buffer.from('export default {};'));
    zip.writeZip(path.join(pluginsDir, 'filename-slug.zip'));

    const [candidate] = findInstallablePlugins(pluginsDir, extractedPlugins);

    expect(candidate.slug).toBe('manifest-slug');
    expect(extractedPlugins.has('manifest-slug')).toBe(true);
    expect(extractedPlugins.has('filename-slug')).toBe(false);

    cleanupExtractedPlugin(candidate, extractedPlugins);

    expect(fs.existsSync(candidate.path)).toBe(false);
    expect(extractedPlugins.has('manifest-slug')).toBe(false);
  });

  it('rejects zip entries that would escape the extraction directory', () => {
    expect(() =>
      assertSafeZipEntries({
        getEntries: () => [{ entryName: '../escape.txt' }],
      } as AdmZip),
    ).toThrow(/unsafe path/);

    expect(() =>
      assertSafeZipEntries({
        getEntries: () => [{ entryName: 'nested/../../escape.txt' }],
      } as AdmZip),
    ).toThrow(/unsafe path/);
  });

  it('rejects Windows drive-letter zip entries', () => {
    expect(() =>
      assertSafeZipEntries({
        getEntries: () => [{ entryName: 'C:\\Windows\\System32\\evil.dll' }],
      } as AdmZip),
    ).toThrow(/unsafe path/);

    expect(() =>
      assertSafeZipEntries({
        getEntries: () => [{ entryName: 'safe/../C:/evil.dll' }],
      } as AdmZip),
    ).toThrow(/unsafe path/);
  });

  it('resolves sync-server entries only when they exist inside the plugin', () => {
    const pluginPath = path.join(trackedTempDir(), 'plugin');
    fs.mkdirSync(path.join(pluginPath, 'syncserver'), { recursive: true });
    fs.writeFileSync(path.join(pluginPath, 'syncserver', 'index.js'), '');

    expect(
      resolveSyncServerEntry('sync-plugin', pluginPath, {
        name: 'sync-plugin',
        version: '1.0.0',
        type: 'syncserver',
        syncserver: { entry: 'syncserver/index.js' },
      }),
    ).toBe(path.join(pluginPath, 'syncserver', 'index.js'));

    expect(() =>
      resolveSyncServerEntry('sync-plugin', pluginPath, {
        name: 'sync-plugin',
        version: '1.0.0',
        type: 'syncserver',
        syncserver: { entry: '../outside.js' },
      }),
    ).toThrow(/inside the plugin directory/);
  });
});

describe('PluginManager frontend plugin loading', () => {
  let pluginsDir: string;

  beforeEach(() => {
    pluginsDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(pluginsDir, { recursive: true, force: true });
  });

  it('loads frontend-only plugins without starting a sync-server runner', async () => {
    writeFrontendPlugin(path.join(pluginsDir, 'frontend-plugin'));

    const pluginManager = new PluginManager(pluginsDir);
    await pluginManager.loadPlugins();

    expect(pluginManager.getInstalledPluginManifests()).toEqual([
      expect.objectContaining({
        name: 'frontend-plugin',
        source: 'sync-server',
      }),
    ]);
    expect(pluginManager.getFrontendPluginFiles('frontend-plugin')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'index.js' }),
        expect.objectContaining({ name: path.join('nested', 'style.css') }),
        expect.objectContaining({
          name: path.join('nested', 'logo.bin'),
          content: Buffer.from([0, 159, 255]).toString('base64'),
          encoding: 'base64',
        }),
      ]),
    );
  });

  it('keeps the first plugin when duplicate manifest slugs are found', async () => {
    writeFrontendPlugin(path.join(pluginsDir, 'first'), 'duplicate-plugin');
    writeFrontendPlugin(path.join(pluginsDir, 'second'), 'duplicate-plugin');

    const pluginManager = new PluginManager(pluginsDir);
    await pluginManager.loadPlugins();

    expect(pluginManager.getInstalledPluginManifests()).toHaveLength(1);
    expect(pluginManager.getInstalledPluginManifests()[0].name).toBe(
      'duplicate-plugin',
    );
  });

  it('does not register sync-server plugins with invalid entries', async () => {
    const pluginPath = path.join(pluginsDir, 'bad-sync-plugin');
    writeJson(path.join(pluginPath, 'manifest.json'), {
      name: 'bad-sync-plugin',
      version: '1.0.0',
      type: 'syncserver',
      syncserver: { entry: 'syncserver/missing.js' },
    });

    const pluginManager = new PluginManager(pluginsDir);

    await expect(
      pluginManager.loadPlugin('bad-sync-plugin', pluginPath),
    ).rejects.toThrow(/entry point does not exist/);
    expect(pluginManager.getInstalledPluginManifests()).toEqual([]);
  });

  it('rejects uploaded plugin versions with path separators', async () => {
    const zip = new AdmZip();
    zip.addFile(
      'manifest.json',
      Buffer.from(
        JSON.stringify({
          name: 'unsafe-version',
          version: '../evil',
          type: 'frontend',
          frontend: { entry: 'frontend/index.js' },
        }),
      ),
    );
    zip.addFile('frontend/index.js', Buffer.from('export default {};'));

    const pluginManager = new PluginManager(pluginsDir);

    await expect(
      pluginManager.installPluginZip(zip.toBuffer()),
    ).rejects.toThrow(/version cannot contain path separators/);
    expect(fs.existsSync(path.join(pluginsDir, 'evil.zip'))).toBe(false);
  });
});
