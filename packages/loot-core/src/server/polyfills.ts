// Polyfills for browser/web worker environment
import * as jspb from 'google-protobuf';

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
