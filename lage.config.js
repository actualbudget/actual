/** @type {import('lage').ConfigOptions} */
module.exports = {
  pipeline: {
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
    typecheck: {
      type: 'npmScript',
      cache: true,
    },
    build: {
      type: 'npmScript',
      cache: true,
      options: {
        outputGlob: ['lib-dist/**', 'dist/**', 'build/**'],
      },
    },
  },
  cacheOptions: {
    cacheStorageConfig: {
      provider: 'local',
      outputGlob: ['lib-dist/**', 'dist/**', 'build/**'],
    },
  },
  npmClient: 'yarn',
  concurrency: 2,
};
