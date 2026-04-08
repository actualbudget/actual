import type BabelTemplate from '@babel/template';
import type { NodePath } from '@babel/traverse';
import type * as BabelTypes from '@babel/types';
import type { Attribute, Options } from '@svgr/babel-plugin-add-jsx-attribute';

type PluginAPI = {
  types: typeof BabelTypes;
  template: typeof BabelTemplate;
};

const positionMethod = {
  start: 'unshiftContainer',
  end: 'pushContainer',
} as const;

const addJSXAttribute = ({ types: t, template }: PluginAPI, opts: Options) => {
  function getAttributeValue({
    literal,
    value,
  }: Pick<Attribute, 'literal' | 'value'>):
    | BabelTypes.JSXExpressionContainer
    | BabelTypes.StringLiteral
    | null {
    if (typeof value === 'boolean') {
      return t.jsxExpressionContainer(t.booleanLiteral(value));
    }

    if (typeof value === 'number') {
      return t.jsxExpressionContainer(t.numericLiteral(value));
    }

    if (typeof value === 'string' && literal) {
      return t.jsxExpressionContainer(template.expression.ast(value));
    }

    if (typeof value === 'string') {
      return t.stringLiteral(value);
    }

    return null;
  }

  function getAttribute({ spread, name, value, literal }: Attribute) {
    if (spread) {
      return t.jsxSpreadAttribute(t.identifier(name));
    }

    return t.jsxAttribute(
      t.jsxIdentifier(name),
      getAttributeValue({ value, literal }),
    );
  }

  return {
    visitor: {
      JSXOpeningElement(path: NodePath<BabelTypes.JSXOpeningElement>) {
        if (!t.isJSXIdentifier(path.node.name)) return;
        if (!opts.elements.includes(path.node.name.name)) return;

        opts.attributes.forEach(
          ({
            name,
            value = null,
            spread = false,
            literal = false,
            position = 'end',
          }) => {
            const method = positionMethod[position];
            const newAttribute = getAttribute({ spread, name, value, literal });
            const attributes = path.get('attributes');

            const isEqualAttribute = (
              attribute: NodePath<
                BabelTypes.JSXAttribute | BabelTypes.JSXSpreadAttribute
              >,
            ) => {
              if (spread) {
                return attribute.get('argument').isIdentifier({ name });
              }

              return attribute.get('name').isJSXIdentifier({ name });
            };

            const replaced = attributes.some(attribute => {
              if (!isEqualAttribute(attribute)) {
                return false;
              }

              // Only add the color if it doesn't explicitly say no
              // color
              const attrValue = attribute.get('value');
              if (
                !attrValue.isStringLiteral() ||
                attrValue.node.value !== 'none'
              ) {
                attribute.replaceWith(newAttribute);
              }

              return true;
            });

            if (!replaced) {
              path[method]('attributes', newAttribute);
            }
          },
        );
      },
    },
  };
};

export default addJSXAttribute;
