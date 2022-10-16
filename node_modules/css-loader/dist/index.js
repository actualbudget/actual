"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = loader;

var _postcss = _interopRequireDefault(require("postcss"));

var _package = _interopRequireDefault(require("postcss/package.json"));

var _semver = require("semver");

var _CssSyntaxError = _interopRequireDefault(require("./CssSyntaxError"));

var _Warning = _interopRequireDefault(require("./Warning"));

var _options = _interopRequireDefault(require("./options.json"));

var _plugins = require("./plugins");

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
async function loader(content, map, meta) {
  const rawOptions = this.getOptions(_options.default);
  const plugins = [];
  const callback = this.async();
  let options;

  try {
    options = (0, _utils.normalizeOptions)(rawOptions, this);
  } catch (error) {
    callback(error);
    return;
  }

  const replacements = [];
  const exports = [];

  if ((0, _utils.shouldUseModulesPlugins)(options)) {
    plugins.push(...(0, _utils.getModulesPlugins)(options, this));
  }

  const importPluginImports = [];
  const importPluginApi = [];
  let isSupportAbsoluteURL = false; // TODO enable by default in the next major release

  if (this._compilation && this._compilation.options && this._compilation.options.experiments && this._compilation.options.experiments.buildHttp) {
    isSupportAbsoluteURL = true;
  }

  const isSupportDataURL = options.esModule && Boolean("fsStartTime" in this._compiler);

  if ((0, _utils.shouldUseImportPlugin)(options)) {
    plugins.push((0, _plugins.importParser)({
      isSupportAbsoluteURL: false,
      isSupportDataURL: false,
      isCSSStyleSheet: options.exportType === "css-style-sheet",
      loaderContext: this,
      imports: importPluginImports,
      api: importPluginApi,
      filter: options.import.filter,
      urlHandler: url => (0, _utils.stringifyRequest)(this, (0, _utils.combineRequests)((0, _utils.getPreRequester)(this)(options.importLoaders), url))
    }));
  }

  const urlPluginImports = [];

  if ((0, _utils.shouldUseURLPlugin)(options)) {
    const needToResolveURL = !options.esModule;
    plugins.push((0, _plugins.urlParser)({
      isSupportAbsoluteURL,
      isSupportDataURL,
      imports: urlPluginImports,
      replacements,
      context: this.context,
      rootContext: this.rootContext,
      filter: (0, _utils.getFilter)(options.url.filter, this.resourcePath),
      resolver: needToResolveURL ? this.getResolve({
        mainFiles: [],
        extensions: []
      }) : // eslint-disable-next-line no-undefined
      undefined,
      urlHandler: url => (0, _utils.stringifyRequest)(this, url) // Support data urls as input in new URL added in webpack@5.38.0

    }));
  }

  const icssPluginImports = [];
  const icssPluginApi = [];
  const needToUseIcssPlugin = (0, _utils.shouldUseIcssPlugin)(options);

  if (needToUseIcssPlugin) {
    plugins.push((0, _plugins.icssParser)({
      loaderContext: this,
      imports: icssPluginImports,
      api: icssPluginApi,
      replacements,
      exports,
      urlHandler: url => (0, _utils.stringifyRequest)(this, (0, _utils.combineRequests)((0, _utils.getPreRequester)(this)(options.importLoaders), url))
    }));
  } // Reuse CSS AST (PostCSS AST e.g 'postcss-loader') to avoid reparsing


  if (meta) {
    const {
      ast
    } = meta;

    if (ast && ast.type === "postcss" && (0, _semver.satisfies)(ast.version, `^${_package.default.version}`)) {
      // eslint-disable-next-line no-param-reassign
      content = ast.root;
    }
  }

  const {
    resourcePath
  } = this;
  let result;

  try {
    result = await (0, _postcss.default)(plugins).process(content, {
      hideNothingWarning: true,
      from: resourcePath,
      to: resourcePath,
      map: options.sourceMap ? {
        prev: map ? (0, _utils.normalizeSourceMap)(map, resourcePath) : null,
        inline: false,
        annotation: false
      } : false
    });
  } catch (error) {
    if (error.file) {
      this.addDependency(error.file);
    }

    callback(error.name === "CssSyntaxError" ? new _CssSyntaxError.default(error) : error);
    return;
  }

  for (const warning of result.warnings()) {
    this.emitWarning(new _Warning.default(warning));
  }

  const imports = [].concat(icssPluginImports.sort(_utils.sort)).concat(importPluginImports.sort(_utils.sort)).concat(urlPluginImports.sort(_utils.sort));
  const api = [].concat(importPluginApi.sort(_utils.sort)).concat(icssPluginApi.sort(_utils.sort));

  if (options.modules.exportOnlyLocals !== true) {
    imports.unshift({
      type: "api_import",
      importName: "___CSS_LOADER_API_IMPORT___",
      url: (0, _utils.stringifyRequest)(this, require.resolve("./runtime/api"))
    });

    if (options.sourceMap) {
      imports.unshift({
        importName: "___CSS_LOADER_API_SOURCEMAP_IMPORT___",
        url: (0, _utils.stringifyRequest)(this, require.resolve("./runtime/sourceMaps"))
      });
    } else {
      imports.unshift({
        importName: "___CSS_LOADER_API_NO_SOURCEMAP_IMPORT___",
        url: (0, _utils.stringifyRequest)(this, require.resolve("./runtime/noSourceMaps"))
      });
    }
  }

  const importCode = (0, _utils.getImportCode)(imports, options);
  let moduleCode;

  try {
    moduleCode = (0, _utils.getModuleCode)(result, api, replacements, options, this);
  } catch (error) {
    callback(error);
    return;
  }

  const exportCode = (0, _utils.getExportCode)(exports, replacements, needToUseIcssPlugin, options);
  callback(null, `${importCode}${moduleCode}${exportCode}`);
}