/**
 * Post-pack script: restores package.json from the backup created by
 * add-types-conditions.ts (prepack).
 */
import { copyFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '..', 'package.json');
const backupPath = resolve(__dirname, '..', 'package.json.bak');

copyFileSync(backupPath, pkgPath);
unlinkSync(backupPath);
console.log('postpack: restored package.json');
