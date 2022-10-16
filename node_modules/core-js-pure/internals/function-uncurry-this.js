var classofRaw = require('../internals/classof-raw');
var uncurryThisRaw = require('../internals/function-uncurry-this-raw');

module.exports = function (fn) {
  // Nashorn bug:
  //   https://github.com/zloirock/core-js/issues/1128
  //   https://github.com/zloirock/core-js/issues/1130
  if (classofRaw(fn) === 'Function') return uncurryThisRaw(fn);
};
