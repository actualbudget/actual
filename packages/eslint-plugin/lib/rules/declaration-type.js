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
      error: 'Please use `{{expected}}` instead of `{{actual}}`',
      mixed:
        'Mixing constants and variables in a single declaration is not allowed',
    },
  },

  create(context) {
    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    /**
     * @param {import('estree').VariableDeclarator} node
     * @returns {'const' | 'let'} expected type
     */
    function expectedDeclaratorType(node) {
      // disabled because we use UPPER_SNAKE_CASE for module-global variables sometimes
      // const FOO = ...
      // if (node.id.type === 'Identifier' && node.id.name.match(/^[A-Z_]+$/)) {
      //   return 'const';
      // }

      // const ... = require(...)
      // const [x, setX] = useState(...)
      // const [state, dispatch] = useReducer(...)
      if (
        node.init &&
        node.init.type === 'CallExpression' &&
        node.init.callee.type === 'Identifier' &&
        ['require', 'useState', 'useReducer'].includes(node.init.callee.name)
      ) {
        return 'const';
      }

      // const { ... } = this.props
      // const { ... } = this.state
      if (
        node.init &&
        node.init.type === 'MemberExpression' &&
        node.init.object.type === 'ThisExpression' &&
        node.init.property.type === 'Identifier' &&
        ['props', 'state'].includes(node.init.property.name)
      ) {
        return 'const';
      }

      // const { ... } = props
      if (
        node.init &&
        node.init.type === 'Identifier' &&
        node.init.name === 'props'
      ) {
        return 'const';
      }

      return 'let';
    }

    /**
     * @param {import('estree').VariableDeclaration} node
     * @returns {'const' | 'let' | null} expected type
     */
    function expectedDeclarationType(node) {
      let types = new Set(node.declarations.map(expectedDeclaratorType));
      if (types.size === 1) {
        let [type] = types;
        return type;
      }
      return null;
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      VariableDeclaration(node) {
        let expected = expectedDeclarationType(node);
        if (expected === null) {
          context.report({
            node,
            messageId: 'mixed',
          });
          return;
        }
        if (node.kind === expected) return;

        let kindToken = context.getSourceCode().getFirstToken(node);
        context.report({
          node: kindToken,
          messageId: 'error',
          data: {
            expected,
            actual: node.kind,
          },
          fix(fixer) {
            return fixer.replaceText(kindToken, expected);
          },
        });
      },
    };
  },
};
