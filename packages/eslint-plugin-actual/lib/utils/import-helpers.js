/**
 * Shared utilities for managing imports in ESLint rules
 */

/**
 * Check if a specific import exists from a module
 * @param {import('eslint').SourceCode} sourceCode
 * @param {string} importName - The name to import (e.g., 't', 'Trans')
 * @param {string} moduleName - The module to import from (e.g., 'react-i18next')
 * @returns {boolean}
 */
function hasImport(sourceCode, importName, moduleName) {
  const ast = sourceCode.ast;
  return ast.body.some(node => {
    if (node.type !== 'ImportDeclaration') return false;
    if (node.source.value !== moduleName) return false;

    return node.specifiers.some(spec => {
      if (spec.type === 'ImportSpecifier') {
        return spec.imported.name === importName;
      }
      return false;
    });
  });
}

/**
 * Get a fixer function to add an import
 * @param {import('eslint').SourceCode} sourceCode
 * @param {string} importName - The name to import (e.g., 't', 'Trans')
 * @param {string} moduleName - The module to import from (e.g., 'react-i18next')
 * @returns {(fixer: import('eslint').Rule.RuleFixer) => import('eslint').Rule.Fix}
 */
function getImportFix(sourceCode, importName, moduleName) {
  const ast = sourceCode.ast;

  // Find existing import from the same module
  const existingImport = ast.body.find(
    node =>
      node.type === 'ImportDeclaration' && node.source.value === moduleName,
  );

  if (existingImport) {
    const hasImportAlready = existingImport.specifiers.some(
      spec =>
        spec.type === 'ImportSpecifier' && spec.imported.name === importName,
    );

    if (hasImportAlready) {
      return null;
    }

    if (existingImport.specifiers.length === 0) {
      const importStatement = `import { ${importName} } from '${moduleName}';\n`;
      return fixer =>
        fixer.insertTextAfter(existingImport, `\n${importStatement}`);
    }

    // Add to existing import
    const lastSpecifier =
      existingImport.specifiers[existingImport.specifiers.length - 1];
    return fixer => fixer.insertTextAfter(lastSpecifier, `, ${importName}`);
  } else {
    // Add new import statement
    // Find the first import to insert after, or the first node if no imports exist
    const firstImport = ast.body.find(n => n.type === 'ImportDeclaration');
    const targetNode = firstImport || ast.body[0];

    const importStatement = `import { ${importName} } from '${moduleName}';\n`;

    if (firstImport) {
      return fixer => fixer.insertTextAfter(targetNode, `\n${importStatement}`);
    } else {
      return fixer =>
        fixer.insertTextBefore(targetNode, `${importStatement}\n`);
    }
  }
}

/**
 * Add an import to the fixes array if it doesn't exist
 * @param {Array} fixes - Array of fixes to add to
 * @param {import('eslint').SourceCode} sourceCode
 * @param {import('eslint').Rule.RuleFixer} fixer
 * @param {string} importName - The name to import
 * @param {string} moduleName - The module to import from (e.g., 'react-i18next')
 */
function ensureImport(fixes, sourceCode, fixer, importName, moduleName) {
  if (!hasImport(sourceCode, importName, moduleName)) {
    const importFix = getImportFix(sourceCode, importName, moduleName)(fixer);
    if (importFix) fixes.push(importFix);
  }
}

module.exports = {
  hasImport,
  getImportFix,
  ensureImport,
};
