const {
  collectValueLeaves,
  getPropertyName,
  getPropertyValue,
  getThemeTokenName,
} = require('../utils/style-values');

const propertyRoles = {
  color: 'text',
  background: 'background',
  backgroundColor: 'background',
};

function getTokenRole(name) {
  const isText = /^text|Text/.test(name);
  const isBackground = /^background|Background/.test(name);
  if (isText === isBackground) {
    return null;
  }
  return isText ? 'text' : 'background';
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow text theme tokens on backgrounds and background theme tokens on text',
    },
    fixable: null,
    schema: [],
    messages: {
      roleMismatch:
        '`theme.{{token}}` is a {{tokenRole}} color used on `{{property}}`. Custom themes set it expecting {{tokenRole}}, so use a {{propertyRole}} token here.',
    },
  },

  createOnce(context) {
    function check(node) {
      const property = getPropertyName(node);
      const propertyRole =
        property != null && Object.hasOwn(propertyRoles, property)
          ? propertyRoles[property]
          : null;
      if (propertyRole == null) {
        return;
      }
      for (const leaf of collectValueLeaves(getPropertyValue(node))) {
        const token = getThemeTokenName(leaf);
        const tokenRole = token == null ? null : getTokenRole(token);
        if (tokenRole != null && tokenRole !== propertyRole) {
          context.report({
            node: leaf,
            messageId: 'roleMismatch',
            data: { token, tokenRole, property, propertyRole },
          });
        }
      }
    }

    return {
      Property: check,
      JSXAttribute: check,
    };
  },
};
