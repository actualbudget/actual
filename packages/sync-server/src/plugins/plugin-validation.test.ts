import path from 'path';

import { validateManifest } from './plugin-manifest.js';
import { resolvePluginPath, sanitizePluginSlug } from './plugin-paths.js';

describe('plugin manifest validation', () => {
  describe('validateManifest', () => {
    it('accepts the partial manifest fields needed for plugin loading', () => {
      const manifest = validateManifest({
        name: 'test-plugin',
        version: '1.0.0',
        type: 'syncserver',
      });

      expect(manifest.name).toBe('test-plugin');
      expect(manifest.type).toBe('syncserver');
    });

    it('rejects invalid manifest identity fields', () => {
      expect(() =>
        validateManifest({
          name: '',
          version: '1.0.0',
        }),
      ).toThrow(/specify a name/);

      expect(() =>
        validateManifest({
          name: 'test-plugin',
          version: 1,
        }),
      ).toThrow(/specify a version/);
    });

    it('rejects invalid optional loading fields', () => {
      expect(() =>
        validateManifest({
          name: 'test-plugin',
          version: '1.0.0',
          type: false,
        }),
      ).toThrow(/type must be a string/);
    });
  });
});

describe('plugin paths', () => {
  describe('sanitizePluginSlug', () => {
    it('maps special path slugs to a safe fallback', () => {
      expect(sanitizePluginSlug('')).toBe('plugin');
      expect(sanitizePluginSlug('.')).toBe('plugin');
      expect(sanitizePluginSlug('..')).toBe('plugin');
      expect(sanitizePluginSlug('../plugin')).toBe('..-plugin');
    });
  });

  describe('resolvePluginPath', () => {
    const pluginPath = path.join(path.sep, 'tmp', 'actual-plugin');

    it('resolves relative paths inside the plugin directory', () => {
      expect(resolvePluginPath(pluginPath, 'nested/index.js')).toBe(
        path.join(pluginPath, 'nested', 'index.js'),
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
  });
});
