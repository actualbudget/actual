let path = require('path');
let blacklist = require('metro-config/src/defaults/blacklist');

module.exports = {
  resolver: {
    sourceExts: [
      'mobile.js',
      'js',
      'ts',
      'tsx',
      'json'
    ],
    // These are special modules that need to be included outside of
    // the `mobile` package. We don't hoist react native deps so all
    // the normal tooling works for compiling/linking, but a few deps
    // need to be included by other packages. They can't see these by
    // default because it only searches parent node_modules, not
    // siblings.
    extraNodeModules: {
      'react-native-svg': path.resolve(
        __dirname,
        'node_modules/react-native-svg'
      ),
      'react-native-gesture-handler': path.resolve(
        __dirname,
        'node_modules/react-native-gesture-handler'
      ),
      'react-native-reanimated': path.resolve(
        __dirname,
        'node_modules/react-native-reanimated'
      ),
      'react-native-sentry': path.resolve(
        __dirname,
        'node_modules/react-native-sentry'
      ),
      'react-native-status-bar-height': path.resolve(
        __dirname,
        'node_modules/react-native-status-bar-height'
      ),
      'react-native': path.resolve(__dirname, 'node_modules/react-native')
    },
    blacklistRE: blacklist([/nodejs-assets\/.*/, /android\/.*/, /ios\/.*/])
  },
  watchFolders: ['/Users/james/projects/actual']
};
