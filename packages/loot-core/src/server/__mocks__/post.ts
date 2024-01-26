// @ts-strict-ignore
export {
  handleRequest as post,
  handleRequestBinary as postBinary,
} from '../tests/mockSyncServer';

export const get = function () {
  throw new Error('get unimplemented');
};
