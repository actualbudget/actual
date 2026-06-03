import { pathToFileURL } from 'url';

const entryPath = process.env.ACTUAL_PLUGIN_ENTRY_PATH;

if (!entryPath) {
  throw new Error('ACTUAL_PLUGIN_ENTRY_PATH is required');
}

await import(pathToFileURL(entryPath).href);
