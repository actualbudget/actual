export default {
  test: {
    globals: true,
    onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
      // print only console.error
      return type === 'stderr';
    },
  },
};
