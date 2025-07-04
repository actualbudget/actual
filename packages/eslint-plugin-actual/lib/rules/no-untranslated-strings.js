/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow non-translated English strings',
      recommended: true,
    },
    schema: [],
    messages: {
      noHardcoded: 'Non-translated English string. Wrap in <Trans>.',
    },
  },
  create(context) {
    const whitelist = [
      'Actual',
      'GoCardless',
      'SimpleFIN',
      'Pluggy.ai',
      'YNAB',
      'nYNAB',
      'YNAB4',

      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ];

    function isProbablyEnglish(text) {
      const trimmed = text.trim();
      if (whitelist.includes(trimmed)) {
        return false;
      }

      // very basic - but it'll catch most cases
      return /^[A-Z][a-z].*[a-z](\p{P})?$/.test(trimmed);
    }

    function isInsideTrans(node) {
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'JSXElement') {
          const elementName = parent.openingElement.name;
          // Check for both JSXIdentifier and JSXMemberExpression (e.g., Trans.Provider)
          if (
            elementName.type === 'JSXIdentifier' &&
            elementName.name === 'Trans'
          ) {
            return true;
          }
          if (
            elementName.type === 'JSXMemberExpression' &&
            elementName.object.name === 'Trans'
          ) {
            return true;
          }
        }
        parent = parent.parent;
      }
      return false;
    }

    return {
      JSXText(node) {
        if (isProbablyEnglish(node.value) && !isInsideTrans(node)) {
          context.report({ node, messageId: 'noHardcoded' });
        }
      },
      Literal(node) {
        if (
          node.parent &&
          node.parent.type === 'JSXExpressionContainer' &&
          typeof node.value === 'string' &&
          isProbablyEnglish(node.value) &&
          !isInsideTrans(node)
        ) {
          context.report({ node, messageId: 'noHardcoded' });
        }
      },
    };
  },
};
