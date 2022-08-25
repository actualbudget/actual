const isReactNative = process.env.REACT_APP_IS_REACT_NATIVE;

module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  moduleFileExtensions: ['testing.js', 'electron.js']
    .concat(isReactNative ? ['ios.js', 'mobile.js'] : [])
    .concat(['mjs', 'js', 'ts', 'json']),
  setupFilesAfterEnv: ['<rootDir>/src/mocks/setup.js'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/lib/', '.+/index.web.test.js'],
  transformIgnorePatterns: ['/node_modules/', '__mocks__'],
  globals: {
    __TESTING__: true
  }
};
