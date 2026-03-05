/**
 * Post-build script: copies loot-core declaration tree into @types/loot-core
 * and rewrites index.d.ts to reference it so the published package is self-contained.
 * Run after vite build; requires loot-core declarations (yarn workspace loot-core exec tsc).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
const typesDir = path.join(apiRoot, '@types');
const indexDts = path.join(typesDir, 'index.d.ts');
const lootCoreDeclRoot = path.resolve(apiRoot, '../loot-core/lib-dist/decl');
const lootCoreDeclSrc = path.join(lootCoreDeclRoot, 'src');
const lootCoreDeclTypings = path.join(lootCoreDeclRoot, 'typings');
const lootCoreTypesDir = path.join(typesDir, 'loot-core');

function main() {
  if (!fs.existsSync(indexDts)) {
    console.error('Missing @types/index.d.ts; run vite build first.');
    process.exit(1);
  }
  if (!fs.existsSync(lootCoreDeclSrc)) {
    console.error(
      'Missing loot-core declarations; run: yarn workspace loot-core exec tsc',
    );
    process.exit(1);
  }

  // Remove existing loot-core output (dir or legacy single file)
  if (fs.existsSync(lootCoreTypesDir)) {
    fs.rmSync(lootCoreTypesDir, { recursive: true });
  }
  const legacyDts = path.join(typesDir, 'loot-core.d.ts');
  if (fs.existsSync(legacyDts)) {
    fs.rmSync(legacyDts);
  }

  // Copy declaration tree: src (main exports) plus emitted typings so no declarations are dropped
  fs.cpSync(lootCoreDeclSrc, lootCoreTypesDir, { recursive: true });
  if (fs.existsSync(lootCoreDeclTypings)) {
    fs.cpSync(lootCoreDeclTypings, path.join(lootCoreTypesDir, 'typings'), {
      recursive: true,
    });
  }

  // Rewrite index.d.ts: remove reference, point imports at local ./loot-core/
  let indexContent = fs.readFileSync(indexDts, 'utf8');
  indexContent = indexContent.replace(
    /\/\/\/ <reference path="\.\/loot-core\.d\.ts" \/>\n?/,
    '',
  );
  indexContent = indexContent
    .replace(/'loot-core\//g, "'./loot-core/")
    .replace(/"loot-core\//g, '"./loot-core/');
  fs.writeFileSync(indexDts, indexContent, 'utf8');
}

main();
