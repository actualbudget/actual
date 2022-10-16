[![Build Status](https://img.shields.io/travis/slorber/static-site-generator-webpack-plugin/master.svg?style=flat-square)](http://app.travis-ci.com/slorber/static-site-generator-webpack-plugin) [![npm](https://img.shields.io/npm/v/@slorber/static-site-generator-webpack-plugin.svg?style=flat-square)](https://npmjs.org/package/@slorber/static-site-generator-webpack-plugin)

# FORK FOR DOCUSAURUS

This is a fork used for Docusaurus

This fixes [trailing slash issues](https://github.com/facebook/docusaurus/issues/3372) by allowing to output `/filename.html` instead of `/filename/index.html` by exposing a `preferFoldersOutput: false` option.

It is based on a previous fork by Endiliey: https://github.com/endiliey/static-site-generator-webpack-plugin 

I don't know the reasons of the initial fork.

We also added a `concurrency: 32` option to avoid overloading the system with too much IO (using [p-map](https://github.com/sindresorhus/p-map))

# static site generator webpack plugin

Minimal, unopinionated static site generator powered by webpack.

Bring the world of server rendering to your static build process. Either provide an array of paths to be rendered and a matching set of `index.html` files will be rendered in your output directory by executing your own custom, webpack-compiled render function.

This plugin works particularly well with universal libraries like [React](https://github.com/facebook/react) and [React Router](https://github.com/rackt/react-router) since it allows you to pre-render your routes at build time, rather than requiring a Node server in production.

## Install

```bash
$ npm install --save-dev @slorber/static-site-generator-webpack-plugin
```

## Usage

Ensure you have webpack installed, e.g. `npm install -g webpack`

### webpack.config.js

```js
const StaticSiteGeneratorPlugin = require('@slorber/static-site-generator-webpack-plugin');

module.exports = {

  entry: './index.js',

  output: {
    filename: 'index.js',
    path: 'dist',
    /* IMPORTANT!
     * You must compile to UMD or CommonJS
     * so it can be required in a Node context: */
    libraryTarget: 'umd'
  },

  plugins: [
    new StaticSiteGeneratorPlugin({
      paths: [
        '/hello/',
        '/world/'
      ],
      locals: {
        // Properties here are merged into `locals`
        // passed to the exported render function
        greet: 'Hello'
      }
    })
  ]

};
```

### index.js

Sync rendering:

```js
module.exports = function render(locals) {
  return '<html>' + locals.greet + ' from ' + locals.path + '</html>';
};
```

Async rendering via callbacks:

```js
module.exports = function render(locals, callback) {
  callback(null, '<html>' + locals.greet + ' from ' + locals.path + '</html>');
};
```

Async rendering via promises:

```js
module.exports = function render(locals) {
  return Promise.resolve('<html>' + locals.greet + ' from ' + locals.path + '</html>');
};
```

## Multi rendering

If you need to generate multiple files per render, or you need to alter the path, you can return an object instead of a string, where each key is the path, and the value is the file contents:

```js
module.exports = function render() {
  return {
    '/': '<html>Home</html>',
    '/hello': '<html>Hello</html>',
    '/world': '<html>World</html>'
  };
};
```

Note that this will still be executed for each entry in your `paths` array in your plugin config.

## Default locals

```js
// The path currently being rendered:
locals.path;

// An object containing all assets:
locals.assets;

// Advanced: Webpack's stats object:
locals.webpackStats;
```

Any additional locals provided in your config are also available.


## Custom file names

By providing paths that end in `.html`, you can generate custom file names other than the default `index.html`. Please note that this may break compatibility with your router, if you're using one.

```js
module.exports = {

  ...

  plugins: [
    new StaticSiteGeneratorPlugin({
      paths: [
        '/index.html',
        '/news.html',
        '/about.html'
      ]
    })
  ]
};
```

## Globals

If required, you can provide an object that will exist in the global scope when executing your render function. This is particularly useful if certain libraries or tooling you're using assumes a browser environment.

For example, when using Webpack's `require.ensure`, which assumes that `window` exists:

```js
module.exports = {
  ...,
  plugins: [
    new StaticSiteGeneratorPlugin({
      globals: {
        window: {}
      }
    })
  ]
}
```

## Asset support

template.ejs
```ejs
<% css.forEach(function(file){ %>
<link href="<%- file %>" rel="stylesheet">
<% }); %>

<% js.forEach(function(file){ %>
<script src="<%- file %>" async></script>
<% }); %>
```

index.js
```js
if (typeof global.document !== 'undefined') {
  const rootEl = global.document.getElementById('outlay');
  React.render(
    <App />,
    rootEl,
  );
}

export default (data) => {
  const assets = Object.keys(data.webpackStats.compilation.assets);
  const css = assets.filter(value => value.match(/\.css$/));
  const js = assets.filter(value => value.match(/\.js$/));
  return template({ css, js, ...data});
}
```

## Specifying entry

This plugin defaults to the first chunk found. While this should work in most cases, you can specify the entry name if needed:

```js
module.exports = {
  ...,
  plugins: [
    new StaticSiteGeneratorPlugin({
      entry: 'main'
    })
  ]
}
```

## Compression support

Generated files can be compressed with [compression-webpack-plugin](https://github.com/webpack/compression-webpack-plugin), but first ensure that this plugin appears before compression-webpack-plugin in your plugins array:

```js
const StaticSiteGeneratorPlugin = require('@slorber/static-site-generator-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  ...

  plugins: [
    new StaticSiteGeneratorPlugin(...),
    new CompressionPlugin(...)
  ]
};
```

## Related projects

- [react-router-to-array](https://github.com/alansouzati/react-router-to-array) - useful for avoiding hardcoded lists of routes to render
- [gatsby](https://github.com/gatsbyjs/gatsby) - opinionated static site generator built on top of this plugin

## License

[MIT License](http://markdalgleish.mit-license.org)
