import path from 'path';

// Turns plugin package names into directory-safe ids for storage and URLs.
export function sanitizePluginSlug(pluginName: string): string {
  const slug = Array.from(pluginName)
    .map(character => (isPluginSlugCharacter(character) ? character : '-'))
    .join('');
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

// Rejects zip-slip payloads before extracting uploaded plugin archives.
export function assertSafeZipEntries(entryNames: Iterable<string>): void {
  for (const rawEntryName of entryNames) {
    const entryName = rawEntryName.split('\\').join('/');
    const normalizedEntryName = path.posix.normalize(entryName);
    if (
      hasWindowsDrivePrefix(entryName) ||
      hasWindowsDrivePrefix(normalizedEntryName) ||
      normalizedEntryName === '..' ||
      normalizedEntryName.startsWith('../') ||
      path.posix.isAbsolute(normalizedEntryName)
    ) {
      throw new Error('Plugin zip contains an unsafe path');
    }
  }
}

function isPluginSlugCharacter(character: string): boolean {
  return (
    (character >= 'a' && character <= 'z') ||
    (character >= 'A' && character <= 'Z') ||
    (character >= '0' && character <= '9') ||
    character === '.' ||
    character === '_' ||
    character === '-'
  );
}

function hasWindowsDrivePrefix(value: string): boolean {
  if (value.length < 2 || value[1] !== ':') {
    return false;
  }

  const driveLetter = value[0];
  return (
    (driveLetter >= 'a' && driveLetter <= 'z') ||
    (driveLetter >= 'A' && driveLetter <= 'Z')
  );
}
