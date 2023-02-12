const mockServer = require('../tests/mockSyncServer');

module.exports = {
  post: mockServer.handleRequest,
  postBinary: mockServer.handleRequestBinary,
  get(url) {
    throw new Error('get unimplemented');
  },
};
