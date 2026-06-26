/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce architectural boundaries: no tsconfig paths, no Vite resolve.alias, no backtracked imports (../../)',
    },
    fixable: null,
    schema: [],
    messages: {
      noTsconfigPaths:
        'tsconfig "compilerOptions.paths" is not allowed. Use package.json subpath imports (#path) instead.',
      noResolveAlias:
        'Vite "resolve.alias" is not allowed. Use package.json subpath imports (#path) instead.',
      noBacktrackedImport:
        'Backtracked import "{{source}}" is not allowed. Use subpath imports (#path) or package imports instead.',
    },
  },

  create(context) {
    function getPropertyName(node) {
      if (!node || !node.key) return null;
      if (node.key.type === 'Identifier') return node.key.name;
      if (node.key.type === 'Literal') return String(node.key.value);
      return null;
    }

    function isBacktrackedImport(source) {
      return typeof source === 'string' && source.startsWith('../../');
    }

    function reportBacktrackedImport(node, source) {
      if (!source || !isBacktrackedImport(source.value)) return;
      context.report({
        node: source,
        messageId: 'noBacktrackedImport',
        data: { source: source.value },
      });
    }

    return {
      Property(node) {
        const name = getPropertyName(node);
        if (name !== 'paths' && name !== 'alias') return;

        const parentObject = node.parent;
        if (!parentObject || parentObject.type !== 'ObjectExpression') return;

        const grandparent = parentObject.parent;
        if (!grandparent || grandparent.type !== 'Property') return;

        const grandparentName = getPropertyName(grandparent);

        if (name === 'paths' && grandparentName === 'compilerOptions') {
          context.report({ node, messageId: 'noTsconfigPaths' });
        }

        if (name === 'alias' && grandparentName === 'resolve') {
          context.report({ node, messageId: 'noResolveAlias' });
        }
      },

      ImportDeclaration(node) {
        reportBacktrackedImport(node, node.source);
      },

      ExportNamedDeclaration(node) {
        reportBacktrackedImport(node, node.source);
      },

      ExportAllDeclaration(node) {
        reportBacktrackedImport(node, node.source);
      },

      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          isBacktrackedImport(node.arguments[0].value)
        ) {
          context.report({
            node: node.arguments[0],
            messageId: 'noBacktrackedImport',
            data: { source: node.arguments[0].value },
          });
        }
      },

      ImportExpression(node) {
        if (
          node.source.type === 'Literal' &&
          isBacktrackedImport(node.source.value)
        ) {
          context.report({
            node: node.source,
            messageId: 'noBacktrackedImport',
            data: { source: node.source.value },
          });
        }
      },
    };
  },
};
