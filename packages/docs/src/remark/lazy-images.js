const { visitParents } = require('unist-util-visit-parents');

const jsxElementTypes = new Set(['mdxJsxFlowElement', 'mdxJsxTextElement']);
const lazyAttributes = { loading: 'lazy', decoding: 'async' };

function isImageTag(node) {
  return jsxElementTypes.has(node.type) && node.name === 'img';
}

/**
 * Remark plugin that makes `<img>` tags written directly in a page load
 * lazily. Markdown images (`![alt](src)`) get the same attributes from the
 * Image component, but tags written as HTML never pass through it.
 *
 * An attribute already set on the tag is left alone, so a single image can
 * opt out with `loading="eager"`.
 */
function remarkLazyImages() {
  return function transformer(ast) {
    visitParents(ast, isImageTag, node => {
      for (const [name, value] of Object.entries(lazyAttributes)) {
        const isAlreadySet = node.attributes.some(
          attribute =>
            attribute.type === 'mdxJsxAttribute' && attribute.name === name,
        );
        if (!isAlreadySet) {
          node.attributes.push({ type: 'mdxJsxAttribute', name, value });
        }
      }
    });
  };
}

module.exports = remarkLazyImages;
