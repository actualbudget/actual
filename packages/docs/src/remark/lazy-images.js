const fs = require('fs');
const path = require('path');

const { imageSize } = require('image-size');
const { visitParents } = require('unist-util-visit-parents');

const staticDirectory = path.resolve(__dirname, '../../static');
const jsxElementTypes = new Set(['mdxJsxFlowElement', 'mdxJsxTextElement']);
const lazyAttributes = { loading: 'lazy', decoding: 'async' };

function isImageTag(node) {
  return jsxElementTypes.has(node.type) && node.name === 'img';
}

function getAttribute(node, name) {
  return node.attributes.find(
    attribute =>
      attribute.type === 'mdxJsxAttribute' && attribute.name === name,
  );
}

function addAttribute(node, name, value) {
  node.attributes.push({
    type: 'mdxJsxAttribute',
    name,
    value: String(value),
  });
}

/** Pixel size of an image in the static folder, or null if it can't be read. */
function readImageSize(source) {
  try {
    const filePath = path.join(staticDirectory, decodeURIComponent(source));
    const { width, height } = imageSize(fs.readFileSync(filePath));
    return width && height ? { width, height } : null;
  } catch {
    return null;
  }
}

/**
 * Give the tag a height that matches its width, so the browser can reserve the
 * image's space before the file has loaded. A tag with no width gets the
 * image's own size, which is the size it is displayed at anyway.
 */
function reserveSpace(node) {
  if (getAttribute(node, 'height')) return;

  const source = getAttribute(node, 'src')?.value;
  if (typeof source !== 'string' || !source.startsWith('/')) return;

  const size = readImageSize(source);
  if (!size) return;

  const widthAttribute = getAttribute(node, 'width');
  if (!widthAttribute) {
    addAttribute(node, 'width', size.width);
    addAttribute(node, 'height', size.height);
    return;
  }

  const width = Number(widthAttribute.value);
  if (width > 0) {
    addAttribute(
      node,
      'height',
      Math.round((width * size.height) / size.width),
    );
  }
}

/**
 * Remark plugin that makes `<img>` tags written directly in a page load
 * lazily and reserve their space while they do. Markdown images
 * (`![alt](src)`) get the same treatment from Docusaurus and the Image
 * component, but tags written as HTML never pass through either.
 *
 * An attribute already set on the tag is left alone, so a single image can
 * opt out with `loading="eager"` or set its own `height`.
 */
function remarkLazyImages() {
  return function transformer(ast) {
    visitParents(ast, isImageTag, node => {
      for (const [name, value] of Object.entries(lazyAttributes)) {
        if (!getAttribute(node, name)) {
          addAttribute(node, name, value);
        }
      }
      reserveSpace(node);
    });
  };
}

module.exports = remarkLazyImages;
