// Polyfills for browser/web worker environment
import * as jspb from 'google-protobuf';

// AbsurderSQL's WASM module references `document` during initialization
// (for DOM-related features like export download links). In a Web Worker
// context `document` doesn't exist, so we provide a minimal no-op shim.
if (typeof document === 'undefined' && typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).document = {
    createElement: () => ({
      setAttribute: () => {},
      click: () => {},
      style: {},
      href: '',
      download: '',
    }),
    getElementById: () => null,
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
  };
}

if (typeof globalThis !== 'undefined') {
  // Add a basic require polyfill for CommonJS modules
  if (typeof globalThis.require === 'undefined') {
    // @ts-expect-error - we're creating a minimal require implementation
    globalThis.require = (moduleId: string) => {
      switch (moduleId) {
        case 'google-protobuf':
          return jspb;
        default:
          throw new Error(
            `Module not found: ${moduleId}. Add to polyfills if needed.`,
          );
      }
    };
  }
}

// Also set on global for compatibility
if (typeof global !== 'undefined') {
  if (typeof global.require === 'undefined') {
    global.require = globalThis.require;
  }
}
