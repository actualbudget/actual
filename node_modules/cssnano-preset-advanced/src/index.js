'use strict';
const defaultPreset = require('cssnano-preset-default');
const postcssDiscardUnused = require('postcss-discard-unused');
const postcssMergeIdents = require('postcss-merge-idents');
const postcssReduceIdents = require('postcss-reduce-idents');
const postcssZindex = require('postcss-zindex');
const autoprefixer = require('autoprefixer');

/** @typedef {
{autoprefixer?: autoprefixer.Options,
 discardUnused?: false | import('postcss-discard-unused').Options & { exclude?: true},
 mergeIdents?: false | { exclude?: true},
 reduceIdents?:false | import('postcss-reduce-idents').Options & { exclude?: true},
 zindex?: false | import('postcss-zindex').Options & { exclude?: true},
}} AdvancedOptions */
/** @typedef {import('cssnano-preset-default').Options & AdvancedOptions} Options */

/** @type {Options} */
const defaultOpts = {
  autoprefixer: {
    add: false,
  },
};

function advancedPreset(opts = {}) {
  const options = Object.assign({}, defaultOpts, opts);

  /** @type {[import('postcss').PluginCreator<any>, boolean | Record<string, any> | undefined][]} */
  const plugins = [
    ...defaultPreset(options).plugins,
    [autoprefixer, options.autoprefixer],
    [postcssDiscardUnused, options.discardUnused],
    [postcssMergeIdents, options.mergeIdents],
    [postcssReduceIdents, options.reduceIdents],
    [postcssZindex, options.zindex],
  ];

  return { plugins };
}

module.exports = advancedPreset;
