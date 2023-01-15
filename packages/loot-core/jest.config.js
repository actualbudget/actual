module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  moduleFileExtensions: ['testing.js', 'electron.js'].concat([
    'mjs',
    'js',
    'ts',
    'json'
  ]),
  setupFilesAfterEnv: ['<rootDir>/src/mocks/setup.js'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/lib/', '.+/index.web.test.js'],
  transformIgnorePatterns: ['/node_modules/', '__mocks__'],
  globals: {
    __TESTING__: true
  }
};
