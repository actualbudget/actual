//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Forbid TypeScript enum declarations in favor of objects or maps',
    },
    fixable: null,
    schema: [],
    messages: {
      noEnum:
        'Avoid `enum` — use an object or a map instead (see contributing/code-style.md).',
    },
  },

  createOnce(context) {
    return {
      TSEnumDeclaration(node) {
        context.report({
          node,
          messageId: 'noEnum',
        });
      },
    };
  },
};
