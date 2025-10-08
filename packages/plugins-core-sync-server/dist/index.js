/**
 * @actual-app/plugins-core-sync-server
 *
 * Core plugin utilities for Actual sync-server plugin authors
 *
 * This package provides the middleware and utilities needed to create
 * plugins for the Actual sync-server. Plugin authors can use this to
 * build Express-based plugins that communicate with the sync-server via IPC.
 */
const __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        let desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
const __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (const p in m) {
      if (
        p !== 'default' &&
        !Object.prototype.hasOwnProperty.call(exports, p)
      ) {
        __createBinding(exports, m, p);
      }
    }
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.getSecrets =
  exports.saveSecrets =
  exports.getSecret =
  exports.saveSecret =
  exports.attachPluginMiddleware =
    void 0;
const middleware_1 = require('./middleware');
Object.defineProperty(exports, 'attachPluginMiddleware', {
  enumerable: true,
  get: function () {
    return middleware_1.attachPluginMiddleware;
  },
});
const secrets_1 = require('./secrets');
Object.defineProperty(exports, 'saveSecret', {
  enumerable: true,
  get: function () {
    return secrets_1.saveSecret;
  },
});
Object.defineProperty(exports, 'getSecret', {
  enumerable: true,
  get: function () {
    return secrets_1.getSecret;
  },
});
Object.defineProperty(exports, 'saveSecrets', {
  enumerable: true,
  get: function () {
    return secrets_1.saveSecrets;
  },
});
Object.defineProperty(exports, 'getSecrets', {
  enumerable: true,
  get: function () {
    return secrets_1.getSecrets;
  },
});
__exportStar(require('./types'), exports);
