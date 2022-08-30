module.exports = {
  moduleFileExtensions: ['testing.js', 'web.js', 'mjs', 'js', 'ts', 'json'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/lib/',
    '/src/components/mobile/'
  ],
  moduleNameMapper: {
    '^react-native$': 'react-native-web',
    '^.+\\.(css|sass|scss)$': 'identity-obj-proxy',
    '^.+\\.(png)$': '<rootDir>/__mocks__/fileMock.js'
  }
};
