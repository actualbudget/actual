// Browser variant of server/main's `lib`, selected via the `api-browser` export
// condition. The backend runs in a Worker, so `lib.send` (the only thing the
// api facade uses) routes over loot-core's client connection instead of calling
// handlers in-process.

import * as connection from '#platform/client/connection';

export const lib = {
  send: connection.send,
};
