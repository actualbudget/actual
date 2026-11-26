const colorProperties = new Set([
  'accentColor',
  'background',
  'backgroundColor',
  'backgroundImage',
  'border',
  'borderBlock',
  'borderBlockColor',
  'borderBlockEnd',
  'borderBlockEndColor',
  'borderBlockStart',
  'borderBlockStartColor',
  'borderBottom',
  'borderBottomColor',
  'borderColor',
  'borderInline',
  'borderInlineColor',
  'borderInlineEnd',
  'borderInlineEndColor',
  'borderInlineStart',
  'borderInlineStartColor',
  'borderLeft',
  'borderLeftColor',
  'borderRight',
  'borderRightColor',
  'borderTop',
  'borderTopColor',
  'boxShadow',
  'caretColor',
  'color',
  'columnRuleColor',
  'fill',
  'floodColor',
  'lightingColor',
  'outline',
  'outlineColor',
  'scrollbarColor',
  'stopColor',
  'stroke',
  'textDecorationColor',
  'textEmphasisColor',
  'textShadow',
]);

function isColorProperty(name) {
  return colorProperties.has(name) || /Shadow$/.test(name);
}

function toCamelCase(name) {
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function getPropertyName(node) {
  if (node.type === 'JSXAttribute') {
    return node.name.type === 'JSXIdentifier'
      ? toCamelCase(node.name.name)
      : null;
  }
  if (node.type !== 'Property' || node.computed) {
    return null;
  }
  if (node.key.type === 'Identifier') {
    return node.key.name;
  }
  if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
    return toCamelCase(node.key.value);
  }
  return null;
}

function getPropertyValue(node) {
  if (node.type !== 'JSXAttribute') {
    return node.value;
  }
  if (node.value == null) {
    return null;
  }
  return node.value.type === 'JSXExpressionContainer'
    ? node.value.expression
    : node.value;
}

function getStaticString(node) {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const left = getStaticString(node.left);
    const right = getStaticString(node.right);
    return left != null && right != null ? left + right : null;
  }
  return null;
}

function collectValueLeaves(node, leaves = []) {
  if (node == null) {
    return leaves;
  }
  switch (node.type) {
    case 'ConditionalExpression':
      collectValueLeaves(node.consequent, leaves);
      collectValueLeaves(node.alternate, leaves);
      break;
    case 'LogicalExpression':
      collectValueLeaves(node.left, leaves);
      collectValueLeaves(node.right, leaves);
      break;
    case 'BinaryExpression':
      if (node.operator === '+' && getStaticString(node) == null) {
        collectValueLeaves(node.left, leaves);
        collectValueLeaves(node.right, leaves);
      } else {
        leaves.push(node);
      }
      break;
    case 'TemplateLiteral':
      node.quasis.forEach(quasi => leaves.push(quasi));
      node.expressions.forEach(expression =>
        collectValueLeaves(expression, leaves),
      );
      break;
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
    case 'ParenthesizedExpression':
      collectValueLeaves(node.expression, leaves);
      break;
    default:
      leaves.push(node);
  }
  return leaves;
}

function getLeafText(node) {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type === 'TemplateElement') {
    return node.value.cooked ?? node.value.raw;
  }
  if (node.type === 'BinaryExpression') {
    return getStaticString(node);
  }
  return null;
}

function getThemeTokenName(node) {
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.object.type === 'Identifier' &&
    node.object.name === 'theme' &&
    node.property.type === 'Identifier'
  ) {
    return node.property.name;
  }
  return null;
}

module.exports = {
  collectValueLeaves,
  getLeafText,
  getPropertyName,
  getPropertyValue,
  getThemeTokenName,
  isColorProperty,
};
