/**
 * Post-pack script: restores package.json from the backup created by
 * add-types-conditions.mjs (prepack).
 */
import { copyFileSync, unlinkSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '..', 'package.json');
const backupPath = resolve(__dirname, '..', 'package.json.bak');

copyFileSync(backupPath, pkgPath);
unlinkSync(backupPath);
console.log('postpack: restored package.json');
