export {
  handleRequest as post,
  handleRequestBinary as postBinary,
} from '../tests/mockSyncServer';

export let get = function (url) {
  throw new Error('get unimplemented');
};
