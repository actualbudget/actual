import path from 'path';

import {
  isPluginPathInsideDir,
  normalizeDevPluginLocator,
  resolvePluginPath,
  sanitizePluginSlug,
  validateManifest,
} from './plugin-helpers.js';

describe('plugin helpers', () => {
  describe('sanitizePluginSlug', () => {
    it('maps special path slugs to a safe fallback', () => {
      expect(sanitizePluginSlug('')).toBe('plugin');
      expect(sanitizePluginSlug('.')).toBe('plugin');
      expect(sanitizePluginSlug('..')).toBe('plugin');
      expect(sanitizePluginSlug('../plugin')).toBe('..-plugin');
    });
  });

  describe('validateManifest', () => {
    it('accepts a mixed plugin with frontend and sync-server entries', () => {
      const manifest = validateManifest({
        name: 'test-plugin',
        version: '1.0.0',
        type: 'mixed',
        frontend: { entry: 'frontend/index.js' },
        syncserver: { entry: 'syncserver/index.js' },
      });

      expect(manifest.name).toBe('test-plugin');
      expect(manifest.syncserver?.entry).toBe('syncserver/index.js');
    });

    it('rejects invalid capability combinations', () => {
      expect(() =>
        validateManifest({
          name: 'frontend-plugin',
          version: '1.0.0',
          type: 'frontend',
          frontend: { entry: 'frontend/index.js' },
          syncserver: { entry: 'syncserver/index.js' },
        }),
      ).toThrow(/Frontend-only plugins cannot specify syncserver/);

      expect(() =>
        validateManifest({
          name: 'sync-plugin',
          version: '1.0.0',
          type: 'syncserver',
          frontend: { entry: 'frontend/index.js' },
          syncserver: { entry: 'syncserver/index.js' },
        }),
      ).toThrow(/Sync-server-only plugins cannot specify frontend/);
    });
  });

  describe('resolvePluginPath', () => {
    const pluginPath = path.join(path.sep, 'tmp', 'actual-plugin');

    it('resolves relative paths inside the plugin directory', () => {
      expect(resolvePluginPath(pluginPath, 'syncserver/index.js')).toBe(
        path.join(pluginPath, 'syncserver', 'index.js'),
      );
    });

    it('rejects absolute and parent-relative entries', () => {
      expect(() => resolvePluginPath(pluginPath, '/etc/passwd')).toThrow(
        /relative path/,
      );
      expect(() => resolvePluginPath(pluginPath, '../outside.js')).toThrow(
        /inside the plugin directory/,
      );
    });

    it('checks that capability entries stay in their capability directory', () => {
      expect(
        isPluginPathInsideDir(pluginPath, 'frontend', 'frontend/index.js'),
      ).toBe(true);
      expect(
        isPluginPathInsideDir(pluginPath, 'frontend', 'syncserver/index.js'),
      ).toBe(false);
    });
  });

  describe('normalizeDevPluginLocator', () => {
    it('normalizes supported local dev plugin locator forms', () => {
      expect(normalizeDevPluginLocator(3000)).toEqual({
        port: '3000',
        path: '/manifest.json',
        search: '',
      });
      expect(
        normalizeDevPluginLocator({
          port: '3001',
          path: '/plugins/demo/manifest.json',
          search: '?v=1',
        }),
      ).toEqual({
        port: '3001',
        path: '/plugins/demo/manifest.json',
        search: '?v=1',
      });
      expect(
        normalizeDevPluginLocator('http://127.0.0.1:3002/plugin.json?x=1'),
      ).toEqual({
        port: '3002',
        path: '/plugin.json',
        search: '?x=1',
      });
    });

    it('rejects invalid ports and paths that leave the origin', () => {
      expect(() => normalizeDevPluginLocator(0)).toThrow(/valid TCP port/);
      expect(() =>
        normalizeDevPluginLocator({ port: 3000, path: '/../secret' }),
      ).toThrow(/stay inside the origin/);
      expect(() =>
        normalizeDevPluginLocator({
          port: 3000,
          path: '/plugins/%2e%2e/secret',
        }),
      ).toThrow(/stay inside the origin/);
      expect(() =>
        normalizeDevPluginLocator({
          port: 3000,
          path: '/plugins/%252e%252e/secret',
        }),
      ).toThrow(/stay inside the origin/);
      expect(() =>
        normalizeDevPluginLocator({
          port: 3000,
          path: '/plugins/%5c..%5csecret',
        }),
      ).toThrow(/stay inside the origin/);
    });
  });
});
