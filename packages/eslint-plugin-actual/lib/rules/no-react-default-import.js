//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Forbid usage of default React import (React.*) in favor of named exports',
    },
    fixable: null,
    schema: [],
    messages: {
      useNamedExport:
        'Using default React import is discouraged, please use named exports directly instead.',
    },
  },

  create(context) {
    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    /**
     * Checks if a node is a React default import usage
     * @param {import('estree').Node} node
     * @returns {boolean}
     */
    function isReactDefaultImport(node) {
      // Check MemberExpression: React.Component, React.useState, etc.
      if (node.type === 'MemberExpression') {
        return (
          node.object.type === 'Identifier' && node.object.name === 'React'
        );
      }

      // Check TSQualifiedName: React.FC, React.ComponentType, etc. (TypeScript)
      if (node.type === 'TSQualifiedName') {
        return node.left.type === 'Identifier' && node.left.name === 'React';
      }

      return false;
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      // Catch React.* member expressions (e.g., React.Component, React.useState)
      MemberExpression(node) {
        if (isReactDefaultImport(node)) {
          context.report({
            node,
            messageId: 'useNamedExport',
          });
        }
      },

      // Catch React.* in JSX (e.g., <React.Fragment>)
      JSXMemberExpression(node) {
        if (
          node.object.type === 'JSXIdentifier' &&
          node.object.name === 'React'
        ) {
          context.report({
            node,
            messageId: 'useNamedExport',
          });
        }
      },

      // Catch React.* TypeScript qualified names (e.g., React.FC, React.ComponentType)
      TSQualifiedName(node) {
        if (isReactDefaultImport(node)) {
          context.report({
            node,
            messageId: 'useNamedExport',
          });
        }
      },
    };
  },
};
