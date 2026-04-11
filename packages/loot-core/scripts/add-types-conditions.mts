/**
 * Pre-pack script: adds "types" conditions to imports/exports in package.json
 * so that npm consumers resolve .d.ts declarations instead of raw .ts source.
 *
 * This runs via the "prepack" lifecycle hook. The original package.json is
 * backed up and restored by restore-package-json.ts (postpack).
 */
import {
  constants,
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '..', 'package.json');
const backupPath = resolve(__dirname, '..', 'package.json.bak');

type ExportValue = string | Record<string, ExportValue>;
type ExportMap = Record<string, ExportValue>;

function toTypesPath(srcPath: string): string | null {
  if (srcPath.startsWith('./src/')) {
    return srcPath
      .replace(/^\.\/src\//, './lib-dist/decl/src/')
      .replace(/\.tsx?$/, '.d.ts');
  }
  if (srcPath.startsWith('./typings/')) {
    return srcPath
      .replace(/^\.\/typings\//, './lib-dist/decl/typings/')
      .replace(/\.tsx?$/, '.d.ts');
  }
  return null;
}

function shouldSkip(value: string): boolean {
  // Already a .d.ts file or a .js runtime-only entry
  return value.endsWith('.d.ts') || value.endsWith('.js');
}

function transformEntry(value: ExportValue): ExportValue {
  if (typeof value === 'string') {
    if (shouldSkip(value)) return value;
    const typesPath = toTypesPath(value);
    if (!typesPath) return value;
    return { types: typesPath, default: value };
  }

  // Find the "default" value to derive the types path
  const defaultValue = value.default;
  if (!defaultValue || shouldSkip(defaultValue)) return value;

  const typesPath = toTypesPath(defaultValue);
  if (!typesPath) return value;

  // Insert "types" as the first key
  return { types: typesPath, ...value };
}

function transformMap(map: ExportMap): ExportMap {
  const result: ExportMap = {};
  for (const [key, value] of Object.entries(map)) {
    result[key] = transformEntry(value);
  }
  return result;
}

// Backup and transform
if (existsSync(backupPath)) {
  throw new Error(
    'prepack: package.json.bak already exists; run postpack cleanup first.',
  );
}
copyFileSync(pkgPath, backupPath, constants.COPYFILE_EXCL);

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

if (pkg.imports) {
  pkg.imports = transformMap(pkg.imports);
}
if (pkg.exports) {
  pkg.exports = transformMap(pkg.exports);
}

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('prepack: added types conditions to package.json');
