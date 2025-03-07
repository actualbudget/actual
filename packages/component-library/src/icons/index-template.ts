// @ts-strict-ignore
import path from 'path';

function indexTemplate(filePaths) {
  const exportEntries = filePaths.map(({ path: filePath }) => {
    const basename = path.basename(filePath, path.extname(filePath));
    const exportName = `Svg${basename}`;
    return `export { ${exportName} } from './${basename}'`;
  });
  return exportEntries.join('\n');
}

module.exports = indexTemplate;
