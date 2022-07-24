module.exports = {
  moduleFileExtensions: [
    'web.js',
    'ios.js',
    'mobile.js',
    'mjs',
    'js',
    'json'
  ],
  moduleDirectories: ['<rootDir>/node_modules', 'node_modules'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  transform: {
    '^.+\\.(js|ts|tsx)?$': '@swc/jest',
  },
  testMatch: ['<rootDir>/src/components/mobile/**/*.test.js'],
  testPathIgnorePatterns: [
    '/node_modules/(?!loot-core).+\\.js$'
  ],
  moduleNameMapper: {
    '^react-native$': 'react-native-web',
    // Ignore react-art. react-native-web tries to pull it in but we
    // never use or need it, and it throws errors in jsdom
    '^react-art$': 'identity-obj-proxy',
    '^react-native-gesture-handler$': '<rootDir>/src/guide/mocks/react-native-gesture-handler.js',
    '^react-native-reanimated$': '<rootDir>/src/guide/mocks/react-native-reanimated.js'
  },
  globals: {
    IS_REACT_NATIVE: true
  }
};
