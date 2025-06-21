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
      // eslint-disable-next-line actual/typography
      quote: `Avoid using straight quotes (' or ") in user-visible text. Use curly quotes (‘ ’ or “ ”) instead.`,
    },
  },

  create(context) {
    // variables should be defined here

    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    function check(node, { value = node.value, strip = false } = {}) {
      // eslint-disable-next-line actual/typography
      if (!value.includes("'") && !value.includes('"')) return;

      let rawText = context.getSourceCode().getText(node);
      if (strip) rawText = rawText.slice(1, -1);
      for (const match of rawText.matchAll(/['"]/g)) {
        const index = node.range[0] + match.index + (strip ? 1 : 0);
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

    function isMemberCall(node, object, properties) {
      return (
        node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        node.callee.property.type === 'Identifier' &&
        properties.includes(node.callee.property.name) &&
        (object
          ? node.callee.object.type === 'Identifier' &&
            node.callee.object.name === object
          : true)
      );
    }

    function isIdentifierCall(node, name) {
      return (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === name
      );
    }

    function isNewRegExp(node) {
      return (
        node.type === 'NewExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'RegExp'
      );
    }

    function isExpectingSQLToMatch(node) {
      if (isIdentifierCall(node, 'sqlLines')) {
        node = node.parent;
      }

      return (
        isMemberCall(node, null, ['toEqual', 'toMatch']) &&
        isIdentifierCall(node.callee.object, 'expect')
      );
    }

    function isSetInnerHTML(node) {
      return (
        node.type === 'AssignmentExpression' &&
        node.operator === '=' &&
        node.left.type === 'MemberExpression' &&
        node.left.property.type === 'Identifier' &&
        node.left.property.name === 'innerHTML'
      );
    }

    function isIgnored(node) {
      return (
        isExpectingSQLToMatch(node) ||
        isNewRegExp(node) ||
        isSetInnerHTML(node) ||
        isIdentifierCall(node, 'runQuery') ||
        isIdentifierCall(node, 'compile') ||
        isMemberCall(node, null, ['querySelector', 'querySelectorAll']) ||
        isMemberCall(node, null, ['runQuery', 'first', 'all']) ||
        isMemberCall(node, null, ['executeJavaScript']) ||
        isMemberCall(node, 'db', ['first', 'all']) ||
        isMemberCall(node, 'spreadsheet', ['set'])
      );
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      Literal(node) {
        if (isIgnored(node.parent)) return;

        if (typeof node.value === 'string') {
          check(node, { strip: true });
        }
      },
      JSXText(node) {
        check(node);
      },
      TemplateElement(node) {
        if (isIgnored(node.parent.parent)) return;

        check(node, { value: node.value.cooked });
      },
    };
  },
};
