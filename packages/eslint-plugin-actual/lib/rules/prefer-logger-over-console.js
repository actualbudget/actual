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

    const isLootCoreFile = normalizedFilename.includes('packages/loot-core/src/server');

    if (!isLootCoreFile) {
      return {};
    }

    const methodMap = {
      log: 'log',
      warn: 'warn',
      error: 'error',
      info: 'info',
      group: 'group',
      groupEnd: 'groupEnd',
    };

    function hasLoggerImport() {
      const sourceCode = context.getSourceCode();
      const ast = sourceCode.ast;

      return ast.body.some(
        node =>
          node.type === 'ImportDeclaration' &&
          node.source.value.includes('platform/server/log'),
      );
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
              const program = sourceCode.ast;

              const fixes = [
                fixer.replaceText(node.callee, `logger.${methodMap[method]}`),
              ];

              if (!hasLoggerImport()) {
                const importPath = getLoggerImportPath();
                const firstImport = program.body.find(
                  n => n.type === 'ImportDeclaration',
                );
                if (firstImport) {
                  fixes.unshift(
                    fixer.insertTextAfter(
                      firstImport,
                      // eslint-disable-next-line actual/typography
                      `\nimport { logger } from '${importPath}';`,
                    ),
                  );
                } else {
                  fixes.unshift(
                    fixer.insertTextBefore(
                      program.body[0],
                      // eslint-disable-next-line actual/typography
                      `import { logger } from '${importPath}';\n`,
                    ),
                  );
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
