const isReactNative = process.env.REACT_APP_IS_REACT_NATIVE;

module.exports = {
  moduleFileExtensions: ['testing.js', 'electron.js']
    .concat(isReactNative ? ['ios.js', 'mobile.js'] : [])
    .concat(['mjs', 'js', 'json']),
  setupFilesAfterEnv: ['<rootDir>/src/mocks/setup.js'],
  // This may be the wrong environment but it fixes tests for now.
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/lib/', 'index.web.test.js'],
  transformIgnorePatterns: ['__mocks__'],
  transform: {
    '^.+\\.(js|ts|tsx)?$': '@swc/jest'
  },
  globals: {
    __TESTING__: true
  }
};
