const { ensureImport } = require('../utils/import-helpers');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow non-translated English strings',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      useTrans: 'Non-translated English string. Wrap in <Trans>.',
      useT: 'Non-translated English string. Wrap in t().',
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
        // Check if inside a translation function call like t()
        if (parent.type === 'CallExpression') {
          const callee = parent.callee;
          if (
            (callee.type === 'Identifier' && callee.name === 't') ||
            (callee.type === 'MemberExpression' &&
              callee.property.type === 'Identifier' &&
              callee.property.name === 't')
          ) {
            return true;
          }
        }
        parent = parent.parent;
      }
      return false;
    }

    function isProgrammaticString(node) {
      const parent = node.parent;
      if (!parent) return false;

      const programmaticTypes = [
        'BinaryExpression',
        'SwitchCase',
        'ArrayExpression',
        'TSAsExpression',
        'TSLiteralType',
        'CallExpression',
      ];

      if (programmaticTypes.includes(parent.type)) {
        return true;
      }

      // Property values are context-dependent, let JSX context check handle them
      if (parent.type === 'Property' && parent.value === node) {
        return false;
      }

      return false;
    }

    function isUserFacingJSXAttribute(node) {
      const userFacingAttributes = [
        'aria-label',
        'aria-description',
        'aria-placeholder',
        'aria-roledescription',
        'aria-valuetext',
        'title',
        'placeholder',
        'alt',
        'label',
        'value',
        'header',
        'content',
        'message',
        'text',
        'description',
      ];

      let parent = node.parent;
      while (parent) {
        if (parent.type === 'JSXAttribute') {
          const attrName = parent.name?.name;
          return userFacingAttributes.includes(attrName);
        }
        parent = parent.parent;
      }
      return false;
    }

    function isInJSXContext(node) {
      let p = node.parent;
      while (p) {
        if (p.type === 'JSXAttribute') {
          return isUserFacingJSXAttribute(node);
        }
        p = p.parent;
      }

      // Not in an attribute, check if we're in JSX content
      let parent = node.parent;
      while (parent) {
        // JSX text content and fragments are always user-facing
        if (
          parent.type === 'JSXElement' ||
          parent.type === 'JSXFragment' ||
          parent.type === 'JSXExpressionContainer'
        ) {
          return true;
        }

        // Stop at function boundaries to avoid false positives
        if (
          parent.type === 'FunctionDeclaration' ||
          parent.type === 'FunctionExpression' ||
          parent.type === 'ArrowFunctionExpression'
        ) {
          // But keep going if this function is directly in a JSX context
          // (e.g., inline arrow functions in JSX)
          const grandparent = parent.parent;
          if (
            !grandparent ||
            (grandparent.type !== 'JSXExpressionContainer' &&
              grandparent.type !== 'JSXAttribute' &&
              grandparent.type !== 'CallExpression')
          ) {
            return false;
          }
        }
        parent = parent.parent;
      }
      return false;
    }

    function isInJSXAttribute(node) {
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'JSXAttribute') {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    }

    function getFix(node, isJSXText = false) {
      const sourceCode = context.getSourceCode();

      return fixer => {
        const fixes = [];

        if (isJSXText) {
          // For JSX text, wrap with <Trans>
          fixes.push(fixer.replaceText(node, `<Trans>${node.value}</Trans>`));
          ensureImport(fixes, sourceCode, fixer, 'Trans', 'react-i18next');
        } else {
          // For string literals
          const text = sourceCode.getText(node);

          if (isInJSXAttribute(node)) {
            fixes.push(fixer.replaceText(node, `{t(${text})}`));
          } else {
            fixes.push(fixer.replaceText(node, `t(${text})`));
          }
        }

        return fixes;
      };
    }

    return {
      JSXText(node) {
        if (isProbablyEnglish(node.value) && !isInsideTrans(node)) {
          context.report({
            node,
            messageId: 'useTrans',
            fix: getFix(node, true),
          });
        }
      },
      Literal(node) {
        if (
          typeof node.value === 'string' &&
          isProbablyEnglish(node.value) &&
          !isProgrammaticString(node) &&
          isInJSXContext(node) &&
          !isInsideTrans(node)
        ) {
          context.report({
            node,
            messageId: 'useT',
            fix: getFix(node, false),
          });
        }
      },
      TemplateLiteral(node) {
        if (isProgrammaticString(node)) {
          return;
        }

        node.quasis.forEach(quasi => {
          if (
            isProbablyEnglish(quasi.value.cooked) &&
            isInJSXContext(node) &&
            !isInsideTrans(node)
          ) {
            // Template literals are harder to auto-fix, so skip for now
            context.report({ node: quasi, messageId: 'useT' });
          }
        });
      },
    };
  },
};
