#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const buildDir = resolve(__dirname, '../build');

async function getAllJsFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllJsFiles(fullPath)));
    } else if (entry.isFile() && extname(entry.name) === '.js') {
      files.push(fullPath);
    }
  }

  return files;
}

function resolveImportPath(importPath, fromFile) {
  const baseDir = dirname(fromFile);
  const resolvedPath = resolve(baseDir, importPath);

  // Check if it's a file with .js extension
  if (existsSync(`${resolvedPath}.js`)) {
    return `${importPath}.js`;
  }

  // Check if it's a directory with index.js
  if (existsSync(resolvedPath) && existsSync(join(resolvedPath, 'index.js'))) {
    return `${importPath}/index.js`;
  }

  // Verify the file exists before adding extension
  if (!existsSync(`${resolvedPath}.js`)) {
    console.warn(
      `Warning: Could not resolve import '${importPath}' from ${relative(buildDir, fromFile)}`,
    );
  }

  // Default: assume it's a file and add .js
  return `${importPath}.js`;
}

function addExtensionsToImports(content, filePath) {
  // Match relative imports: import ... from './path' or import ... from '../path'
  // Also handle: import('./path') and require('./path')
  const importRegex =
    /(?:import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?|import\s*\(|require\s*\()['"](\.\.?\/[^'"]+)['"]/g;

  return content.replace(importRegex, (match, importPath) => {
    // importPath is the second capture group (the path)
    if (!importPath || typeof importPath !== 'string') {
      return match;
    }

    // Skip if already has an extension
    if (/\.(js|mjs|ts|mts|json)$/.test(importPath)) {
      return match;
    }

    // Skip if ends with / (directory import that already has trailing slash)
    if (importPath.endsWith('/')) {
      return match;
    }

    const newImportPath = resolveImportPath(importPath, filePath);
    return match.replace(importPath, newImportPath);
  });
}

async function processFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const newContent = addExtensionsToImports(content, filePath);

  if (content !== newContent) {
    await writeFile(filePath, newContent, 'utf-8');
    const relativePath = relative(buildDir, filePath);
    console.log(`Updated imports in ${relativePath}`);
  }
}

async function main() {
  try {
    const files = await getAllJsFiles(buildDir);
    await Promise.all(files.map(processFile));
    console.log(`Processed ${files.length} files`);
  } catch (error) {
    console.error('Error processing files:', error);
    process.exit(1);
  }
}

main();
