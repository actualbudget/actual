// Ambient declarations for the browser worker build's Vite virtual imports.

// Runtime assets emitted by the `actual-embedded-assets` plugin
// (vite.config.mts), sourced from loot-core's `default-filesystem` helper, so
// they can never drift from what the migrations directory / Node build ship.
declare module 'virtual:actual-embedded-assets' {
  /** base64 of sql.js' sql-wasm.wasm */
  export const wasmBase64: string;
  /** contents of data-file-index.txt */
  export const dataIndex: string;
  /** base64 of each default filesystem file, keyed by its data/ wire name */
  export const dataFiles: Record<string, string>;
}
