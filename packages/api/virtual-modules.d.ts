// Ambient declarations for the browser build's Vite imports.

// Vite's inlined-worker import (`?worker&inline`): a Blob-URL Worker ctor.
declare module '*?worker&inline' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

// Runtime assets emitted by the `actual-embedded-assets` plugin
// (vite.browser.config.mts), sourced from loot-core's `default-filesystem`.
declare module 'virtual:actual-embedded-assets' {
  /** base64 of sql.js' sql-wasm.wasm */
  export const wasmBase64: string;
  /** contents of data-file-index.txt */
  export const dataIndex: string;
  /** base64 of each default filesystem file, keyed by its data/ wire name */
  export const dataFiles: Record<string, string>;
}
