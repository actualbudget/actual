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
