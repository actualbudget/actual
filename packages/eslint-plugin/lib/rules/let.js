'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detects usage of `const` instead of `let`',
    },
    fixable: 'code',
    schema: [],
    messages: {
      error: 'Please use `let` instead of `{{kind}}`',
    },
  },

  create(context) {
    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      VariableDeclaration(node) {
        if (node.kind === 'let') return;
        context.report({
          node,
          messageId: 'error',
          data: { kind: node.kind },
          fix(fixer) {
            return fixer.replaceText(
              context.getSourceCode().getFirstToken(node),
              'let',
            );
          },
        });
      },
    };
  },
};
