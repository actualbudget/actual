require.extensions['.electron.js'] = function (module, filename) {
  return require.extensions['.js'](module, filename);
};
