# PostCSS Sort Media Queries

[PostCSS]:          https://github.com/postcss/postcss
[ci-img]:           https://travis-ci.org/solversgroup/postcss-sort-media-queries.svg
[ci]:               https://travis-ci.org/solversgroup/postcss-sort-media-queries
[MIT]:              https://github.com/solversgroup/postcss-sort-media-queries/blob/master/LICENSE
[official docs]:    https://github.com/postcss/postcss#usage
[Releases history]: https://github.com/solversgroup/postcss-sort-media-queries/blob/master/CHANGELOG.md

[![npm](https://img.shields.io/npm/v/postcss-sort-media-queries.svg)](https://www.npmjs.com/package/postcss-sort-media-queries) [![Build Status][ci-img]][ci]
[![npm](https://img.shields.io/npm/dt/postcss-sort-media-queries.svg)](https://www.npmjs.com/package/postcss-sort-media-queries)

[PostCSS] plugin for combine and sort CSS media queries with **mobile first** or **desktop first** methods.

> **Combine** same media queries into one - is a unexpected side effect for this plugin 🧬

## Online demo

And here is the [online demo](https://postcss-sort-media-queries.github.io)

## Examples

### Mobile first sorting

```css
/* before */
@media screen and (max-width: 640px) {
  .head { color: #cfcfcf }
}
@media screen and (max-width: 768px) {
  .footer { color: #cfcfcf }
}
@media screen and (max-width: 640px) {
  .main { color: #cfcfcf }
}
@media screen and (min-width: 1280px) {
  .mobile-first { color: #cfcfcf }
}
@media screen and (min-width: 640px) {
  .mobile-first { color: #cfcfcf }
}
@media screen and (max-width: 640px) {
  .footer { color: #cfcfcf }
}

/* after */
@media screen and (min-width: 640px) {
  .mobile-first { color: #cfcfcf }
}
@media screen and (min-width: 1280px) {
  .mobile-first { color: #cfcfcf }
}
@media screen and (max-width: 768px) {
  .footer { color: #cfcfcf }
}
@media screen and (max-width: 640px) {
  .head { color: #cfcfcf }
  .main { color: #cfcfcf }
  .footer { color: #cfcfcf }
}
```

### Desktop first sorting

```css
/* before */
@media screen and (max-width: 640px) {
  .header { color: #cdcdcd }
}
@media screen and (min-width: 760px) {
  .desktop-first { color: #cdcdcd }
}
@media screen and (max-width: 640px) {
  .main { color: #cdcdcd }
}
@media screen and (min-width: 1280px) {
  .desktop-first { color: #cdcdcd }
}
@media screen and (max-width: 760px) {
  .footer { color: #cdcdcd }
}
@media screen and (max-width: 640px) {
  .footer { color: #cdcdcd }
}

/* after */
@media screen and (max-width: 760px) {
  .footer { color: #cdcdcd }
}
@media screen and (max-width: 640px) {
  .header { color: #cdcdcd }
  .main { color: #cdcdcd }
  .footer { color: #cdcdcd }
}
@media screen and (min-width: 760px) {
  .desktop-first { color: #cdcdcd }
}
@media screen and (min-width: 1280px) {
  .desktop-first { color: #cdcdcd }
}
```

## Getting Started

First thing's, install the module:

```
npm install postcss postcss-sort-media-queries --save-dev
```

## 🍳 Usage

Check you project for existed PostCSS config: `postcss.config.js`
in the project root, `"postcss"` section in `package.json`
or `postcss` in bundle config.

If you already use PostCSS, add the plugin to plugins list:

```diff
module.exports = {
  plugins: [
+   require('postcss-sort-media-queries')({
+     // sort: 'mobile-first' default value
+     sort: function(a, b) {
+        // custom sorting function
+     }
+   }),
    require('autoprefixer')
  ]
}
```

If you do not use PostCSS, add it according to [official docs]
and set this plugin in settings.

## 🍰 Options

> Sorting works based on [dutchenkoOleg/sort-css-media-queries](https://github.com/dutchenkoOleg/sort-css-media-queries) function.

### sort

This option support **string** or **function** values.

- `{string}` `'mobile-first'` - (default) mobile first sorting
- `{string}` `'desktop-first'` - desktop first sorting
- `{function}` your own sorting function

#### `'mobile-first'`

```js
postcss([
  sortMediaQueries({
    sort: 'mobile-first' // default
  })
]).process(css);
```

#### `'desktop-first'`

```js
postcss([
  sortMediaQueries({
    sort: 'desktop-first'
  })
]).process(css);
```

#### Custom sort function
```js
postcss([
  sortMediaQueries({
    function(a, b) {
      return a.localeCompare(b);
    }
  })
]).process(css);
```

In this example, all your media queries will sort by A-Z order.

This sorting function is directly passed to Array#sort() method of an array of all your media queries.

### Sort configuration

By this configuration you can control sorting behaviour.

```js
postcss([
  sortMediaQueries({
    configuration: {
      unitlessMqAlwaysFirst: true, // or false
    }
  })
]).process(css);
```

Or alternatively create a `sort-css-mq.config.json` file in the root of your project. Or add property `sortCssMQ: {}` in your `package.json`.

---

## Changelog

See [Releases history]

## License

[MIT]

## Other PostCSS plugins

- [`postcss-momentum-scrolling`](https://github.com/solversgroup/postcss-momentum-scrolling) - plugin for adding **momentum** style scrolling behavior (`-webkit-overflow-scrolling:touch`) for elements with overflow (scroll, auto) on iOS

## Thanks 💪

- Andrey Sitnik [@ai](https://github.com/ai)
- Jakub Caban [@Lustmored](https://github.com/Lustmored)
- Dmytro Symonov [@Kassaila](https://github.com/Kassaila)
- Kai Falkowski [@SassNinja](https://github.com/SassNinja)
- Олег Дутченко [@dutchenkoOleg](https://github.com/dutchenkoOleg)
