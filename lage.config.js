/** @type {import('lage').ConfigOptions} */
module.exports = {
  pipeline: {
    test: {
      type: 'npmScript',
      options: {
        outputGlob: ['lib-dist/**', 'dist/**', 'build/**'],
      },
    },
    e2e: {
      type: 'npmScript',
      cache: false,
      options: {
        outputGlob: ['playwright-report/**', 'test-results/**'],
      },
    },
    vrt: {
      type: 'npmScript',
      cache: false,
      options: {
        outputGlob: ['playwright-report/**', 'test-results/**'],
      },
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
  reporters: [
    {
      name: 'progress',
    },
  ],
};
