const fs = require('fs');
const path = require('path');

// Module-level cache: packageDir -> { name: string, allowedDeps: Set<string>, dirName: string }
const packageCache = new Map();

// Reverse map: directory name -> package name (e.g. 'desktop-client' -> '@actual-app/web')
const dirToPackageName = new Map();

// Find monorepo root by walking up from this file's directory
let monorepoRoot = null;
function findMonorepoRoot() {
  if (monorepoRoot !== null) return monorepoRoot;
  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, 'packages')) &&
      fs.existsSync(path.join(dir, 'package.json'))
    ) {
      monorepoRoot = dir;
      return dir;
    }
    dir = path.dirname(dir);
  }
  monorepoRoot = false;
  return false;
}

/**
 * Computes a monorepo-root-relative path for reliable package detection.
 * This avoids false matches when the checkout itself is under a directory named "packages/".
 */
function toMonorepoRelative(filename) {
  const monoRoot = findMonorepoRoot();
  if (!monoRoot) return null;

  const normalized = filename.replace(/\\/g, '/');
  const normalizedRoot = monoRoot.replace(/\\/g, '/');

  if (normalized.startsWith(normalizedRoot + '/')) {
    return normalized.substring(normalizedRoot.length + 1);
  }

  // For relative paths, try to resolve against monorepo root
  const resolved = path.resolve(monoRoot, filename).replace(/\\/g, '/');
  if (resolved.startsWith(normalizedRoot + '/')) {
    return resolved.substring(normalizedRoot.length + 1);
  }

  return null;
}

/**
 * Finds the package info for a given filename by locating the nearest
 * packages/<dir>/package.json in the file path, anchored to the monorepo root.
 */
function getPackageInfo(filename) {
  const relative = toMonorepoRelative(filename);
  if (!relative) return null;

  const match = relative.match(/^packages\/([^/]+)\//);
  if (!match) return null;

  const packageDir = match[1];
  if (packageCache.has(packageDir)) return packageCache.get(packageDir);

  const monoRoot = findMonorepoRoot();
  const pkgJsonPath = path.join(
    monoRoot,
    'packages',
    packageDir,
    'package.json',
  );

  try {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const allowed = new Set();
    for (const depType of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]) {
      if (pkgJson[depType]) {
        for (const dep of Object.keys(pkgJson[depType])) {
          if (dep.startsWith('@actual-app/')) {
            allowed.add(dep);
          }
        }
      }
    }
    const info = {
      name: pkgJson.name,
      allowedDeps: allowed,
      dirName: packageDir,
    };
    packageCache.set(packageDir, info);
    dirToPackageName.set(packageDir, pkgJson.name);
    return info;
  } catch {
    return null;
  }
}

/**
 * Extracts the @actual-app/<name> package name from an import source.
 * Returns null if the source is not an @actual-app/ import.
 */
function extractActualPackageName(importSource) {
  const match = importSource.match(/^(@actual-app\/[^/]+)/);
  return match ? match[1] : null;
}

/**
 * For a relative import, resolves which packages/<dir> it lands in.
 * Returns the target directory name if it crosses into a different package, null otherwise.
 */
function resolveRelativeCrossPackage(importSource, filename, currentDirName) {
  if (!importSource.startsWith('.')) return null;

  const relative = toMonorepoRelative(filename);
  if (!relative) return null;

  const fileDir = path.posix.dirname(relative);
  const resolved = path.posix.normalize(path.posix.join(fileDir, importSource));
  const match = resolved.match(/^packages\/([^/]+)\//);
  if (!match) return null;

  const targetDir = match[1];
  if (targetDir === currentDirName) return null;

  return targetDir;
}

/**
 * Gets the package name for a directory, loading its package.json if needed.
 */
function getPackageNameForDir(targetDir) {
  if (dirToPackageName.has(targetDir)) return dirToPackageName.get(targetDir);

  // Force loading the package info which populates dirToPackageName
  const info = getPackageInfo(`packages/${targetDir}/dummy.ts`);
  return info ? info.name : null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow importing from other packages unless declared as a dependency in package.json',
    },
    fixable: null,
    schema: [],
    messages: {
      noCrossPackageImport:
        'Package "{{currentPackage}}" does not declare a dependency on "{{importedPackage}}". Add it to dependencies in package.json or remove the import.',
      hardBannedImport:
        'Package "{{currentPackage}}" must never import "{{importedPackage}}". This boundary is enforced unconditionally to keep {{currentPackage}} platform-agnostic.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    const pkgInfo = getPackageInfo(filename);

    // Not inside a recognized package — nothing to check
    if (!pkgInfo) return {};

    // Hard-banned import pairs: these are always forbidden regardless of package.json deps
    const HARD_BANS = [{ from: '@actual-app/core', to: '@actual-app/web' }];

    function isHardBanned(currentPkg, targetPkg) {
      return HARD_BANS.some(
        ban => ban.from === currentPkg && ban.to === targetPkg,
      );
    }

    function checkImportSource(node, source) {
      if (typeof source !== 'string') return;

      // Check @actual-app/* imports
      const importedPackage = extractActualPackageName(source);
      if (importedPackage) {
        if (importedPackage === pkgInfo.name) return;

        if (isHardBanned(pkgInfo.name, importedPackage)) {
          context.report({
            node,
            messageId: 'hardBannedImport',
            data: {
              currentPackage: pkgInfo.name,
              importedPackage,
            },
          });
          return;
        }

        if (!pkgInfo.allowedDeps.has(importedPackage)) {
          context.report({
            node,
            messageId: 'noCrossPackageImport',
            data: {
              currentPackage: pkgInfo.name,
              importedPackage,
            },
          });
        }
        return;
      }

      // Check relative imports that cross package boundaries
      const targetDir = resolveRelativeCrossPackage(
        source,
        filename,
        pkgInfo.dirName,
      );
      if (targetDir) {
        const targetPkgName = getPackageNameForDir(targetDir) || targetDir;

        if (isHardBanned(pkgInfo.name, targetPkgName)) {
          context.report({
            node,
            messageId: 'hardBannedImport',
            data: {
              currentPackage: pkgInfo.name,
              importedPackage: targetPkgName,
            },
          });
          return;
        }

        if (!pkgInfo.allowedDeps.has(targetPkgName)) {
          context.report({
            node,
            messageId: 'noCrossPackageImport',
            data: {
              currentPackage: pkgInfo.name,
              importedPackage: targetPkgName,
            },
          });
        }
      }
    }

    return {
      ImportDeclaration(node) {
        checkImportSource(node, node.source.value);
      },

      // require() calls
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal'
        ) {
          checkImportSource(node, node.arguments[0].value);
        }
      },

      // Dynamic import()
      ImportExpression(node) {
        if (node.source.type === 'Literal') {
          checkImportSource(node, node.source.value);
        }
      },

      // export { foo } from '...'
      ExportNamedDeclaration(node) {
        if (node.source) {
          checkImportSource(node, node.source.value);
        }
      },

      // export * from '...'
      ExportAllDeclaration(node) {
        if (node.source) {
          checkImportSource(node, node.source.value);
        }
      },
    };
  },
};
