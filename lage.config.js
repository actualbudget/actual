const BUILD_OUTPUT_GLOBS = ['lib-dist/**', 'dist/**', 'build/**', '@types/**'];

/** @type {import('lage').ConfigOptions} */
module.exports = {
  pipeline: {
    typecheck: {
      type: 'npmScript',
      dependsOn: ['^typecheck'],
    },
    test: {
      type: 'npmScript',
      options: {
        outputGlob: [
          'coverage/**',
          '**/test-results/**',
          '**/playwright-report/**',
        ],
      },
    },
    build: {
      type: 'npmScript',
      dependsOn: ['^build'],
      cache: true,
      options: {
        outputGlob: BUILD_OUTPUT_GLOBS,
      },
    },
    // Not cached: the script stages files into public/ and build-stats/ that
    // fall outside BUILD_OUTPUT_GLOBS, so a cache hit would skip the side
    // effects.
    'build:browser': {
      type: 'npmScript',
      dependsOn: ['^build'],
      cache: false,
    },
    // Fetches and filters bundled translations into the desktop-client
    // `locale/` directory. Deliberately standalone (no `dependsOn`, and not a
    // dependency of `build`) so dev and test builds never hit the network —
    // it's pulled in only by `package:browser` (and invoked directly by
    // bin/package-electron). Never cached: its output depends on the remote
    // translations repo, which lage can't see, so a cache hit would ship stale
    // translations.
    'sync:translations': {
      type: 'npmScript',
      cache: false,
    },
    // Single entry point for a translated browser bundle: fetch translations,
    // then build. `noop` runs no script itself — it only orders its deps. Kept
    // separate from `build:browser` so VRT/e2e can still build without
    // translations (the `build:browser:no-translations` root script).
    'package:browser': {
      type: 'noop',
      dependsOn: ['sync:translations', 'build:browser'],
    },
  },
  cacheOptions: {
    cacheStorageConfig: {
      provider: 'local',
      outputGlob: BUILD_OUTPUT_GLOBS,
    },
  },
  npmClient: 'yarn',
  concurrency: 2,
};
