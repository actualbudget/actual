#!/usr/bin/env node
// Verifies that every JavaScript file emitted into the build directory is
// syntactically valid. A release once shipped a bundle with a corrupted 4KiB
// block that still booted the server but produced a blank page in the browser
// (issue #8197) — the corruption is only detectable by fully parsing the
// emitted files. `node --check` is not enough: V8 pre-parses lazily and can
// miss syntax errors inside nested function bodies, so we use the oxc parser
// that rolldown ships with (an eager, full parse).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseAst } from 'rolldown/parseAst';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.resolve(
  process.argv[2] ?? path.join(__dirname, '..', 'build'),
);

if (!fs.existsSync(buildDir)) {
  console.error(`verify-build: build directory not found: ${buildDir}`);
  process.exit(1);
}

const jsFiles = fs
  .readdirSync(buildDir, { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile() && /\.[cm]?js$/.test(entry.name))
  .map(entry => path.join(entry.parentPath, entry.name));

if (jsFiles.length === 0) {
  console.error(`verify-build: no JavaScript files found in ${buildDir}`);
  process.exit(1);
}

const failures = [];
for (const file of jsFiles) {
  const relPath = path.relative(buildDir, file);
  try {
    parseAst(fs.readFileSync(file, 'utf8'), { sourceType: 'module' }, relPath);
  } catch (err) {
    failures.push({
      relPath,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

if (failures.length > 0) {
  for (const { relPath, message } of failures) {
    console.error(`verify-build: ${relPath} failed to parse:\n${message}\n`);
  }
  console.error(
    `verify-build: ${failures.length} of ${jsFiles.length} JavaScript files in ${buildDir} are corrupted`,
  );
  process.exit(1);
}

console.log(
  `verify-build: ${jsFiles.length} JavaScript files in ${buildDir} parsed OK`,
);
