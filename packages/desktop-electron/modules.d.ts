declare module 'module' {
  const globalPaths: string[];
}

// bundles not available until we build them
declare module 'loot-core/lib-dist/bundle.desktop.js' {
  const initApp: (isDev: boolean) => void;
  const lib: { getDataDir: () => string };
}
