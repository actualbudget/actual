#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const buildDir = resolve(__dirname, '../build');
const packageRoot = resolve(__dirname, '..');

// Load the imports map from package.json
const packageJson = JSON.parse(
  readFileSync(join(packageRoot, 'package.json'), 'utf-8'),
);
const importsMap = packageJson.imports || {};

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

function resolveSubpathImport(importPath, fromFile) {
  // Try exact match first
  if (importsMap[importPath]) {
    const target = importsMap[importPath];
    // Target is like "./src/account-db.js" - convert to build path
    const buildTarget = target.replace(/^\.\/src\//, './build/src/');
    const absoluteTarget = resolve(packageRoot, buildTarget);
    // If the target ends with .ts, the built version will be .js
    const jsTarget = absoluteTarget.replace(/\.ts$/, '.js');
    let rel = relative(dirname(fromFile), jsTarget);
    if (!rel.startsWith('.')) rel = './' + rel;
    // Normalize to posix separators
    return rel.split('\\').join('/');
  }

  // Try wildcard patterns (e.g., "#accounts/*" -> "./src/accounts/*.js")
  for (const [pattern, target] of Object.entries(importsMap)) {
    if (!pattern.includes('*')) continue;
    const prefix = pattern.replace('*', '');
    if (importPath.startsWith(prefix)) {
      const wildcard = importPath.slice(prefix.length);
      const resolvedTarget = target.replace('*', wildcard);
      const buildTarget = resolvedTarget.replace(/^\.\/src\//, './build/src/');
      const absoluteTarget = resolve(packageRoot, buildTarget);
      const jsTarget = absoluteTarget.replace(/\.ts$/, '.js');
      // Check if the file exists; if not, try adding .js
      let finalTarget = jsTarget;
      if (
        !existsSync(finalTarget) &&
        existsSync(finalTarget.replace(/\.js$/, '') + '.js')
      ) {
        finalTarget = finalTarget.replace(/\.js$/, '') + '.js';
      }
      let rel = relative(dirname(fromFile), finalTarget);
      if (!rel.startsWith('.')) rel = './' + rel;
      return rel.split('\\').join('/');
    }
  }

  console.warn(
    `Warning: Could not resolve subpath import '${importPath}' from ${relative(buildDir, fromFile)}`,
  );
  return null;
}

function addExtensionsToImports(content, filePath) {
  // Match relative imports AND subpath (#) imports
  // Handles: import ... from './path', import ... from '#path'
  // Also handle: import('./path') and require('./path')
  const importRegex =
    /(?:import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?|import\s*\(|require\s*\()['"]((\.\.?\/[^'"]+)|(#[^'"]+))['"]/g;

  return content.replace(importRegex, (match, importPath) => {
    // importPath is the capture group (the path)
    if (!importPath || typeof importPath !== 'string') {
      return match;
    }

    // Handle subpath imports (#-prefixed)
    if (importPath.startsWith('#')) {
      const resolved = resolveSubpathImport(importPath, filePath);
      if (resolved) {
        return match.replace(importPath, resolved);
      }
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

void main();
