//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Detects usage of curly quotes in potentially user-visible locations',
    },
    fixable: 'code',
    schema: [],
    messages: {
      quote: `Avoid using curly quotes (\u2018 \u2019 or \u201C \u201D) in user-visible text. Use straight quotes (' or ") instead.`,
    },
  },

  create(context) {
    // variables should be defined here

    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    function check(node, { value = node.value, strip = false } = {}) {
      if (
        !value.includes('\u2018') &&
        !value.includes('\u2019') &&
        !value.includes('\u201C') &&
        !value.includes('\u201D')
      ) {
        return;
      }

      let rawText = context.getSourceCode().getText(node);
      const originalRawText = rawText;
      if (strip) rawText = rawText.slice(1, -1);

      // Find all curly quote matches (U+2018, U+2019, U+201C, U+201D)
      const curlyQuoteRegex = /[\u2018\u2019\u201C\u201D]/g;
      const matches = Array.from(rawText.matchAll(curlyQuoteRegex));
      if (matches.length === 0) return;

      const sourceCode = context.getSourceCode();

      // Determine the quote delimiter type for fixing
      const firstChar = originalRawText[0];
      const isSingleQuoted = firstChar === "'";
      const isDoubleQuoted = firstChar === '"';

      // Create a shared fix function that replaces all curly quotes
      const createFix = () => {
        return fixer => {
          // Replace curly quotes with appropriate straight quotes
          // Escape them if they match the delimiter
          const fixedText = originalRawText.replace(curlyQuoteRegex, match => {
            // U+2018, U+2019 are single curly quotes
            // U+201C, U+201D are double curly quotes
            const isCurlySingle = match === '\u2018' || match === '\u2019';
            const isCurlyDouble = match === '\u201C' || match === '\u201D';

            if (isSingleQuoted && isCurlySingle) {
              // In single-quoted strings, escape single quotes
              return "\\'";
            } else if (isDoubleQuoted && isCurlyDouble) {
              // In double-quoted strings, escape double quotes
              return '\\"';
            } else if (isCurlySingle) {
              // Curly single quote in double-quoted string or template literal
              return "'";
            } else {
              // Curly double quote in single-quoted string or template literal
              return '"';
            }
          });
          return fixer.replaceTextRange(
            [node.range[0], node.range[1]],
            fixedText,
          );
        };
      };

      // Report one error per curly quote match
      for (const match of matches) {
        const index = node.range[0] + match.index + (strip ? 1 : 0);
        context.report({
          node,
          loc: {
            start: sourceCode.getLocFromIndex(index),
            end: sourceCode.getLocFromIndex(index + 1),
          },
          messageId: 'quote',
          fix: createFix(),
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
