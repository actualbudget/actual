declare module 'module' {
  const globalPaths: string[];
}

// bundles not available until we build them
declare module 'loot-core/lib-dist/bundle.desktop.js';
declare module './app/bundle.api.js';
