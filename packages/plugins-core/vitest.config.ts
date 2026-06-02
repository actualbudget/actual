/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/**/*', 'node_modules/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'build/',
        'vite.config.ts',
        'vitest.config.ts',
        'tests/',
      ],
    },
    alias: {
      '@actual-app/components/view': new URL(
        '../component-library/src/View.tsx',
        import.meta.url,
      ).pathname,
      '@actual-app/components/input': new URL(
        '../component-library/src/Input.tsx',
        import.meta.url,
      ).pathname,
      '@actual-app/components/button': new URL(
        '../component-library/src/Button.tsx',
        import.meta.url,
      ).pathname,
      '@actual-app/components/styles': new URL(
        '../component-library/src/styles.ts',
        import.meta.url,
      ).pathname,
      '@actual-app/components/icons/logo': new URL(
        '../component-library/src/icons/logo/index.ts',
        import.meta.url,
      ).pathname,
      '@actual-app/components/icons/v0': new URL(
        '../component-library/src/icons/v0/index.ts',
        import.meta.url,
      ).pathname,
      '@actual-app/components': new URL(
        '../component-library/src',
        import.meta.url,
      ).pathname,
    },
  },
});
