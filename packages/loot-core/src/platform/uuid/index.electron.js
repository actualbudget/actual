const uuid = require('uuid');

export default {
  v4: function() {
    return Promise.resolve(uuid.v4());
  },

  v4Sync: function() {
    return uuid.v4();
  }
};
