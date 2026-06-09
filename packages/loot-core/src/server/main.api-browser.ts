// Browser worker-client variant of server/main's `lib`, selected via the
// `api-browser` export condition (see package.json "./server/main").
//
// The real loot-core backend runs inside a Web Worker (see
// ./api-browser-worker.ts). On the main thread the api facade only consumes
// `lib.send`, which here routes over loot-core's existing browser client
// connection (postMessage to the worker) instead of invoking handlers
// in-process the way the Node `lib` does.

import * as connection from '#platform/client/connection';

export const lib = {
  send: connection.send,
};
