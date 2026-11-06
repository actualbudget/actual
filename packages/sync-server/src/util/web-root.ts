import { createRequire } from 'node:module';
import path from 'node:path';

function resolveWebPackageJson(moduleUrl: string) {
  // Keep the `require.resolve(...)` form: it's how knip sees that this
  // package depends on @actual-app/web.
  const require = createRequire(moduleUrl);
  return require.resolve('@actual-app/web/package.json');
}

function isModuleNotFound(error: unknown) {
  const code =
    error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
  return code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND';
}

/**
 * Default web root: the build directory of the installed @actual-app/web.
 * Empty when it can't be located: when the server is bundled for a runtime
 * without a module URL, or when the web app isn't installed alongside the
 * server (e.g. its build is served separately). Other failures are rethrown.
 */
export function resolveWebBuildPath(
  moduleUrl: string | undefined,
  resolvePackageJson: (moduleUrl: string) => string = resolveWebPackageJson,
): string {
  if (!moduleUrl) {
    return '';
  }

  try {
    return path.join(path.dirname(resolvePackageJson(moduleUrl)), 'build');
  } catch (error) {
    if (!isModuleNotFound(error)) {
      throw error;
    }
    return '';
  }
}

/** Returns `webRoot`, or throws a descriptive error if it's empty. */
export function requireWebRoot(webRoot: string): string {
  if (!webRoot) {
    throw new Error(
      'webRoot is empty: install @actual-app/web or set ACTUAL_WEB_ROOT to its build directory.',
    );
  }
  return webRoot;
}
