const CONCURRENCY = 2;
const BUILD_OUTPUT_GLOBS = [
  'lib-dist/**',
  'dist/**',
  'build/**',
  '@types/**',
  'app/stats.json',
];

/** @type {import('lage').ConfigOptions} */
module.exports = {
  pipeline: {
    typecheck: {
      type: 'npmScript',
      dependsOn: ['^typecheck'],
    },
    test: {
      type: 'npmScript',
      outputs: ['coverage/**', '**/test-results/**', '**/playwright-report/**'],
    },
    build: {
      type: 'npmScript',
      dependsOn: ['^build'],
      cache: true,
      outputs: BUILD_OUTPUT_GLOBS,
    },
    // Not cached: the script stages files into public/ and build-stats/ that
    // fall outside BUILD_OUTPUT_GLOBS, so a cache hit would skip the side
    // effects.
    'build:browser': {
      type: 'npmScript',
      dependsOn: ['^build'],
      cache: false,
    },
    'build:mobile': {
      type: 'npmScript',
      dependsOn: ['^build'],
      cache: false,
      weight: CONCURRENCY,
    },
    'mobile-client#build': {
      type: 'npmScript',
      dependsOn: ['^build', '@actual-app/web#build:mobile'],
      cache: true,
      outputs: BUILD_OUTPUT_GLOBS,
    },
  },
  cacheOptions: {
    cacheStorageConfig: {
      provider: 'local',
    },
    outputGlob: BUILD_OUTPUT_GLOBS,
  },
  npmClient: 'yarn',
  concurrency: CONCURRENCY,
};
