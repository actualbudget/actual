'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Detects usage of straight quotes in potentially user-visible locations',
    },
    fixable: null,
    schema: [],
    messages: {
      // eslint-disable-next-line rulesdir/typography
      quote: `Avoid using straight quotes (' or "). Use curly quotes (‘ ’ or “ ”) instead.`,
    },
  },

  create(context) {
    // variables should be defined here

    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    function check(node, { value = node.value, strip = false } = {}) {
      if (!value.includes("'") && !value.includes('"')) return;

      let rawText = context.getSourceCode().getText(node);
      if (strip) rawText = rawText.slice(1, -1);
      for (const match of rawText.matchAll(/['"]/g)) {
        let index = node.start + match.index + (strip ? 1 : 0);
        context.report({
          node,
          loc: {
            start: context.getSourceCode().getLocFromIndex(index),
            end: context.getSourceCode().getLocFromIndex(index + 1),
          },
          messageId: 'quote',
        });
      }
    }

    function isQuerySelectorCall(node) {
      return (
        node.parent.type === 'CallExpression' &&
        node.parent.arguments[0] === node &&
        node.parent.callee.type === 'MemberExpression' &&
        node.parent.callee.property.type === 'Identifier' &&
        (node.parent.callee.property.name === 'querySelector' ||
          node.parent.callee.property.name === 'querySelectorAll')
      );
    }
    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      Literal(node) {
        if (isQuerySelectorCall(node)) return;

        if (typeof node.value === 'string') {
          check(node, { strip: true });
        }
      },
      JSXText(node) {
        check(node);
      },
      TemplateElement(node) {
        check(node, { value: node.value.cooked });
      },
    };
  },
};
