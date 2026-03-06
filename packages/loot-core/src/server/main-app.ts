import * as connection from '../platform/server/connection';
import type { Handlers } from '../types/handlers';

import { createApp } from './app';
import { runHandler } from './mutators';

// Main app
export const app = createApp<Handlers>();

app.events.on('sync', event => {
  connection.send('sync-event', event);
});

/**
 * Run a handler by name (server-side). Same API shape as the client connection's send.
 * Used by server code that needs to invoke handlers directly, e.g. importers.
 */
export async function send<K extends keyof Handlers>(
  name: K,
  args?: Parameters<Handlers[K]>[0],
): Promise<Awaited<ReturnType<Handlers[K]>>> {
  return runHandler(app.handlers[name], args, { name }) as Promise<
    Awaited<ReturnType<Handlers[K]>>
  >;
}
