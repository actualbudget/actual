const path = require('path');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer subpath imports (#path/to/module) over relative backtracked imports (../path/to/module) in loot-core',
    },
    fixable: 'code',
    schema: [],
    messages: {
      preferSubpathImport:
        'Use subpath import "{{subpath}}" instead of relative import "{{original}}"',
    },
  },

  create(context) {
    const filenameRaw = context.getFilename();
    const normalizedFilename = filenameRaw.replace(/\\/g, '/');

    // Only apply to files inside packages/loot-core/src/
    const lootCoreMatch = normalizedFilename.match(
      /packages\/loot-core\/src\//,
    );
    if (!lootCoreMatch) {
      return {};
    }

    // Get the absolute path to the src/ directory
    const srcIndex =
      normalizedFilename.indexOf('packages/loot-core/src/') +
      'packages/loot-core/src/'.length;
    const srcDir = normalizedFilename.slice(0, srcIndex);

    function getSubpathImport(importSource) {
      // Only transform backtracked imports
      if (!importSource.startsWith('../')) {
        return null;
      }

      const fileDir = path.dirname(normalizedFilename);
      const resolved = path.posix.join(fileDir, importSource);

      // Check that the resolved path is inside src/
      if (!resolved.startsWith(srcDir.slice(0, -1))) {
        return null;
      }

      // Get path relative to src/
      let subpath = resolved.slice(srcDir.length);

      // Strip file extensions
      subpath = subpath.replace(/\.(ts|tsx|js|jsx)$/, '');

      // Strip trailing /index
      subpath = subpath.replace(/\/index$/, '');

      return '#' + subpath;
    }

    function checkAndReport(node, source) {
      if (!source || typeof source.value !== 'string') return;

      const subpath = getSubpathImport(source.value);
      if (!subpath) return;

      context.report({
        node: source,
        messageId: 'preferSubpathImport',
        data: {
          subpath,
          original: source.value,
        },
        fix(fixer) {
          const raw = source.raw;
          const quote = raw[0];
          return fixer.replaceText(source, `${quote}${subpath}${quote}`);
        },
      });
    }

    return {
      ImportDeclaration(node) {
        checkAndReport(node, node.source);
      },
      ExportNamedDeclaration(node) {
        checkAndReport(node, node.source);
      },
      ExportAllDeclaration(node) {
        checkAndReport(node, node.source);
      },
    };
  },
};
