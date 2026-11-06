import path from 'node:path';

import { requireWebRoot, resolveWebBuildPath } from './web-root';

function failWith(code: string) {
  return () => {
    throw Object.assign(new Error(`failed: ${code}`), { code });
  };
}

describe('resolveWebBuildPath', () => {
  it('returns the build directory next to the web package.json', () => {
    const packageJson = path.join('/opt', 'web', 'package.json');
    expect(resolveWebBuildPath('file:///server.js', () => packageJson)).toBe(
      path.join('/opt', 'web', 'build'),
    );
  });

  it('resolves the installed web package by default', () => {
    expect(resolveWebBuildPath(import.meta.url)).toMatch(/[\\/]build$/);
  });

  it('returns an empty path without a module URL (bundled runtimes)', () => {
    const resolvePackageJson = vi.fn();
    expect(resolveWebBuildPath(undefined, resolvePackageJson)).toBe('');
    expect(resolvePackageJson).not.toHaveBeenCalled();
  });

  it.each(['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'])(
    'returns an empty path when the web package is missing (%s)',
    code => {
      expect(resolveWebBuildPath('file:///server.js', failWith(code))).toBe('');
    },
  );

  it('rethrows other resolution failures', () => {
    expect(() =>
      resolveWebBuildPath('file:///server.js', failWith('EACCES')),
    ).toThrow('failed: EACCES');
  });
});

describe('requireWebRoot', () => {
  it('returns a configured web root', () => {
    expect(requireWebRoot('/opt/web/build')).toBe('/opt/web/build');
  });

  it('throws an error naming the setting when empty', () => {
    expect(() => requireWebRoot('')).toThrow(/ACTUAL_WEB_ROOT/);
  });
});
