export {
  handleRequest as post,
  handleRequestBinary as postBinary,
} from '../tests/mockSyncServer';

export const get = function (url) {
  throw new Error('get unimplemented');
};
