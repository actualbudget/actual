export default {
  v4: function v4() {
    throw new Error('v4 not implemented');
  },

  v4Sync: () => {
    // TODO: Properly hook in a real v4Sync implementation
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return (
      s4() +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      s4() +
      s4()
    );
  }
};
