var call = require('../internals/function-call');

module.exports = function (it) {
  // eslint-disable-next-line es/no-map -- safe
  return call(Map.prototype.entries, it);
};
