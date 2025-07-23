// Polyfills for browser/web worker environment
// These match what webpack's ProvidePlugin was providing

import { Buffer } from 'buffer';
// Import process for browser environment using the alias
// @ts-ignore - process doesn't have proper TypeScript exports
import process from 'process';

// Make Buffer and process available globally
if (typeof globalThis !== 'undefined') {
  globalThis.Buffer = Buffer;
  globalThis.process = process;
  
  // Add a basic require polyfill for CommonJS modules
  if (typeof globalThis.require === 'undefined') {
    // @ts-ignore - we're creating a minimal require implementation
    globalThis.require = (moduleId: string) => {
      switch (moduleId) {
        case 'buffer':
          return { Buffer };
        case 'process':
        case 'process/browser':
          return process;
        default:
          throw new Error(`Module not found: ${moduleId}. Add to polyfills if needed.`);
      }
    };
  }
}

// Also set on global for compatibility
if (typeof global !== 'undefined') {
  global.Buffer = Buffer;
  global.process = process;
  
  if (typeof global.require === 'undefined') {
    // @ts-ignore - assigning minimal require implementation to global
    global.require = globalThis.require;
  }
}
