export default {
  fetch: self.fetch,
  fetchBinary: () => {
    throw new Error('fetchBinary not implemented');
  }
};
