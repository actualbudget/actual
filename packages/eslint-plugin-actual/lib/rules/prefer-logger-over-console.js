/* eslint-disable actual/typography */

const { getImportFix } = require('../utils/import-helpers');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Replace console.log/warn/error calls with logger in loot-core files',
    },
    fixable: 'code',
    schema: [],
    messages: {
      preferLogger: 'Use logger.{{method}} instead of console.{{method}}',
    },
  },

  create(context) {
    const filenameRaw = context.getFilename();
    const normalizedFilename = filenameRaw.replace(/\\/g, '/');

    const isLootCoreFile = normalizedFilename.includes(
      'packages/loot-core/src/server',
    );

    if (!isLootCoreFile) {
      return {};
    }

    const methodMap = {
      log: 'log',
      warn: 'warn',
      error: 'error',
      info: 'info',
      debug: 'debug',
      group: 'group',
      groupEnd: 'groupEnd',
    };

    function getLoggerImportInfo() {
      const { ast } = context.getSourceCode();
      for (const node of ast.body) {
        if (
          node.type === 'ImportDeclaration' &&
          typeof node.source.value === 'string' &&
          node.source.value.includes('platform/server/log')
        ) {
          const spec = node.specifiers.find(
            s => s.type === 'ImportSpecifier' && s.imported.name === 'logger',
          );
          if (spec) {
            return { decl: node, localName: spec.local.name };
          }
          return { decl: node, localName: null };
        }
      }
      return { decl: null, localName: null };
    }

    function getLoggerImportPath() {
      const pathParts = normalizedFilename.split('/');
      const serverIndex = pathParts.indexOf('server');

      if (serverIndex > -1) {
        const depth = pathParts.length - serverIndex - 1;
        return '../'.repeat(depth) + 'platform/server/log';
      }

      return '../platform/server/log';
    }

    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'console' &&
          node.callee.property.type === 'Identifier' &&
          methodMap.hasOwnProperty(node.callee.property.name)
        ) {
          const method = node.callee.property.name;

          context.report({
            node,
            messageId: 'preferLogger',
            data: { method },
            fix(fixer) {
              const sourceCode = context.getSourceCode();
              const { decl, localName } = getLoggerImportInfo();
              const loggerIdent = localName || 'logger';
              const fixes = [
                fixer.replaceText(
                  node.callee,
                  `${loggerIdent}.${methodMap[method]}`,
                ),
              ];

              if (!localName) {
                const importPath = getLoggerImportPath();

                // If the module is already imported, append { logger } to it
                if (decl && decl.specifiers && decl.specifiers.length > 0) {
                  const lastSpec = decl.specifiers[decl.specifiers.length - 1];
                  if (lastSpec.type === 'ImportSpecifier') {
                    fixes.unshift(fixer.insertTextAfter(lastSpec, ', logger'));
                  } else {
                    // Fallback: separate import if default/namespace import only
                    fixes.unshift(
                      fixer.insertTextAfter(
                        decl,
                        `\nimport { logger } from '${importPath}';`,
                      ),
                    );
                  }
                } else {
                  // Use shared utility to add the import
                  const importFix = getImportFix(
                    sourceCode,
                    'logger',
                    importPath,
                  )(fixer);
                  if (importFix) fixes.unshift(importFix);
                }
              }

              return fixes;
            },
          });
        }
      },
    };
  },
};
