import * as connection from '../platform/server/connection';

import { createApp } from './app';

// Main app
let app = createApp();

app.events.on('sync', info => {
  connection.send('sync-event', info);
});

export default app;
