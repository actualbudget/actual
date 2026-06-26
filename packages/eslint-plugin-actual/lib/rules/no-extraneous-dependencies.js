const fs = require('fs');
const path = require('path');
const Module = require('module');

const builtins = new Set(Module.builtinModules.flatMap(m => [m, `node:${m}`]));

// Cache: directory path → { name, deps } | null
const pkgCache = new Map();

function getPackageName(source) {
  if (source.startsWith('@')) {
    // @scope/pkg or @scope/pkg/deep → @scope/pkg
    const parts = source.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }
  // pkg or pkg/deep → pkg
  return source.split('/')[0];
}

function findPackageJson(dir) {
  if (pkgCache.has(dir)) return pkgCache.get(dir);

  const visited = [dir];
  let current = dir;
  let result = null;

  while (true) {
    const pkgPath = path.join(current, 'package.json');
    try {
      const content = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (content.name) {
        result = {
          name: content.name,
          deps: new Set([
            ...Object.keys(content.dependencies || {}),
            ...Object.keys(content.devDependencies || {}),
          ]),
        };
        break;
      }
    } catch {
      // keep walking
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
    visited.push(current);
  }

  for (const d of visited) {
    pkgCache.set(d, result);
  }
  return result;
}

function isExternalImport(source) {
  if (
    source.startsWith('.') ||
    source.startsWith('#') ||
    source.startsWith('virtual:')
  ) {
    return false;
  }
  // Check builtins using the package name to handle subpaths like fs/promises
  const pkgName = getPackageName(source);
  if (pkgName && builtins.has(pkgName)) return false;
  return true;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow importing packages not listed in dependencies or devDependencies',
    },
    schema: [],
    messages: {
      extraneous:
        '"{{packageName}}" is not listed in dependencies or devDependencies. Add it to the package.json of this workspace.',
    },
  },

  createOnce(context) {
    let pkg;

    function check(node, source) {
      if (!source || typeof source.value !== 'string') return;

      const importSource = source.value;
      if (!isExternalImport(importSource)) return;

      const packageName = getPackageName(importSource);
      if (!packageName) return;

      // Allow self-references
      if (packageName === pkg.name) return;

      if (!pkg.deps.has(packageName)) {
        context.report({
          node: source,
          messageId: 'extraneous',
          data: { packageName },
        });
      }
    }

    return {
      before() {
        pkg = findPackageJson(path.dirname(context.filename));
        if (!pkg) return false;
      },
      ImportDeclaration(node) {
        check(node, node.source);
      },
      ExportNamedDeclaration(node) {
        check(node, node.source);
      },
      ExportAllDeclaration(node) {
        check(node, node.source);
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          check(node, node.arguments[0]);
        }
      },
    };
  },
};
