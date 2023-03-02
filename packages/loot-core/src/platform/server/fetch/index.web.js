/* eslint-disable no-restricted-globals */
// (the `self` global is conventional in web workers)

module.exports = {
  fetch: self.fetch,
  fetchBinary: () => {
    throw new Error('fetchBinary not implemented');
  },
};
