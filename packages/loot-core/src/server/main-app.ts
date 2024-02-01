import * as connection from '../platform/server/connection';
import { Handlers } from '../types/handlers';

import { createApp } from './app';

// Main app
export const app = createApp<Handlers>();

app.events.on('sync', info => {
  connection.send('sync-event', info);
});
