import * as connection from '../platform/server/connection';
import { type Handlers } from '../types/handlers';

import { createApp } from './app';

// Main app
export const app = createApp<Handlers>();

app.events.on('sync', event => {
  connection.send('sync-event', event);
});
