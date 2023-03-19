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

    function check(node, value = node.value) {
      // eslint-disable-next-line rulesdir/typography
      if (value.includes('"') || value.includes("'")) {
        context.report({ node, messageId: 'quote' });
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
          check(node);
        }
      },
      JSXText(node) {
        check(node);
      },
      TemplateElement(node) {
        check(node, node.value.cooked);
      },
    };
  },
};
