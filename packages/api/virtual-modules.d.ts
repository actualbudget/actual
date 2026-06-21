// Ambient declarations for the Vite asset imports used by the browser build.

// Vite's inlined-worker import (`?worker&inline`): a Blob-URL Worker ctor.
declare module '*?worker&inline' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

// `?inline` yields a base64 data URL; `?raw` yields the file's text.
declare module '*?inline' {
  const dataUrl: string;
  export default dataUrl;
}

declare module '*?raw' {
  const source: string;
  export default source;
}

// `import.meta.glob`, used to embed the loot-core migrations directory. Only the
// eager form we rely on is typed here.
type ImportMeta = {
  glob<T = unknown>(
    pattern: string,
    options: { query: string; import: 'default'; eager: true },
  ): Record<string, T>;
};
