// @ts-strict-ignore
export {
  handleRequest as post,
  handleRequestBinary as postBinary,
} from '#server/tests/mockSyncServer';

export const get = function () {
  throw new Error('get unimplemented');
};
