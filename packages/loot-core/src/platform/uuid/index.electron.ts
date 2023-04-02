const _uuid = require('uuid');

module.exports = {
  v4: function () {
    return Promise.resolve(_uuid.v4());
  },

  v4Sync: function () {
    return _uuid.v4();
  },
};
