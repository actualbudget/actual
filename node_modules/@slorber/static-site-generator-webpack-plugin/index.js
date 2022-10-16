const RawSource = require('webpack-sources/lib/RawSource');
const evaluate = require('eval');
const path = require('path');
const pMap = require("p-map");

const pluginName = 'static-site-generator-webpack-plugin'

// Not easy to define a reasonable option default
// Will still be better than Infinity
// See also https://github.com/sindresorhus/p-map/issues/24
const DefaultConcurrency = 32;

class StaticSiteGeneratorWebpackPlugin {
  constructor(options) {
    options = options || {};
    this.concurrency = options.concurrency || DefaultConcurrency;
    this.entry = options.entry;
    this.paths = Array.isArray(options.paths) ? options.paths : [options.paths || '/'];
    this.locals = options.locals;
    this.globals = options.globals;
    this.preferFoldersOutput = options.preferFoldersOutput;
  }

  findAsset(entry, compilation, webpackStatsJson) {
    if (!entry) {
      const chunkNames = Object.keys(webpackStatsJson.assetsByChunkName);
      entry = chunkNames[0];
    }

    const asset = compilation.assets[entry];
    if (asset) return asset;

    let chunkValue = webpackStatsJson.assetsByChunkName[entry];
    if (!chunkValue) return null;
    // Webpack outputs an array for each chunk when using sourcemaps
    if (chunkValue instanceof Array) {
      // Is the main bundle always the first element?
      chunkValue = chunkValue.find((filename) => /\.js$/.test(filename));
    }
    return compilation.assets[chunkValue];
  }

  // Shamelessly stolen from html-webpack-plugin - Thanks @ampedandwired :)
  getAssetsFromCompilation(compilation, webpackStatsJson) {
    const assets = {};
    for (const chunk in webpackStatsJson.assetsByChunkName) {
      let chunkValue = webpackStatsJson.assetsByChunkName[chunk];

      // Webpack outputs an array for each chunk when using sourcemaps
      if (chunkValue instanceof Array) {
        // Is the main bundle always the first JS element?
        chunkValue = chunkValue.find((filename) => /\.js$/.test(filename));
      }

      if (compilation.options.output.publicPath) {
        chunkValue = compilation.options.output.publicPath + chunkValue;
      }
      assets[chunk] = chunkValue;
    }

    return assets;
  }

  async injectApp(compilation) {
    const webpackStats = compilation.getStats();
    const webpackStatsJson = webpackStats.toJson({ all: false, assets: true }, true);

    const asset = this.findAsset(this.entry, compilation, webpackStatsJson)

    if (asset == null) {
      throw new Error(`Source file not found: "${this.entry}"`);
    }

    const assets = this.getAssetsFromCompilation(compilation, webpackStatsJson);

    const source = asset.source();
    let render = evaluate(
        source,
        /* filename: */ this.entry,
        /* scope: */ this.globals,
        /* includeGlobals: */ true
    );

    if (render.hasOwnProperty('default')) {
      render = render['default'];
    }

    if (typeof render !== 'function') {
      throw new Error(`Export from "${this.entry}" must be a function that returns an HTML string. Is output.libraryTarget in the configuration set to "umd"?`);
    }
    
    return pMap(
      this.paths,
      (outputPath) => this.renderPath(outputPath, render, assets, webpackStats, compilation),
      {concurrency: this.concurrency}
    );
  }

  pathToAssetName(outputPath) {
    const outputFileName = outputPath.replace(/^(\/|\\)/, ''); // Remove leading slashes for webpack-dev-server

    // Paths ending with .html are left untouched
    if (/\.(html?)$/i.test(outputFileName)) {
      return outputFileName;
    }

    // Legacy retro-compatible behavior
    if (typeof this.preferFoldersOutput === 'undefined') {
      return path.join(outputFileName, 'index.html');
    }

    // New behavior: we can say if we prefer file/folder output
    // Useful resource: https://github.com/slorber/trailing-slash-guide
    if (outputPath === '' || outputPath.endsWith('/') || this.preferFoldersOutput) {
      return path.join(outputFileName, 'index.html');
    } else {
      return `${outputFileName}.html`;
    }
  }

  renderPath(outputPath, render, assets, webpackStats, compilation) {
    const locals = {
      path: outputPath,
      assets,
      webpackStats,
      ...this.locals,
    };

    const renderPromise = render.length < 2
      ? Promise.resolve(render(locals))
      : new Promise((resolve, reject) => {
        render(locals, (err, succ) => {
          if (err) {
            return reject(err)
          }
          return resolve(succ)
        })
      });


    return renderPromise
      .then((output) => {
        const outputByPath = typeof output === 'object' ? output : { [outputPath]: output } ;

        const assetGenerationPromises = Object.keys(outputByPath).map((key) => {
          const rawSource = outputByPath[key];
          const assetName = this.pathToAssetName(key);
          // console.log("pathToAssetName: " + key + " => " + assetName);

          if (compilation.assets[assetName]) {
            return;
          }

          compilation.assets[assetName] = new RawSource(rawSource);
        });

        return Promise.all(assetGenerationPromises);
      })
      .catch((err) => {
        compilation.errors.push(err.stack);
      });
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.optimizeAssets.tapAsync(
        pluginName,
        (_, done) => {
          this.injectApp(compilation)
            .then(() => {
              done()
            }, (err) => {
              compilation.errors.push(err.stack);
              done();
            })
        }
      );
    });
  }
}

module.exports = StaticSiteGeneratorWebpackPlugin;
module.exports.default = StaticSiteGeneratorWebpackPlugin;
