const visit = require('unist-util-visit-parents');
const path = require('node:path')

const plugin = () => {
  const transformer = async (ast, file) => {
    visit(ast, 'image', (node, ancestors) => {
      if (node.url.startsWith('http')) {
        return;
      }
      // convert to `<img src={require(src)} />`
      node.type = 'jsx';
      node.value = `<img img={require(${JSON.stringify(node.url)})} />`;
      const parent = ancestors[ancestors.length - 1];
      if (parent.type === 'paragraph') {
        if (parent.children.length === 1 || parent.children.every(c => c == node || (c.type === 'text' && c.value.trim() === ''))) {
          parent.type = 'jsx';
          parent.value = node.value;
          parent.children = [];
        } else {
          const fileName = path.relative(file.cwd, file.path);
          const pos = node.position.start.line + ':' + node.position.start.column;
          console.error(JSON.stringify(parent, (key, value) => key === 'position' ? undefined : value, 2));
          file.fail(`rewrite-images: ${fileName}:${pos} Cannot convert image to JSX: images must be in their own paragraph`);
        }
      } else {
        console.error(JSON.stringify(parent, (key, value) => key === 'position' ? undefined : value, 2));
        file.fail(`rewrite-images: Cannot convert image to JSX: Expected parent to be a paragraph, got ${parent.type}`);
      }
    });
  };
  return transformer;
};

module.exports = plugin;
