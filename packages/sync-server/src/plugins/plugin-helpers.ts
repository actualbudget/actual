import path from 'path';

import type AdmZip from 'adm-zip';

import type {
  DevPluginLocator,
  DevPluginLocatorInput,
  FrontendManifest,
  JsonRecord,
  Manifest,
  SyncServerManifest,
} from './plugin-types.js';

const windowsDrivePathPattern = /^[a-zA-Z]:/;

// Narrows untrusted JSON and IPC payloads before reading fields from them.
export function isRecord(value: unknown): value is JsonRecord {
  return value != null && typeof value === 'object';
}

// Keeps catch blocks useful without assuming thrown values are Error objects.
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Turns plugin package names into directory-safe ids for storage and URLs.
export function sanitizePluginSlug(pluginName: string): string {
  const slug = pluginName.replace(/[^a-zA-Z0-9._-]/g, '-');
  return slug === '' || slug === '.' || slug === '..' ? 'plugin' : slug;
}

// Prevents plugin entries and zip contents from escaping their plugin root.
function isPathInside(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  );
}

// Resolves manifest-relative paths only after enforcing the plugin sandbox.
export function resolvePluginPath(
  pluginPath: string,
  relativeEntry: string,
): string {
  if (typeof relativeEntry !== 'string' || path.isAbsolute(relativeEntry)) {
    throw new Error('Plugin entry must be a relative path');
  }

  const resolvedPluginPath = path.resolve(pluginPath);
  const resolvedEntryPath = path.resolve(resolvedPluginPath, relativeEntry);
  if (!isPathInside(resolvedPluginPath, resolvedEntryPath)) {
    throw new Error('Plugin entry must stay inside the plugin directory');
  }
  return resolvedEntryPath;
}

// Ensures frontend and sync-server entrypoints stay in their capability dirs.
export function isPluginPathInsideDir(
  pluginPath: string,
  relativeDir: string,
  relativeEntry: string,
): boolean {
  const resolvedDir = resolvePluginPath(pluginPath, relativeDir);
  const resolvedEntry = resolvePluginPath(pluginPath, relativeEntry);
  return isPathInside(resolvedDir, resolvedEntry);
}

// Rejects zip-slip payloads before extracting uploaded plugin archives.
export function assertSafeZipEntries(zip: AdmZip): void {
  for (const entry of zip.getEntries()) {
    const entryName = entry.entryName.replace(/\\/g, '/');
    const normalizedEntryName = path.posix.normalize(entryName);
    if (
      windowsDrivePathPattern.test(entryName) ||
      windowsDrivePathPattern.test(normalizedEntryName) ||
      normalizedEntryName === '..' ||
      normalizedEntryName.startsWith('../') ||
      path.posix.isAbsolute(normalizedEntryName)
    ) {
      throw new Error('Plugin zip contains an unsafe path');
    }
  }
}

// Keeps local dev plugin registration out of production servers.
export function assertDevPluginRegistrationAllowed() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Dev plugins can only be registered in development mode');
  }
}

// Accepts dev-server paths while keeping manifest and entry fetches same-origin.
export function normalizeDevPluginPath(rawPath: unknown): string {
  const rawPathname =
    typeof rawPath === 'string' && rawPath !== '' ? rawPath : '/';
  const decodedPathname = decodeDevPluginPathForValidation(rawPathname);
  const validationPathname = decodedPathname.replace(/\\/g, '/');

  if (
    !rawPathname.startsWith('/') ||
    !validationPathname.startsWith('/') ||
    validationPathname.split('/').includes('..')
  ) {
    throw new Error('Dev plugin URL path must stay inside the origin');
  }

  return path.posix.normalize(rawPathname);
}

function decodeDevPluginPathForValidation(rawPathname: string): string {
  let decodedPathname = rawPathname;

  while (true) {
    let nextPathname: string;
    try {
      nextPathname = decodeURIComponent(decodedPathname);
    } catch {
      if (decodedPathname === rawPathname) {
        throw new Error('Dev plugin URL path must stay inside the origin');
      }
      return decodedPathname;
    }

    if (nextPathname === decodedPathname) {
      return decodedPathname;
    }
    decodedPathname = nextPathname;
  }
}

// Allows a compact dev plugin config while still rejecting invalid ports.
function normalizeDevPluginPort(rawPort: unknown): string {
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Dev plugin port must be a valid TCP port');
  }

  return String(port);
}

// Normalizes every supported dev plugin locator shape into one fetch target.
export function normalizeDevPluginLocator(
  rawLocator: DevPluginLocatorInput,
): DevPluginLocator {
  if (
    typeof rawLocator === 'number' ||
    (typeof rawLocator === 'string' && /^\d+$/.test(rawLocator))
  ) {
    return {
      port: normalizeDevPluginPort(rawLocator),
      path: '/manifest.json',
      search: '',
    };
  }

  if (isRecord(rawLocator)) {
    return {
      port: normalizeDevPluginPort(rawLocator.port),
      path: normalizeDevPluginPath(rawLocator.path ?? '/manifest.json'),
      search:
        typeof rawLocator.search === 'string' &&
        rawLocator.search.startsWith('?')
          ? rawLocator.search
          : '',
    };
  }

  if (typeof rawLocator !== 'string') {
    throw new Error('Dev plugin manifest location must be a string or object');
  }

  const url = new URL(rawLocator);
  return {
    port: normalizeDevPluginPort(url.port),
    path: normalizeDevPluginPath(url.pathname),
    search: url.search,
  };
}

// Centralizes dev plugin fetch URL construction after locator validation.
export function buildDevPluginUrl(locator: DevPluginLocator): string {
  return `http://127.0.0.1:${locator.port}${locator.path}${locator.search}`;
}

// Type guard for plugins that expose frontend assets to desktop-client.
export function isFrontendPlugin(
  manifest: Manifest,
): manifest is FrontendManifest {
  return manifest.type === 'frontend' || manifest.type === 'mixed';
}

// Type guard for plugins that need a forked sync-server runner.
export function isSyncServerPlugin(
  manifest: Manifest,
): manifest is SyncServerManifest {
  return manifest.type === 'syncserver' || manifest.type === 'mixed';
}

// Validates the shared manifest before any plugin code is imported or served.
export function validateManifest(manifest: unknown): Manifest {
  if (!isRecord(manifest)) {
    throw new Error('Plugin manifest must be an object');
  }

  const candidate = manifest as Partial<Manifest>;

  if (!candidate.name || typeof candidate.name !== 'string') {
    throw new Error('Plugin manifest must specify a name');
  }

  if (!candidate.version || typeof candidate.version !== 'string') {
    throw new Error('Plugin manifest must specify a version');
  }

  if (
    candidate.type !== 'frontend' &&
    candidate.type !== 'syncserver' &&
    candidate.type !== 'mixed'
  ) {
    throw new Error(
      "Plugin manifest type must be 'frontend', 'syncserver', or 'mixed'",
    );
  }

  if (
    (candidate.type === 'frontend' || candidate.type === 'mixed') &&
    typeof candidate.frontend?.entry !== 'string'
  ) {
    throw new Error('Frontend plugins must specify frontend.entry');
  }

  if (
    (candidate.type === 'syncserver' || candidate.type === 'mixed') &&
    typeof candidate.syncserver?.entry !== 'string'
  ) {
    throw new Error('Sync-server plugins must specify syncserver.entry');
  }

  if (candidate.type === 'frontend' && candidate.syncserver) {
    throw new Error('Frontend-only plugins cannot specify syncserver config');
  }

  if (candidate.type === 'syncserver' && candidate.frontend) {
    throw new Error('Sync-server-only plugins cannot specify frontend config');
  }

  return candidate as Manifest;
}
