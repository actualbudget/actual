const mockServer = require('../tests/mockSyncServer');

export default {
  post: mockServer.handleRequest,
  postBinary: mockServer.handleRequestBinary,
  get(url) {
    throw new Error('get unimplemented');
  }
};
