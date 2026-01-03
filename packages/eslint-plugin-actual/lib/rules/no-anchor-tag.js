//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Forbid usage of <a> tags in favor of <Link> component',
    },
    fixable: null,
    schema: [],
    messages: {
      useLink: 'Using <a> is discouraged, please use <Link> instead.',
    },
  },

  create(context) {
    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    /**
     * Checks if the current file is the Link component itself
     * @returns {boolean}
     */
    function isLinkComponentFile() {
      const filename = context.getFilename();
      const normalizedFilename = filename.replace(/\\/g, '/');
      return normalizedFilename.includes(
        'packages/desktop-client/src/components/common/Link.tsx',
      );
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      JSXOpeningElement(node) {
        // Skip if this is the Link component file itself
        if (isLinkComponentFile()) {
          return;
        }

        // Check if the element name is "a"
        if (node.name.type === 'JSXIdentifier' && node.name.name === 'a') {
          context.report({
            node,
            messageId: 'useLink',
          });
        }
      },
    };
  },
};
