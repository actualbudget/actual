const {
  collectValueLeaves,
  getLeafText,
  getPropertyName,
  getPropertyValue,
  isColorProperty,
} = require('../utils/style-values');

const hexColor = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![0-9a-z])/i;
const colorFunction = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i;
const namedColors = new Set([
  'aqua',
  'black',
  'blue',
  'brown',
  'crimson',
  'cyan',
  'fuchsia',
  'gold',
  'gray',
  'green',
  'grey',
  'indigo',
  'lime',
  'magenta',
  'maroon',
  'navy',
  'olive',
  'orange',
  'pink',
  'purple',
  'red',
  'silver',
  'teal',
  'violet',
  'white',
  'yellow',
]);

function hasColorLiteral(value) {
  const text = value.replace(/url\([^)]*\)/gi, '');
  if (hexColor.test(text) || colorFunction.test(text)) {
    return true;
  }
  return text
    .toLowerCase()
    .split(/[^a-z-]+/)
    .some(word => namedColors.has(word));
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow hard-coded colors in style properties in favor of theme tokens',
    },
    fixable: null,
    schema: [],
    messages: {
      useThemeToken:
        'Hard-coded color "{{value}}" does not follow the theme. Use a token from `theme` instead.',
    },
  },

  createOnce(context) {
    function check(node) {
      const name = getPropertyName(node);
      if (name == null || !isColorProperty(name)) {
        return;
      }
      for (const leaf of collectValueLeaves(getPropertyValue(node))) {
        const text = getLeafText(leaf);
        if (text != null && hasColorLiteral(text)) {
          context.report({
            node: leaf,
            messageId: 'useThemeToken',
            data: { value: text.trim() },
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
