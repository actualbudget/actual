import { register } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const loaderPath = resolve(__dirname, 'loader.mjs');

register(pathToFileURL(loaderPath).href, pathToFileURL(__dirname));
