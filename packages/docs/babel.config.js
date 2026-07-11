module.exports = {
  presets: [require.resolve('@docusaurus/core/lib/babel/preset')],
  overrides: [
    {
      // Only compile the site's own React components, not Docusaurus theme
      // code from node_modules.
      test: /[\\/]docs[\\/]src[\\/].*\.[jt]sx$/,
      plugins: [require.resolve('babel-plugin-react-compiler')],
    },
  ],
};
