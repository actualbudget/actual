module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  moduleFileExtensions: ['testing.js', 'web.js', 'mjs', 'js', 'ts', 'json'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/lib/'].filter(Boolean),
  testMatch: ['**/*.web.test.js'],
  transformIgnorePatterns: [
    '__mocks__',
    '/node_modules/(?!perf-deets|absurd-sql)'
  ],
  globals: {
    __TESTING__: true
  }
};
