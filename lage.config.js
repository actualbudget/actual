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
