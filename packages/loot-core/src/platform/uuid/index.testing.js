module.exports = {
  v4: function () {
    return Promise.resolve(global.randomId());
  },

  v4Sync: function () {
    return global.randomId();
  }
};
