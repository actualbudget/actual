/** @type {import('lage').ConfigOptions} */
module.exports = {
  pipeline: {
    test: {
      type: 'npmScript',
      options: {
        outputGlob: ['lib-dist/**', 'dist/**', 'build/**'],
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
};
