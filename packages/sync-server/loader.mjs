import { existsSync } from 'node:fs';
import { dirname, extname, resolve as nodeResolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const extensions = ['.ts', '.js', '.mts', '.mjs'];

export async function resolve(specifier, context, nextResolve) {
  // Only handle relative imports without extensions
  if (specifier.startsWith('.') && !extname(specifier)) {
    const parentURL = context.parentURL;
    if (parentURL) {
      const parentPath = new URL(parentURL).pathname;
      const parentDir = dirname(parentPath);

      // Try extensions in order
      for (const ext of extensions) {
        const resolvedPath = nodeResolve(parentDir, `${specifier}${ext}`);
        if (existsSync(resolvedPath)) {
          return nextResolve(pathToFileURL(resolvedPath).href, context);
        }
      }
    }
  }

  return nextResolve(specifier, context);
}
