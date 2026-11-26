const rawVariable = /var\(\s*--color-/;

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow hand-written `var(--color-*)` strings in favor of theme tokens',
    },
    fixable: null,
    schema: [],
    messages: {
      useThemeToken:
        'Hand-written `var(--color-*)` strings are not checked against the theme. Use the matching token from `theme` instead.',
    },
  },

  createOnce(context) {
    function check(node, text) {
      if (typeof text === 'string' && rawVariable.test(text)) {
        context.report({ node, messageId: 'useThemeToken' });
      }
    }

    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};
