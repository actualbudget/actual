import { createApp } from './app';
import * as connection from './connection';
import { Handlers } from './types/handlers';

// Main app
export const app = createApp<Handlers>();

app.events.on('sync', info => {
  connection.send('sync-event', info);
});
