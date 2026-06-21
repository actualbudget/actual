// Virtual modules provided by the browser build's Vite plugins.

// Runtime assets embedded into the worker (vite.browser-worker.config.mts).
declare module 'virtual:actual-embedded-assets' {
  /** base64 of sql.js' sql-wasm.wasm */
  export const wasmBase64: string;
  /** contents of data-file-index.txt */
  export const dataIndex: string;
  /** base64 of each default filesystem file, keyed by its data/ wire name */
  export const dataFiles: Record<string, string>;
}

// The built worker.js, inlined into browser.js (vite.browser.config.mts).
declare module 'virtual:actual-worker-code' {
  const workerCode: string;
  export default workerCode;
}
