/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer <Trans> over t() for simple text content in JSX',
      recommended: true,
    },
    schema: [],
    messages: {
      // eslint-disable-next-line actual/typography
      preferTrans: "Prefer <Trans>{{ text }}</Trans> over t('{{ text }}')",
    },
    fixable: 'code',
  },
  create(context) {
    const simpleTextPattern = /^[A-Z][a-z\s]*[a-z](\p{P})?$/u;

    function isSimpleText(text) {
      const trimmed = text.trim();
      if (trimmed === '') return false;

      // Skip if it contains interpolation or complex patterns
      if (trimmed.includes('{{') || trimmed.includes('}}')) return false;
      if (trimmed.includes('\\') || trimmed.includes('`')) return false;

      return simpleTextPattern.test(trimmed);
    }

    function isJSXContent(node) {
      let parent = node.parent;

      // We don't want to outlaw t() calls in these contexts
      const disallowedTypes = [
        'AssignmentExpression', // title = t('Text')
        'VariableDeclarator', // const title = t('Text')
        'JSXAttribute', // title={t('Text')}
        'JSXOpeningElement', // <div title={t('Text')}>
        'ConditionalExpression', // condition ? t('Yes') : t('No')
        'LogicalExpression', // condition && t('Text')
        'CallExpression', // someFunction(t('Text'))
        'Property', // { title: t('Text') }
      ];

      while (parent) {
        if (disallowedTypes.includes(parent.type)) {
          return false;
        }

        if (parent.type === 'ReturnStatement') {
          // Checks if return statement is inside JSX context
          // return <div>{t('Text')}</div> - WILL flag
          // return t('Text') - will NOT flag
          let returnParent = parent.parent;
          while (returnParent) {
            if (returnParent.type === 'JSXElement') {
              break;
            }
            if (
              returnParent.type === 'FunctionDeclaration' ||
              returnParent.type === 'FunctionExpression' ||
              returnParent.type === 'ArrowFunctionExpression'
            ) {
              return false;
            }
            returnParent = returnParent.parent;
          }
        }

        if (parent.type === 'JSXExpressionContainer') {
          // Checks if expression container is inside JSX children (not attributes)
          // <div>{t('Text')}</div> - WILL flag
          // <div title={t('Text')}></div> - will NOT flag
          let containerParent = parent.parent;
          while (containerParent) {
            if (containerParent.type === 'JSXAttribute') {
              return false;
            }
            if (containerParent.type === 'JSXOpeningElement') {
              return false;
            }
            if (containerParent.type === 'JSXElement') {
              const children = containerParent.children || [];
              return children.some(child => child === parent || child === node);
            }
            containerParent = containerParent.parent;
          }
          return true;
        }

        if (parent.type === 'JSXElement') {
          // <div>{t('Text')}</div> - WILL flag
          // <div title={t('Text')}></div> - will NOT flag
          const children = parent.children || [];
          return children.some(
            child =>
              child === node ||
              (child.type === 'JSXExpressionContainer' &&
                child.expression === node),
          );
        }

        parent = parent.parent;
      }

      return false;
    }

    return {
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 't' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string' &&
          isSimpleText(node.arguments[0].value) &&
          isJSXContent(node)
        ) {
          context.report({
            node,
            messageId: 'preferTrans',
            data: {
              text: node.arguments[0].value,
            },
            fix(fixer) {
              const text = node.arguments[0].value;
              const sourceCode = context.getSourceCode();
              const program = sourceCode.ast;

              const fixes = [fixer.replaceText(node, `<Trans>${text}</Trans>`)];

              const firstImport = program.body.find(
                n => n.type === 'ImportDeclaration',
              );
              if (firstImport) {
                fixes.unshift(
                  fixer.insertTextAfter(
                    firstImport,
                    // eslint-disable-next-line actual/typography
                    "\nimport { Trans } from 'react-i18next';",
                  ),
                );
              }

              return fixes;
            },
          });
        }
      },
    };
  },
};
