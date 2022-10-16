"use strict";

exports.__esModule = true;
exports.default = void 0;

var _helperDefinePolyfillProvider = _interopRequireDefault(require("@babel/helper-define-polyfill-provider"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const runtimeCompat = "#__secret_key__@babel/runtime__compatibility";

var _default = (0, _helperDefinePolyfillProvider.default)(({
  debug,
  targets,
  babel
}, options) => {
  if (!shallowEqual(targets, babel.targets())) {
    throw new Error("This plugin does not use the targets option. Only preset-env's targets" + " or top-level targets need to be configured for this plugin to work." + " See https://github.com/babel/babel-polyfills/issues/36 for more" + " details.");
  }

  const {
    [runtimeCompat]: {
      useBabelRuntime
    } = {
      useBabelRuntime: ""
    }
  } = options;
  const pureName = useBabelRuntime ? `${useBabelRuntime}/regenerator` : "regenerator-runtime";
  return {
    name: "regenerator",
    polyfills: ["regenerator-runtime"],

    usageGlobal(meta, utils) {
      if (isRegenerator(meta)) {
        debug("regenerator-runtime");
        utils.injectGlobalImport("regenerator-runtime/runtime.js");
      }
    },

    usagePure(meta, utils, path) {
      if (isRegenerator(meta)) {
        path.replaceWith(utils.injectDefaultImport(pureName, "regenerator-runtime"));
      }
    }

  };
});

exports.default = _default;

const isRegenerator = meta => meta.kind === "global" && meta.name === "regeneratorRuntime";

function shallowEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}